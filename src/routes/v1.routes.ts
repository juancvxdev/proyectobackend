import { Router } from 'express'
import * as controller from '../controllers/portal.controller.js'
import {
  catalogNameSchema,
  createCaseSchema,
  createCategorySchema,
  createFollowUpSchema,
  createReasonSchema,
  paginationQuerySchema,
  updateCaseSchema,
  updateCatalogSchema,
  updateUserSchema,
} from '../dtos/portal.schemas.js'
import { requireAuth, requireRole } from '../middlewares/auth.js'
import { authRateLimit } from '../middlewares/rate-limit.js'
import { validateBody, validateQuery } from '../middlewares/validate.js'

export const v1Router = Router()

v1Router.get('/health', (_req, res) => res.json({ ok: true, service: 'araneda-api', version: 'v1' }))

v1Router.get('/auth/me', authRateLimit, requireAuth, controller.me)
v1Router.post('/auth/refresh', authRateLimit, requireAuth, controller.me)

v1Router.use(requireAuth)

v1Router.get('/catalogos', controller.catalogs)

v1Router.get('/casos', validateQuery(paginationQuerySchema), controller.listCases)
v1Router.post('/casos', validateBody(createCaseSchema), controller.createCase)
v1Router.get('/casos/:id', controller.getCase)
v1Router.patch('/casos/:id', requireRole('admin', 'manager', 'support'), validateBody(updateCaseSchema), controller.updateCase)
v1Router.delete('/casos/:id', requireRole('admin', 'manager', 'support'), controller.deleteCase)
v1Router.get('/casos/:id/seguimientos', controller.listFollowUps)
v1Router.post('/casos/:id/seguimientos', validateBody(createFollowUpSchema), controller.createFollowUp)

v1Router.get('/usuarios', requireRole('admin'), controller.listUsers)
v1Router.patch('/usuarios/:id', requireRole('admin'), validateBody(updateUserSchema), controller.updateUser)

v1Router.post('/catalogos/areas', requireRole('admin'), validateBody(catalogNameSchema), controller.createArea)
v1Router.patch('/catalogos/areas/:id', requireRole('admin'), validateBody(updateCatalogSchema), controller.updateArea)
v1Router.post('/catalogos/categorias', requireRole('admin'), validateBody(createCategorySchema), controller.createCategory)
v1Router.patch('/catalogos/categorias/:id', requireRole('admin'), validateBody(updateCatalogSchema), controller.updateCategory)
v1Router.post('/catalogos/motivos', requireRole('admin'), validateBody(createReasonSchema), controller.createReason)
v1Router.patch('/catalogos/motivos/:id', requireRole('admin'), validateBody(updateCatalogSchema), controller.updateReason)

v1Router.get('/metricas/resumen', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const result = await controllerPromise(req, controller.listCases)
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
})

async function controllerPromise(req: any, handler: any) {
  let payload: any
  await handler(
    req,
    {
      json(value: any) {
        payload = value
      },
    },
    (error: unknown) => {
      if (error) throw error
    },
  )
  return payload
}
