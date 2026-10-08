import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'
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
import { azureApiScope, env } from '../config/env.js'

extendZodWithOpenApi(z)

const registry = new OpenAPIRegistry()
const authenticatedSecurity: Array<Record<string, string[]>> = [{ microsoftOAuth: [azureApiScope] }, { bearerAuth: [] }]
const idParamSchema = z.object({ id: z.string().uuid() })

registry.register('CreateCase', createCaseSchema)
registry.register('UpdateCase', updateCaseSchema)
registry.register('CreateFollowUp', createFollowUpSchema)
registry.register('PaginationQuery', paginationQuerySchema)
registry.register('IdParam', idParamSchema)
registry.register('CatalogName', catalogNameSchema)
registry.register('UpdateCatalog', updateCatalogSchema)
registry.register('CreateCategory', createCategorySchema)
registry.register('CreateReason', createReasonSchema)
registry.register('UpdateUser', updateUserSchema)

registry.registerPath({
  method: 'get',
  path: '/v1/auth/me',
  tags: ['Autenticacion'],
  security: authenticatedSecurity,
  responses: { 200: { description: 'Perfil autenticado' }, 401: { description: 'Token invalido' } },
})

registry.registerPath({
  method: 'get',
  path: '/v1/casos',
  tags: ['Casos'],
  security: authenticatedSecurity,
  request: { query: paginationQuerySchema },
  responses: { 200: { description: 'Listado paginado de casos' } },
})

registry.registerPath({
  method: 'post',
  path: '/v1/casos',
  tags: ['Casos'],
  security: authenticatedSecurity,
  request: { body: { content: { 'application/json': { schema: createCaseSchema } } } },
  responses: { 201: { description: 'Caso creado' }, 422: { description: 'Error de validacion' } },
})

registry.registerPath({
  method: 'get',
  path: '/v1/casos/{id}',
  tags: ['Casos'],
  security: authenticatedSecurity,
  request: { params: idParamSchema },
  responses: { 200: { description: 'Detalle del caso' }, 404: { description: 'Caso no encontrado' } },
})

registry.registerPath({
  method: 'patch',
  path: '/v1/casos/{id}',
  tags: ['Casos'],
  security: authenticatedSecurity,
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: updateCaseSchema } } },
  },
  responses: { 200: { description: 'Caso actualizado' }, 409: { description: 'Transicion invalida' } },
})

registry.registerPath({
  method: 'delete',
  path: '/v1/casos/{id}',
  tags: ['Casos'],
  security: authenticatedSecurity,
  request: { params: idParamSchema },
  responses: { 204: { description: 'Caso eliminado logicamente' }, 403: { description: 'Rol insuficiente' } },
})

registry.registerPath({
  method: 'get',
  path: '/v1/casos/{id}/seguimientos',
  tags: ['Seguimientos'],
  security: authenticatedSecurity,
  request: { params: idParamSchema },
  responses: { 200: { description: 'Seguimientos del caso' } },
})

registry.registerPath({
  method: 'post',
  path: '/v1/casos/{id}/seguimientos',
  tags: ['Seguimientos'],
  security: authenticatedSecurity,
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: createFollowUpSchema } } },
  },
  responses: { 201: { description: 'Seguimiento creado' }, 422: { description: 'Error de validacion' } },
})

registry.registerPath({
  method: 'get',
  path: '/v1/catalogos',
  tags: ['Catalogos'],
  security: authenticatedSecurity,
  responses: { 200: { description: 'Catalogos operativos' } },
})

registry.registerPath({
  method: 'post',
  path: '/v1/catalogos/areas',
  tags: ['Catalogos'],
  security: authenticatedSecurity,
  request: { body: { content: { 'application/json': { schema: catalogNameSchema } } } },
  responses: { 201: { description: 'Area creada' }, 403: { description: 'Rol insuficiente' } },
})

registry.registerPath({
  method: 'patch',
  path: '/v1/catalogos/areas/{id}',
  tags: ['Catalogos'],
  security: authenticatedSecurity,
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: updateCatalogSchema } } },
  },
  responses: { 204: { description: 'Area actualizada' }, 403: { description: 'Rol insuficiente' } },
})

registry.registerPath({
  method: 'post',
  path: '/v1/catalogos/categorias',
  tags: ['Catalogos'],
  security: authenticatedSecurity,
  request: { body: { content: { 'application/json': { schema: createCategorySchema } } } },
  responses: { 201: { description: 'Categoria creada' }, 403: { description: 'Rol insuficiente' } },
})

registry.registerPath({
  method: 'patch',
  path: '/v1/catalogos/categorias/{id}',
  tags: ['Catalogos'],
  security: authenticatedSecurity,
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: updateCatalogSchema } } },
  },
  responses: { 204: { description: 'Categoria actualizada' }, 403: { description: 'Rol insuficiente' } },
})

registry.registerPath({
  method: 'post',
  path: '/v1/catalogos/motivos',
  tags: ['Catalogos'],
  security: authenticatedSecurity,
  request: { body: { content: { 'application/json': { schema: createReasonSchema } } } },
  responses: { 201: { description: 'Motivo creado' }, 403: { description: 'Rol insuficiente' } },
})

registry.registerPath({
  method: 'patch',
  path: '/v1/catalogos/motivos/{id}',
  tags: ['Catalogos'],
  security: authenticatedSecurity,
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: updateCatalogSchema } } },
  },
  responses: { 204: { description: 'Motivo actualizado' }, 403: { description: 'Rol insuficiente' } },
})

registry.registerPath({
  method: 'get',
  path: '/v1/usuarios',
  tags: ['Usuarios'],
  security: authenticatedSecurity,
  responses: { 200: { description: 'Usuarios del portal' }, 403: { description: 'Rol insuficiente' } },
})

registry.registerPath({
  method: 'patch',
  path: '/v1/usuarios/{id}',
  tags: ['Usuarios'],
  security: authenticatedSecurity,
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: updateUserSchema } } },
  },
  responses: { 204: { description: 'Usuario actualizado' }, 403: { description: 'Rol insuficiente' } },
})

registry.registerPath({
  method: 'get',
  path: '/v1/metricas/resumen',
  tags: ['Metricas'],
  security: authenticatedSecurity,
  responses: { 200: { description: 'Resumen operativo de casos' }, 403: { description: 'Rol insuficiente' } },
})

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions)
  const document = generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'API Portal de Pedidos Araneda',
      version: '1.0.0',
      description: 'Contrato REST versionado para casos, catalogos, usuarios, metricas e integraciones.',
    },
    servers: [{ url: '/' }],
  })
  document.components = {
    ...document.components,
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      microsoftOAuth: {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl: `https://login.microsoftonline.com/${env.AZURE_TENANT_ID}/oauth2/v2.0/authorize`,
            tokenUrl: `https://login.microsoftonline.com/${env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
            scopes: {
              [azureApiScope]: 'Acceso a la API Portal de Pedidos Araneda',
            },
          },
        },
      },
    },
  }
  return document
}
