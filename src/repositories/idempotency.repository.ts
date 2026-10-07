import { createHash } from 'node:crypto'
import { HttpError } from '../http/errors.js'
import { query } from './db.js'

export function hashPayload(payload: unknown) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

export class IdempotencyRepository {
  async find(key: string, userId: string) {
    const result = await query(
      `select request_hash, status_code, response_body
       from idempotency_keys
       where key = $1 and user_id = $2 and expires_at > now()
       limit 1`,
      [key, userId],
    )
    return result.rows[0] as { request_hash: string; status_code: number; response_body: unknown } | undefined
  }

  async save(key: string, userId: string, requestHash: string, statusCode: number, responseBody: unknown) {
    await query(
      `insert into idempotency_keys(key, user_id, request_hash, status_code, response_body, expires_at)
       values ($1, $2, $3, $4, $5, now() + interval '24 hours')
       on conflict (key, user_id) do update
       set request_hash = excluded.request_hash,
           status_code = excluded.status_code,
           response_body = excluded.response_body,
           expires_at = excluded.expires_at`,
      [key, userId, requestHash, statusCode, JSON.stringify(responseBody)],
    )
  }

  assertSamePayload(savedHash: string, currentHash: string) {
    if (savedHash !== currentHash) {
      throw new HttpError(409, 'La Idempotency-Key ya fue usada con un cuerpo diferente.', 'IDEMPOTENCY_KEY_REUSED')
    }
  }
}
