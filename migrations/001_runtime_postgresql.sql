create table if not exists public.idempotency_keys (
  key text not null,
  user_id uuid not null,
  request_hash text not null,
  status_code integer not null,
  response_body jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (key, user_id)
);

create index if not exists idx_idempotency_keys_expires_at
  on public.idempotency_keys(expires_at);

comment on table public.idempotency_keys is
  'Stores API responses for Idempotency-Key protected create operations.';

-- Capturas y archivos adjuntos quedan fuera del alcance runtime: no se usa bucket ni storage externo.
