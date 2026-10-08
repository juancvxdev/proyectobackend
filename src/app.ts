import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import swaggerUi from 'swagger-ui-express'
import { corsOrigins, env } from './config/env.js'
import { errorHandler, notFoundHandler } from './http/errors.js'
import { apiRateLimit } from './middlewares/rate-limit.js'
import { buildOpenApiDocument } from './openapi/document.js'
import { v1Router } from './routes/v1.routes.js'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  if (env.TRUST_PROXY_HOPS > 0) app.set('trust proxy', env.TRUST_PROXY_HOPS)
  app.use(helmet())
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || corsOrigins.includes(origin)) return callback(null, true)
        callback(new Error('Origen CORS no permitido.'))
      },
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '1mb' }))
  app.use('/v1', apiRateLimit, v1Router)
  app.get('/v1/openapi.json', (_req, res) => res.json(buildOpenApiDocument()))
  app.use('/v1/docs', swaggerUi.serve, swaggerUi.setup(buildOpenApiDocument()))
  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
