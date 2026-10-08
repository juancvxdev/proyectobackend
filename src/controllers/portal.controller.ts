import type { NextFunction, Request, Response } from 'express'
import { HttpError } from '../http/errors.js'
import { hashPayload, IdempotencyRepository } from '../repositories/idempotency.repository.js'
import { PortalRepository } from '../repositories/portal.repository.js'
import { PortalService } from '../services/portal.service.js'

function serviceFor(req: Request) {
  if (!req.auth) throw new HttpError(401, 'Token requerido.', 'UNAUTHORIZED')
  return new PortalService(new PortalRepository(req.auth.accessToken))
}

function param(req: Request, name: string) {
  const value = req.params[name]
  if (Array.isArray(value)) return value[0]
  if (!value) throw new HttpError(400, `Parametro requerido: ${name}`, 'BAD_REQUEST')
  return value
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(serviceFor(req).me(req.auth!.user))
  } catch (error) {
    next(error)
  }
}

export async function catalogs(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await serviceFor(req).catalogs())
  } catch (error) {
    next(error)
  }
}

export async function listCases(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await serviceFor(req).cases(res.locals.validatedQuery ?? req.query))
  } catch (error) {
    next(error)
  }
}

export async function summaryMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await serviceFor(req).cases({ page: 1, limit: 100 })
    const cases = result.items ?? []
    res.json({
      total: result.total ?? cases.length,
      vencidos: cases.filter((item: any) => item.deadlineStatus === 'overdue').length,
      abiertos: cases.filter((item: any) => !['closed', 'cancelled'].includes(item.status)).length,
      cerrados: cases.filter((item: any) => item.status === 'closed').length,
    })
  } catch (error) {
    next(error)
  }
}

export async function getCase(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await serviceFor(req).caseById(param(req, 'id')))
  } catch (error) {
    next(error)
  }
}

export async function createCase(req: Request, res: Response, next: NextFunction) {
  try {
    const idempotencyKey = req.header('Idempotency-Key')?.trim()
    const requestHash = hashPayload(req.body)

    if (idempotencyKey) {
      const idempotency = new IdempotencyRepository()
      const saved = await idempotency.find(idempotencyKey, req.auth!.user.id)
      if (saved) {
        idempotency.assertSamePayload(saved.request_hash, requestHash)
        return res.status(saved.status_code).json(saved.response_body)
      }

      const response = await serviceFor(req).createCase(req.body)
      await idempotency.save(idempotencyKey, req.auth!.user.id, requestHash, 201, response)
      return res.status(201).json(response)
    }

    res.status(201).json(await serviceFor(req).createCase(req.body))
  } catch (error) {
    next(error)
  }
}

export async function updateCase(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await serviceFor(req).updateCase(param(req, 'id'), req.body, req.auth!.user))
  } catch (error) {
    next(error)
  }
}

export async function deleteCase(req: Request, res: Response, next: NextFunction) {
  try {
    await serviceFor(req).softDeleteCase(param(req, 'id'), req.auth!.user)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

export async function listFollowUps(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await serviceFor(req).followUps(param(req, 'id')))
  } catch (error) {
    next(error)
  }
}

export async function createFollowUp(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await serviceFor(req).createFollowUp(param(req, 'id'), req.body, req.auth!.user))
  } catch (error) {
    next(error)
  }
}

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await serviceFor(req).users())
  } catch (error) {
    next(error)
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    await serviceFor(req).updateUser(param(req, 'id'), req.body)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

export async function createArea(req: Request, res: Response, next: NextFunction) {
  try {
    await serviceFor(req).createArea(req.body.name)
    res.status(201).send()
  } catch (error) {
    next(error)
  }
}

export async function updateArea(req: Request, res: Response, next: NextFunction) {
  try {
    await serviceFor(req).updateArea(param(req, 'id'), req.body)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    await serviceFor(req).createCategory(req.body.caseType, req.body.name)
    res.status(201).send()
  } catch (error) {
    next(error)
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    await serviceFor(req).updateCategory(param(req, 'id'), req.body)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

export async function createReason(req: Request, res: Response, next: NextFunction) {
  try {
    await serviceFor(req).createReason(req.body.categoryId, req.body.name)
    res.status(201).send()
  } catch (error) {
    next(error)
  }
}

export async function updateReason(req: Request, res: Response, next: NextFunction) {
  try {
    await serviceFor(req).updateReason(param(req, 'id'), req.body)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}
