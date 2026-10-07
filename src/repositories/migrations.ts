import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { env } from '../config/env.js'
import { pool, query } from './db.js'

export async function runMigrations() {
  if (!env.AUTO_MIGRATE) return

  const migrationsDir = resolve(process.cwd(), 'migrations')
  if (!existsSync(migrationsDir)) {
    console.warn(`No se encontro el directorio de migraciones: ${migrationsDir}`)
    return
  }

  await query(`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `)

  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b))

  for (const file of files) {
    const applied = await query('select 1 from schema_migrations where filename = $1', [file])
    if (applied.rowCount) continue

    const sql = readFileSync(resolve(migrationsDir, file), 'utf8')
    const client = await pool.connect()
    try {
      await client.query('begin')
      await client.query(sql)
      await client.query('insert into schema_migrations(filename) values ($1)', [file])
      await client.query('commit')
      console.log(`Migracion aplicada: ${file}`)
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }
}
