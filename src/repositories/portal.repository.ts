import type { CaseStatus, AuthUser } from '../domain/types.js'
import { HttpError } from '../http/errors.js'
import { query } from './db.js'

const CASE_SELECT = `
  select sc.id, sc.case_number, sc.type, sc.customer_id, sc.requester_name, sc.requester_email,
    sc.branch_id, sc.address, sc.reception_channel_id, sc.dispatched, sc.category_id,
    sc.reason_id, sc.reason_text, sc.area_id, sc.priority, sc.sla_days, sc.reception_at,
    sc.registered_at, sc.due_at, sc.first_response_at, sc.status, sc.sla_result,
    sc.deadline_status, sc.public_response, sc.internal_summary,
    c.name as customer_name, rc.name as reception_channel_name, cat.name as category_name,
    r.name as reason_name, a.name as area_name
  from service_cases sc
  left join customers c on c.id = sc.customer_id
  left join reception_channels rc on rc.id = sc.reception_channel_id
  left join categories cat on cat.id = sc.category_id
  left join reasons r on r.id = sc.reason_id
  left join areas a on a.id = sc.area_id
`

type DbCaseRow = Record<string, any>

export class PortalRepository {
  constructor(_accessToken: string) {}

  async catalogs() {
    const [areas, channels, categories, reasons] = await Promise.all([
      query('select id, name, active from areas order by name'),
      query('select id, name, active from reception_channels order by name'),
      query('select id, name, active, case_type from categories order by name'),
      query('select r.id, r.name, r.active, r.category_id, c.case_type from reasons r join categories c on c.id = r.category_id order by r.name'),
    ])

    const catalogs = {
      areas: areas.rows,
      channels: channels.rows,
      categoriesByType: { order_increase: [], complaint: [], requirement: [] } as Record<string, any[]>,
      reasonsByType: { order_increase: [], complaint: [], requirement: [] } as Record<string, any[]>,
    }

    for (const category of categories.rows as any[]) {
      catalogs.categoriesByType[category.case_type].push({ id: category.id, name: category.name, active: category.active })
    }
    for (const reason of reasons.rows as any[]) {
      catalogs.reasonsByType[reason.case_type].push({ id: reason.id, name: reason.name, categoryId: reason.category_id, active: reason.active })
    }
    return catalogs
  }

  async cases(filters: Record<string, any>) {
    const page = Number(filters.page ?? 1)
    const limit = Number(filters.limit ?? 50)
    const offset = (page - 1) * limit
    const values: unknown[] = []
    const where = ['sc.deleted_at is null']

    for (const [field, column] of [
      ['status', 'sc.status'],
      ['type', 'sc.type'],
      ['responsableId', 'sc.area_id'],
      ['clienteId', 'sc.customer_id'],
    ] as const) {
      if (filters[field]) {
        values.push(filters[field])
        where.push(`${column} = $${values.length}`)
      }
    }
    if (filters.vencidos) where.push("sc.due_at < now() and sc.status not in ('closed', 'cancelled')")

    const whereSql = `where ${where.join(' and ')}`
    const count = await query<{ total: string }>(`select count(*) as total from service_cases sc ${whereSql}`, values)
    values.push(limit, offset)
    const rows = await query<DbCaseRow>(`${CASE_SELECT} ${whereSql} order by sc.registered_at desc limit $${values.length - 1} offset $${values.length}`, values)

    return { items: rows.rows.map(mapCase), total: Number(count.rows[0]?.total ?? 0), page, limit }
  }

  async caseById(id: string) {
    const result = await query<DbCaseRow>(`${CASE_SELECT} where sc.id = $1 and sc.deleted_at is null limit 1`, [id])
    if (!result.rows[0]) throw new HttpError(404, 'Caso no encontrado.', 'CASE_NOT_FOUND')
    return mapCase(result.rows[0])
  }

  async createCase(form: Record<string, any>) {
    const customer = await query<{ id: string }>(
      `insert into customers(name, email)
       values ($1, nullif($2, ''))
       on conflict (name) do update set email = coalesce(excluded.email, customers.email)
       returning id`,
      [form.customer.trim(), form.requesterEmail.trim()],
    )

    const now = new Date()
    const receptionAt = form.receptionAt ? new Date(form.receptionAt) : now
    const dueAt = new Date(now)
    dueAt.setDate(now.getDate() + Number(form.slaDays))

    const inserted = await query<{ id: string }>(
      `insert into service_cases(
        type, customer_id, requester_name, requester_email, reception_at, address,
        reception_channel_id, dispatched, category_id, reason_id, reason_text, area_id,
        priority, sla_days, registered_at, due_at
      )
      values ($1, $2, $3, nullif($4, ''), $5, $6, $7, $8, null, null, $9, $10, $11, $12, $13, $14)
      returning id`,
      [
        form.type,
        customer.rows[0].id,
        form.requesterName.trim(),
        form.requesterEmail.trim(),
        receptionAt.toISOString(),
        form.type === 'order_increase' ? form.address.trim() || null : null,
        form.receptionChannelId,
        form.type === 'order_increase' ? form.dispatched : null,
        form.reason.trim(),
        form.areaId,
        form.priority,
        form.slaDays,
        now.toISOString(),
        dueAt.toISOString(),
      ],
    )

    return this.caseById(inserted.rows[0].id)
  }

