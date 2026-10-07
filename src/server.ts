import { env } from './config/env.js'
import { createApp } from './app.js'
import { runMigrations } from './repositories/migrations.js'

await runMigrations()

const app = createApp()
app.listen(env.PORT, () => {
  console.log(`Araneda API escuchando en http://localhost:${env.PORT}`)
})
