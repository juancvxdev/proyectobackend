import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  AZURE_TENANT_ID: z.string().min(1),
  AZURE_CLIENT_ID: z.string().min(1),
  AZURE_SWAGGER_CLIENT_ID: z.string().min(1).optional(),
  AZURE_API_SCOPE: z.string().min(1).optional(),
  AUTO_MIGRATE: z.coerce.boolean().default(true),
  INTEGRATION_JWT_SECRET: z.string().min(24).default('dev-integration-secret-change-in-production'),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
})

export const env = envSchema.parse(process.env)

export const corsOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export function isAllowedCorsOrigin(origin: string) {
  return corsOrigins.some((allowedOrigin) => {
    if (allowedOrigin === origin) return true
    if (!allowedOrigin.includes('*')) return false
    const pattern = allowedOrigin
      .split('*')
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
      .join('[^.]+')
    return new RegExp(`^${pattern}$`).test(origin)
  })
}

export const azureSwaggerClientId = env.AZURE_SWAGGER_CLIENT_ID ?? env.AZURE_CLIENT_ID
export const azureApiScope = env.AZURE_API_SCOPE ?? `api://${env.AZURE_CLIENT_ID}/access_as_user`
