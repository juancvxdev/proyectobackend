import { describe, expect, it } from 'vitest'
import { createCaseSchema, paginationQuerySchema } from './portal.schemas.js'

describe('portal schemas', () => {
  it('normalizes pagination defaults', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, limit: 50 })
  })

  it('validates create case payloads', () => {
    const payload = createCaseSchema.parse({
      type: 'complaint',
      customer: 'Clinica Central',
      requesterName: 'Ana Perez',
      requesterEmail: 'ana@example.com',
      receptionChannelId: '8e3f4c04-a476-4411-9ad8-36f917543997',
      dispatched: false,
      reason: 'Producto incompleto',
      areaId: '88b308f1-4c1f-4107-bde2-7d81aa4ca899',
      priority: 'normal',
      slaDays: 3,
    })

    expect(payload.type).toBe('complaint')
    expect(payload.address).toBe('')
  })
})
