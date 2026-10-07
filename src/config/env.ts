import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  AZURE_TENANT_ID: z.string().min(1),
  AZURE_CLIENT_ID: z.string().min(1),
  AUTO_MIGRATE: z.coerce.boolean().default(true),
  INTEGRATION_JWT_SECRET: z.string().min(24).default('dev-integration-secret-change-in-production'),
})

export const env = envSchema.parse(process.env)

export const corsOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
