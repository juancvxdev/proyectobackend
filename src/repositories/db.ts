import pg, { type QueryResultRow } from 'pg'
import { env } from '../config/env.js'

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

export async function query<T extends QueryResultRow = any>(text: string, values: unknown[] = []) {
  const result = await pool.query<T>(text, values)
  return result
}

export async function withTransaction<T>(callback: (client: pg.PoolClient) => Promise<T>) {
  const client = await pool.connect()
  try {
    await client.query('begin')
    const result = await callback(client)
    await client.query('commit')
    return result
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}
