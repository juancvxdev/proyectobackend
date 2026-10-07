# Proyecto Backend Araneda

API REST del Portal de Pedidos Araneda.

## Stack

- Node.js + Express + TypeScript
- PostgreSQL con migraciones automaticas
- Microsoft Entra ID / Azure AD para validar JWT
- Zod DTOs, RBAC, rate limiting, OpenAPI e Idempotency-Key
- Docker para despliegue en AWS EC2

## Ejecutar

```bash
npm install
cp .env.example .env
npm run dev
```

La API expone:

- `GET /v1/health`
- `GET /v1/docs`
- `GET /v1/openapi.json`

Con `AUTO_MIGRATE=true`, el backend crea/verifica las tablas de PostgreSQL al arrancar.
