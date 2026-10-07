create extension if not exists pgcrypto;

do $$ begin
  create type app_role as enum ('admin', 'manager', 'customer', 'support');
exception when duplicate_object then null; end $$;

do $$ begin
  create type case_type as enum ('order_increase', 'complaint', 'requirement');
exception when duplicate_object then null; end $$;

do $$ begin
  create type case_priority as enum ('low', 'normal', 'high', 'critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type case_status as enum (
    'registered', 'assigned', 'in_progress', 'waiting_customer', 'waiting_area',
    'responded', 'solved', 'closed', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type sla_result as enum ('in_progress', 'met', 'missed', 'not_applicable');
exception when duplicate_object then null; end $$;

do $$ begin
  create type deadline_status as enum ('on_time', 'due_soon', 'overdue', 'fulfilled', 'closed_late');
exception when duplicate_object then null; end $$;

do $$ begin
  create type followup_visibility as enum ('internal', 'customer');
exception when duplicate_object then null; end $$;

create table if not exists areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  document_number text,
  email text,
  phone text,
  active boolean not null default true,
  sap_card_code text,
  created_at timestamptz not null default now()
);

create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  name text not null,
  address text,
  city text,
  active boolean not null default true,
  sap_ship_to_code text,
  created_at timestamptz not null default now()
);

create table if not exists users_profile (
  id uuid primary key default gen_random_uuid(),
  azure_object_id text unique,
  full_name text not null,
  email text not null unique,
  role app_role not null default 'customer',
  area_id uuid references areas(id),
  customer_id uuid references customers(id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists reception_channels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  case_type case_type not null,
  name text not null,
  active boolean not null default true,
  unique (case_type, name)
);

create table if not exists reasons (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id),
  name text not null,
  active boolean not null default true,
  unique (category_id, name)
);

create table if not exists sla_policies (
  id uuid primary key default gen_random_uuid(),
  case_type case_type not null,
  category_id uuid references categories(id),
  priority case_priority not null default 'normal',
  area_id uuid references areas(id),
  sla_days integer not null check (sla_days > 0),
  active boolean not null default true
);

create table if not exists sequence_counters (
  id uuid primary key default gen_random_uuid(),
  case_type case_type not null,
  year integer not null,
  current_value integer not null default 0,
  unique (case_type, year)
);

create table if not exists service_cases (
  id uuid primary key default gen_random_uuid(),
  case_number text not null unique,
  type case_type not null,
  customer_id uuid references customers(id),
  requester_name text not null,
  requester_email text,
  requester_phone text,
  branch_id uuid references branches(id),
  address text,
  reception_channel_id uuid not null references reception_channels(id),
  dispatched boolean,
  category_id uuid references categories(id),
  reason_id uuid references reasons(id),
  reason_text text,
  area_id uuid not null references areas(id),
  priority case_priority not null default 'normal',
  sla_days integer not null check (sla_days > 0),
  reception_at timestamptz not null default now(),
  registered_at timestamptz not null default now(),
  due_at timestamptz not null,
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  status case_status not null default 'registered',
  sla_result sla_result not null default 'in_progress',
  deadline_status deadline_status not null default 'on_time',
  public_response text,
  internal_summary text,
  sap_doc_entry text,
  sap_object_type text,
  created_by uuid references users_profile(id),
  updated_by uuid references users_profile(id),
  deleted_at timestamptz,
  constraint order_increase_fields check (
    type = 'order_increase' or (branch_id is null and address is null and dispatched is null)
  )
);

create table if not exists case_followups (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references service_cases(id),
  author_id uuid references users_profile(id),
  comment text not null,
  visibility followup_visibility not null default 'internal',
  next_action_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists case_status_history (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references service_cases(id),
  from_status case_status,
  to_status case_status not null,
  changed_by uuid references users_profile(id),
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users_profile(id),
  table_name text not null,
  record_id uuid,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create or replace function next_case_number(case_kind case_type)
returns text
language plpgsql
as $$
declare
  current_year integer := extract(year from now())::integer;
  next_value integer;
  prefix text;
begin
  insert into sequence_counters(case_type, year, current_value)
  values (case_kind, current_year, 1)
  on conflict (case_type, year)
  do update set current_value = sequence_counters.current_value + 1
  returning current_value into next_value;

  prefix := case case_kind
    when 'order_increase' then 'AP'
    when 'complaint' then 'REC'
    else 'REQ'
  end;

  return prefix || '-' || current_year || '-' || lpad(next_value::text, 6, '0');
end;
$$;

create or replace function set_case_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.case_number is null or new.case_number = '' then
    new.case_number := next_case_number(new.type);
  end if;

  if new.due_at is null then
    new.due_at := coalesce(new.registered_at, now()) + make_interval(days => new.sla_days);
  end if;

  return new;
end;
$$;

drop trigger if exists service_cases_defaults on service_cases;
create trigger service_cases_defaults
before insert on service_cases
for each row execute function set_case_defaults();

insert into areas(name) values
  ('Atencion al Cliente'), ('Ventas'), ('Despacho / Logistica'), ('Bodega'),
  ('Facturacion'), ('Cartera / Finanzas'), ('Gerencia'), ('Calidad'), ('Sistemas')
on conflict (name) do nothing;

insert into reception_channels(name) values
  ('Llamada'), ('WhatsApp'), ('Correo'), ('Personal'), ('Gerente'), ('Portal cliente'), ('Interno')
on conflict (name) do nothing;

insert into categories(case_type, name) values
  ('order_increase', 'Modificacion de pedido'),
  ('order_increase', 'Cantidad adicional'),
  ('order_increase', 'Producto adicional'),
  ('order_increase', 'Cambio comercial'),
  ('order_increase', 'Urgencia cliente'),
  ('complaint', 'Entrega / despacho'),
  ('complaint', 'Producto'),
  ('complaint', 'Facturacion'),
  ('complaint', 'Atencion al cliente'),
  ('complaint', 'Comercial'),
  ('complaint', 'Documentacion'),
  ('complaint', 'Otro'),
  ('requirement', 'Informacion comercial'),
  ('requirement', 'Documentacion'),
  ('requirement', 'Estado de pedido'),
  ('requirement', 'Facturacion'),
  ('requirement', 'Soporte interno'),
  ('requirement', 'Solicitud gerencial'),
  ('requirement', 'Otro')
on conflict (case_type, name) do nothing;

insert into sla_policies(case_type, priority, sla_days) values
  ('order_increase', 'normal', 1),
  ('complaint', 'critical', 2),
  ('complaint', 'normal', 3),
  ('requirement', 'low', 2),
  ('requirement', 'normal', 3),
  ('requirement', 'high', 5)
on conflict do nothing;

insert into users_profile(full_name, email, role, active) values
  ('Juan Jose Cordova', 'juanjose.cordova@araneda.com.ec', 'admin', true),
  ('Paola Suquinagua', 'paola.suquinagua@araneda.com.ec', 'admin', true)
on conflict (email) do update
set role = excluded.role,
    active = excluded.active;

create index if not exists idx_service_cases_status on service_cases(status);
create index if not exists idx_service_cases_type on service_cases(type);
create index if not exists idx_service_cases_area_id on service_cases(area_id);
create index if not exists idx_service_cases_customer_id on service_cases(customer_id);
create index if not exists idx_service_cases_due_at on service_cases(due_at);
create index if not exists idx_case_followups_case_id on case_followups(case_id);
