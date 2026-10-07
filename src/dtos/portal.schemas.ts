import { z } from 'zod'

export const caseTypeSchema = z.enum(['order_increase', 'complaint', 'requirement'])
export const caseStatusSchema = z.enum([
  'registered',
  'assigned',
  'in_progress',
  'waiting_customer',
  'waiting_area',
  'responded',
  'solved',
  'closed',
  'cancelled',
])
export const prioritySchema = z.enum(['low', 'normal', 'high', 'critical'])
export const roleSchema = z.enum(['admin', 'manager', 'support', 'customer'])

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: caseStatusSchema.optional(),
  type: caseTypeSchema.optional(),
  responsableId: z.string().uuid().optional(),
  clienteId: z.string().uuid().optional(),
  vencidos: z.coerce.boolean().optional(),
})

export const createCaseSchema = z.object({
  type: caseTypeSchema,
  customer: z.string().trim().min(1).max(180),
  requesterName: z.string().trim().min(1).max(180),
  requesterEmail: z.string().trim().email().or(z.literal('')),
  receptionAt: z.string().optional().default(''),
  address: z.string().trim().max(300).optional().default(''),
  receptionChannelId: z.string().uuid(),
  dispatched: z.boolean().default(false),
  reason: z.string().trim().min(1).max(1000),
  areaId: z.string().uuid(),
  priority: prioritySchema,
  slaDays: z.coerce.number().int().min(1).max(30),
})

export const updateCaseSchema = z.object({
  type: caseTypeSchema,
  requesterName: z.string().trim().min(1).max(180),
  requesterEmail: z.string().trim().email().or(z.literal('')),
  receptionAt: z.string().min(1),
  address: z.string().trim().max(300).optional().default(''),
  dispatched: z.boolean().default(false),
  status: caseStatusSchema,
  areaId: z.string().uuid(),
  priority: prioritySchema,
  slaDays: z.coerce.number().int().min(1).max(30),
  publicResponse: z.string().trim().max(5000).optional().default(''),
  internalSummary: z.string().trim().max(5000).optional().default(''),
})

export const createFollowUpSchema = z.object({
  comment: z.string().trim().min(1).max(5000),
  visibility: z.enum(['internal', 'customer']),
})

export const catalogNameSchema = z.object({
  name: z.string().trim().min(1).max(120),
})

export const updateCatalogSchema = catalogNameSchema.extend({
  active: z.boolean(),
})

export const createCategorySchema = catalogNameSchema.extend({
  caseType: caseTypeSchema,
})

export const createReasonSchema = catalogNameSchema.extend({
  categoryId: z.string().uuid(),
})

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(1).max(180),
  email: z.string().trim().email(),
  role: roleSchema,
  active: z.boolean(),
  areaId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
})

export const thirdPartyTokenSchema = z.object({
  clientId: z.string().trim().min(1),
  secret: z.string().min(1),
})

export const integrationOrderSchema = z.object({
  producto: z.string().trim().min(1).max(180),
  detalle: z.string().trim().min(1).max(1000),
  categoria: z.enum(['equipo', 'consumible', 'reactivo']),
  solicitante: z.string().trim().min(1).max(180),
  correo: z.string().email().optional(),
})