  async updateCase(id: string, form: Record<string, any>, userId: string) {
    const current = await this.caseById(id)
    await query(
      `update service_cases
       set requester_name = $1, requester_email = nullif($2, ''), reception_at = $3,
           address = $4, dispatched = $5, status = $6, area_id = $7, priority = $8,
           sla_days = $9, public_response = nullif($10, ''), internal_summary = nullif($11, ''),
           closed_at = $12, updated_by = $13
       where id = $14`,
      [
        form.requesterName.trim(),
        form.requesterEmail.trim(),
        new Date(form.receptionAt || Date.now()).toISOString(),
        form.type === 'order_increase' ? form.address.trim() || null : null,
        form.type === 'order_increase' ? form.dispatched : null,
        form.status,
        form.areaId,
        form.priority,
        form.slaDays,
        form.publicResponse.trim(),
        form.internalSummary.trim(),
        form.status === 'closed' ? new Date().toISOString() : null,
        userId,
        id,
      ],
    )
    await this.addStatusHistory(id, current.status, form.status, userId)
    return this.caseById(id)
  }

  async softDeleteCase(id: string, userId: string) {
    await query('update service_cases set deleted_at = now(), updated_by = $1 where id = $2', [userId, id])
  }

  async followUps(caseId: string) {
    const result = await query(
      `select cf.id, cf.case_id, cf.comment, cf.visibility, cf.created_at, coalesce(up.full_name, 'Usuario') as author
       from case_followups cf
       left join users_profile up on up.id = cf.author_id
       where cf.case_id = $1
       order by cf.created_at desc`,
      [caseId],
    )
    return result.rows.map((row: any) => ({
      id: row.id,
      caseId: row.case_id,
      author: row.author,
      visibility: row.visibility,
      comment: row.comment,
      createdAt: row.created_at,
    }))
  }

  async createFollowUp(caseId: string, form: Record<string, any>, user: AuthUser) {
    const result = await query(
      `insert into case_followups(case_id, author_id, comment, visibility)
       values ($1, $2, $3, $4)
       returning id, case_id, comment, visibility, created_at`,
      [caseId, user.id, form.comment.trim(), form.visibility],
    )
    const row = result.rows[0]
    return { id: row.id, caseId: row.case_id, author: user.fullName || user.email, visibility: row.visibility, comment: row.comment, createdAt: row.created_at }
  }

  async users() {
    const result = await query('select id, full_name, email, role, active, area_id, customer_id from users_profile order by full_name')
    return result.rows.map(mapUser)
  }

  async updateUser(id: string, user: Record<string, any>) {
    validateUserEmailForRole(user.email, user.role)
    await query(
      'update users_profile set full_name = $1, email = lower($2), role = $3, active = $4, area_id = $5, customer_id = $6 where id = $7',
      [user.fullName, user.email.trim(), user.role, user.active, user.areaId || null, user.customerId || null, id],
    )
  }

  async createArea(name: string) {
    await query('insert into areas(name) values ($1)', [name.trim()])
  }

  async updateArea(id: string, values: Record<string, any>) {
    await query('update areas set name = $1, active = $2 where id = $3', [values.name.trim(), values.active, id])
  }

  async createCategory(caseType: string, name: string) {
    await query('insert into categories(case_type, name) values ($1, $2)', [caseType, name.trim()])
  }

  async updateCategory(id: string, values: Record<string, any>) {
    await query('update categories set name = $1, active = $2 where id = $3', [values.name.trim(), values.active, id])
  }

  async createReason(categoryId: string, name: string) {
    await query('insert into reasons(category_id, name) values ($1, $2)', [categoryId, name.trim()])
  }

  async updateReason(id: string, values: Record<string, any>) {
    await query('update reasons set name = $1, active = $2 where id = $3', [values.name.trim(), values.active, id])
  }

  private async addStatusHistory(caseId: string, from: CaseStatus, to: CaseStatus, userId: string) {
    if (from === to) return
    await query('insert into case_status_history(case_id, from_status, to_status, changed_by, comment) values ($1, $2, $3, $4, $5)', [
      caseId,
      from,
      to,
      userId,
      'Actualizacion desde API REST',
    ])
  }
}

function mapCase(row: DbCaseRow) {
  return {
    id: row.id,
    caseNumber: row.case_number,
    type: row.type,
    customerId: row.customer_id ?? undefined,
    receptionChannelId: row.reception_channel_id,
    categoryId: row.category_id ?? undefined,
    reasonId: row.reason_id ?? undefined,
    areaId: row.area_id,
    customer: row.customer_name ?? 'Sin cliente',
    requesterName: row.requester_name,
    requesterEmail: row.requester_email ?? '',
    branch: row.branch_id ?? undefined,
    address: row.address ?? undefined,
    receptionChannel: row.reception_channel_name ?? 'Sin canal',
    dispatched: row.dispatched ?? undefined,
    category: row.category_name ?? '',
    reason: row.reason_text?.trim() ? row.reason_text : row.reason_name ?? '',
    area: row.area_name ?? 'Sin area',
    priority: row.priority,
    slaDays: row.sla_days,
    receptionAt: row.reception_at ?? row.registered_at,
    registeredAt: row.registered_at,
    dueAt: row.due_at,
    firstResponseAt: row.first_response_at ?? undefined,
    status: row.status,
    slaResult: row.sla_result,
    deadlineStatus: row.deadline_status,
    publicResponse: row.public_response ?? undefined,
    internalSummary: row.internal_summary ?? undefined,
  }
}

function mapUser(row: Record<string, any>) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    active: row.active,
    areaId: row.area_id ?? undefined,
    customerId: row.customer_id ?? undefined,
  }
}

function validateUserEmailForRole(email: string, role: string) {
  const normalizedEmail = email.trim().toLowerCase()
  if (role !== 'customer' && !normalizedEmail.endsWith('@araneda.com.ec')) {
    throw new HttpError(422, 'Los usuarios internos deben tener correo @araneda.com.ec.', 'INVALID_EMAIL_ROLE')
  }
}
