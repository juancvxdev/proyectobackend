import type { NextFunction, Request, Response } from 'express'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { env } from '../config/env.js'
import type { AuthUser, UserRole } from '../domain/types.js'
import { HttpError } from '../http/errors.js'
import { query } from '../repositories/db.js'

const allowedSystemEmails = new Set(['juanjose.cordova@araneda.com.ec', 'paola.suquinagua@araneda.com.ec'])
const issuer = `https://login.microsoftonline.com/${env.AZURE_TENANT_ID}/v2.0`
const allowedIssuers = [issuer, `https://sts.windows.net/${env.AZURE_TENANT_ID}/`]
const jwks = createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${env.AZURE_TENANT_ID}/discovery/v2.0/keys`))

declare global {
  namespace Express {
    interface Request {
      auth?: {
        accessToken: string
        user: AuthUser
      }
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.header('authorization') ?? ''
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
    if (!token) throw new HttpError(401, 'Token requerido.', 'UNAUTHORIZED')

    const { payload } = await jwtVerify(token, jwks, {
      issuer: allowedIssuers,
      audience: env.AZURE_CLIENT_ID,
    })

    const email = String(payload.preferred_username ?? payload.email ?? payload.upn ?? '').toLowerCase()
    if (!email) throw new HttpError(401, 'El token de Microsoft no contiene correo.', 'UNAUTHORIZED')

    const { rows } = await query<{
      id: string
      role: UserRole
      full_name: string
      email: string
      active: boolean
      area_id: string | null
      customer_id: string | null
    }>(
      `select id, role, full_name, email, active, area_id, customer_id
       from users_profile
       where lower(email) = lower($1)
       limit 1`,
      [email],
    )

    const profile = rows[0]
    if (!profile) throw new HttpError(403, 'El usuario no tiene perfil autorizado.', 'FORBIDDEN')

    const normalizedEmail = profile.email.toLowerCase()
    if (!allowedSystemEmails.has(normalizedEmail) || profile.active === false) {
      throw new HttpError(403, 'Tu usuario no esta autorizado para ingresar al portal.', 'FORBIDDEN')
    }

    req.auth = {
      accessToken: token,
      user: {
        id: profile.id,
        role: profile.role,
        fullName: profile.full_name,
        email: normalizedEmail,
        active: profile.active,
        areaId: profile.area_id ?? undefined,
        customerId: profile.customer_id ?? undefined,
      },
    }
    next()
  } catch (error) {
    next(error)
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(new HttpError(401, 'Token requerido.', 'UNAUTHORIZED'))
    if (!roles.includes(req.auth.user.role)) {
      return next(new HttpError(403, 'No tienes permisos para esta accion.', 'FORBIDDEN'))
    }
    next()
  }
}
