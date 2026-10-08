-- Demo data for academic presentation. Safe to run multiple times.
begin;

insert into reasons(category_id, name)
select c.id, r.name
from categories c
join (
  values
    ('order_increase'::case_type, 'Cantidad adicional', 'Cliente solicita aumentar unidades del pedido confirmado'),
    ('order_increase'::case_type, 'Producto adicional', 'Cliente solicita agregar un producto antes del despacho'),
    ('order_increase'::case_type, 'Urgencia cliente', 'Pedido requiere despacho prioritario por quiebre de stock'),
    ('complaint'::case_type, 'Entrega / despacho', 'Pedido entregado fuera de la fecha comprometida'),
    ('complaint'::case_type, 'Producto', 'Producto recibido con novedad de calidad o presentacion'),
    ('complaint'::case_type, 'Facturacion', 'Diferencia entre factura y pedido recibido'),
    ('requirement'::case_type, 'Documentacion', 'Cliente solicita certificado, ficha tecnica o documento comercial'),
    ('requirement'::case_type, 'Estado de pedido', 'Cliente consulta avance o fecha estimada de entrega'),
    ('requirement'::case_type, 'Informacion comercial', 'Cliente solicita condiciones, disponibilidad o cotizacion')
) as r(case_type, category_name, name)
  on c.case_type = r.case_type and c.name = r.category_name
on conflict (category_id, name) do nothing;

insert into customers(name, document_number, email, phone, sap_card_code) values
  ('Laboratorio Clinico San Rafael', '0999999001', 'compras@sanrafael.example', '+593 2 300 1000', 'C-DEMO-001'),
  ('Hospital del Norte', '0999999002', 'abastecimiento@hospitalnorte.example', '+593 2 300 2000', 'C-DEMO-002'),
  ('Distribuidora BioAndes', '0999999003', 'pedidos@bioandes.example', '+593 2 300 3000', 'C-DEMO-003'),
  ('Clinica Santa Lucia', '0999999004', 'recepcion@santalucia.example', '+593 2 300 4000', 'C-DEMO-004')
on conflict (name) do update
set document_number = excluded.document_number,
    email = excluded.email,
    phone = excluded.phone,
    sap_card_code = excluded.sap_card_code,
    active = true;

insert into branches(customer_id, name, address, city, sap_ship_to_code)
select c.id, b.name, b.address, b.city, b.sap_ship_to_code
from customers c
join (
  values
    ('Laboratorio Clinico San Rafael', 'Matriz Quito', 'Av. America N34-120', 'Quito', 'S001'),
    ('Hospital del Norte', 'Bodega Central', 'Av. de la Prensa N70-45', 'Quito', 'S002'),
    ('Distribuidora BioAndes', 'Sucursal Cuenca', 'Av. Loja 10-80', 'Cuenca', 'S003'),
    ('Clinica Santa Lucia', 'Recepcion Principal', 'Av. 12 de Octubre 25-90', 'Quito', 'S004')
) as b(customer_name, name, address, city, sap_ship_to_code)
  on c.name = b.customer_name
where not exists (
  select 1
  from branches existing
  where existing.customer_id = c.id and existing.name = b.name
);

delete from case_status_history
where case_id in (select id from service_cases where case_number like 'DEMO-%');

delete from case_followups
where case_id in (select id from service_cases where case_number like 'DEMO-%');

delete from service_cases
where case_number like 'DEMO-%';

with demo_values as (
  select *
  from (
    values
      (
        'DEMO-REQ-001',
        'requirement'::case_type,
        'Laboratorio Clinico San Rafael',
        'Matriz Quito',
        'Correo',
        'Documentacion',
        'Cliente solicita certificado de calibracion y ficha tecnica del equipo entregado.',
        'Atencion al Cliente',
        'normal'::case_priority,
        3,
        now() - interval '2 days',
        now() + interval '1 day',
        'in_progress'::case_status,
        'in_progress'::sla_result,
        'due_soon'::deadline_status,
        null,
        'Pendiente recibir documento tecnico del area de calidad.'
      ),
      (
        'DEMO-REC-001',
        'complaint'::case_type,
        'Hospital del Norte',
        'Bodega Central',
        'WhatsApp',
        'Entrega / despacho',
        'Cliente reporta que el pedido llego incompleto: faltan dos cajas de reactivos.',
        'Despacho / Logistica',
        'high'::case_priority,
        2,
        now() - interval '4 days',
        now() - interval '2 days',
        'waiting_area'::case_status,
        'missed'::sla_result,
        'overdue'::deadline_status,
        null,
        'Se valido guia de remision. Logistica revisa trazabilidad con bodega.'
      ),
      (
        'DEMO-AP-001',
        'order_increase'::case_type,
        'Distribuidora BioAndes',
        'Sucursal Cuenca',
        'Llamada',
        'Producto adicional',
        'Cliente solicita agregar 5 unidades de tubos EDTA antes de facturar el pedido.',
        'Ventas',
        'normal'::case_priority,
        1,
        now() - interval '6 hours',
        now() + interval '18 hours',
        'assigned'::case_status,
        'in_progress'::sla_result,
        'on_time'::deadline_status,
        null,
        'Venta adicional en revision comercial antes de enviar a despacho.'
      ),
      (
        'DEMO-REC-002',
        'complaint'::case_type,
        'Clinica Santa Lucia',
        'Recepcion Principal',
        'Portal cliente',
        'Facturacion',
        'Factura emitida con direccion de entrega incorrecta.',
        'Facturacion',
        'normal'::case_priority,
        3,
        now() - interval '8 days',
        now() - interval '5 days',
        'closed'::case_status,
        'met'::sla_result,
        'fulfilled'::deadline_status,
        'Se emitio nota correctiva y se envio factura corregida al cliente.',
        'Caso cerrado con correccion documental.'
      ),
      (
        'DEMO-REQ-002',
        'requirement'::case_type,
        'Hospital del Norte',
        'Bodega Central',
        'Gerente',
        'Estado de pedido',
        'Gerencia del cliente solicita fecha estimada para entrega de pedido urgente.',
        'Gerencia',
        'critical'::case_priority,
        1,
        now() - interval '1 day',
        now() + interval '2 hours',
        'responded'::case_status,
        'in_progress'::sla_result,
        'due_soon'::deadline_status,
        'Se informa que el despacho esta programado para hoy en la tarde.',
        'Respuesta enviada, pendiente confirmacion de recepcion.'
      )
  ) as v(case_number, type, customer_name, branch_name, channel_name, category_name, reason_text, area_name, priority, sla_days, reception_at, due_at, status, sla_result, deadline_status, public_response, internal_summary)
)
insert into service_cases(
  case_number, type, customer_id, requester_name, requester_email, branch_id, address,
  reception_channel_id, dispatched, category_id, reason_text, area_id, priority, sla_days,
  reception_at, registered_at, due_at, first_response_at, status, sla_result, deadline_status,
  public_response, internal_summary, created_by, updated_by
)
select
  v.case_number,
  v.type,
  c.id,
  'Usuario Demo ' || c.name,
  lower(replace(c.name, ' ', '.')) || '@example.com',
  case when v.type = 'order_increase' then b.id else null end,
  case when v.type = 'order_increase' then b.address else null end,
  rc.id,
  case when v.type = 'order_increase' then false else null end,
  cat.id,
  v.reason_text,
  a.id,
  v.priority,
  v.sla_days,
  v.reception_at,
  v.reception_at,
  v.due_at,
  case when v.status in ('responded', 'closed') then v.reception_at + interval '4 hours' else null end,
  v.status,
  v.sla_result,
  v.deadline_status,
  v.public_response,
  v.internal_summary,
  up.id,
  up.id
from demo_values v
join customers c on c.name = v.customer_name
left join branches b on b.customer_id = c.id and b.name = v.branch_name
join reception_channels rc on rc.name = v.channel_name
join categories cat on cat.case_type = v.type and cat.name = v.category_name
join areas a on a.name = v.area_name
left join users_profile up on up.email = 'juanjose.cordova@araneda.com.ec';

with generated_values as (
  select
    gs,
    'DEMO-BULK-' || lpad(gs::text, 3, '0') as case_number,
    (array['order_increase', 'complaint', 'requirement'])[((gs - 1) % 3) + 1]::case_type as type,
    (array['Laboratorio Clinico San Rafael', 'Hospital del Norte', 'Distribuidora BioAndes', 'Clinica Santa Lucia'])[((gs - 1) % 4) + 1] as customer_name,
    (array['Matriz Quito', 'Bodega Central', 'Sucursal Cuenca', 'Recepcion Principal'])[((gs - 1) % 4) + 1] as branch_name,
    (array['Llamada', 'WhatsApp', 'Correo', 'Portal cliente', 'Gerente'])[((gs - 1) % 5) + 1] as channel_name,
    (array['Atencion al Cliente', 'Ventas', 'Despacho / Logistica', 'Facturacion', 'Gerencia'])[((gs - 1) % 5) + 1] as area_name,
    (array['low', 'normal', 'high', 'critical'])[((gs - 1) % 4) + 1]::case_priority as priority,
    (array['registered', 'assigned', 'in_progress', 'waiting_customer', 'waiting_area', 'responded', 'closed'])[((gs - 1) % 7) + 1]::case_status as status,
    now() - make_interval(days => ((gs % 12) + 1), hours => (gs % 8)) as reception_at,
    case
      when gs % 5 = 0 then now() - make_interval(days => ((gs % 4) + 1))
      when gs % 3 = 0 then now() + interval '8 hours'
      else now() + make_interval(days => ((gs % 5) + 1))
    end as due_at,
    ((gs % 5) + 1) as sla_days
  from generate_series(1, 30) as gs
),
normalized_values as (
  select
    *,
    case
      when type = 'order_increase' then (array['Cantidad adicional', 'Producto adicional', 'Urgencia cliente'])[((gs - 1) % 3) + 1]
      when type = 'complaint' then (array['Entrega / despacho', 'Producto', 'Facturacion'])[((gs - 1) % 3) + 1]
      else (array['Documentacion', 'Estado de pedido', 'Informacion comercial'])[((gs - 1) % 3) + 1]
    end as category_name,
    case
      when type = 'order_increase' then 'Cliente solicita modificar cantidades o agregar productos al pedido antes de despacho.'
      when type = 'complaint' then 'Cliente reporta una novedad que requiere revision y respuesta formal.'
      else 'Cliente solicita informacion, documentacion o confirmacion operativa del pedido.'
    end as reason_text,
    case
      when status = 'closed' then 'fulfilled'::deadline_status
      when due_at < now() then 'overdue'::deadline_status
      when due_at < now() + interval '1 day' then 'due_soon'::deadline_status
      else 'on_time'::deadline_status
    end as deadline_status,
    case
      when status = 'closed' then 'met'::sla_result
      when due_at < now() then 'missed'::sla_result
      else 'in_progress'::sla_result
    end as sla_result,
    case
      when status in ('responded', 'closed') then 'Respuesta demo enviada al cliente para evidenciar trazabilidad del caso.'
      else null
    end as public_response,
    case
      when status = 'closed' then 'Caso demo cerrado para mostrar ciclo completo.'
      when due_at < now() then 'Caso demo vencido para explicar alertas de SLA.'
      else 'Caso demo activo para explicar gestion por area responsable.'
    end as internal_summary
  from generated_values
)
insert into service_cases(
  case_number, type, customer_id, requester_name, requester_email, branch_id, address,
  reception_channel_id, dispatched, category_id, reason_text, area_id, priority, sla_days,
  reception_at, registered_at, due_at, first_response_at, status, sla_result, deadline_status,
  public_response, internal_summary, created_by, updated_by
)
select
  v.case_number,
  v.type,
  c.id,
  'Solicitante Demo ' || lpad(v.gs::text, 2, '0'),
  'solicitante.demo' || lpad(v.gs::text, 2, '0') || '@example.com',
  case when v.type = 'order_increase' then b.id else null end,
  case when v.type = 'order_increase' then coalesce(b.address, 'Direccion demo') else null end,
  rc.id,
  case when v.type = 'order_increase' then (v.gs % 2 = 0) else null end,
  cat.id,
  v.reason_text,
  a.id,
  v.priority,
  v.sla_days,
  v.reception_at,
  v.reception_at,
  v.due_at,
  case when v.status in ('responded', 'closed') then v.reception_at + interval '3 hours' else null end,
  v.status,
  v.sla_result,
  v.deadline_status,
  v.public_response,
  v.internal_summary,
  up.id,
  up.id
from normalized_values v
join customers c on c.name = v.customer_name
left join branches b on b.customer_id = c.id and b.name = v.branch_name
join reception_channels rc on rc.name = v.channel_name
join categories cat on cat.case_type = v.type and cat.name = v.category_name
join areas a on a.name = v.area_name
left join users_profile up on up.email = 'juanjose.cordova@araneda.com.ec';

insert into case_followups(case_id, author_id, comment, visibility, created_at)
select sc.id, up.id, f.comment, f.visibility::followup_visibility, f.created_at
from service_cases sc
cross join users_profile up
join (
  values
    ('DEMO-REQ-001', 'Se registra solicitud documental y se asigna a Atencion al Cliente.', 'internal', now() - interval '2 days'),
    ('DEMO-REQ-001', 'Estimado cliente, estamos gestionando los certificados solicitados.', 'customer', now() - interval '1 day'),
    ('DEMO-REC-001', 'Se escala reclamo a Logistica para confirmar unidades despachadas.', 'internal', now() - interval '3 days'),
    ('DEMO-REC-001', 'Cliente informado: estamos verificando el faltante con bodega.', 'customer', now() - interval '2 days'),
    ('DEMO-AP-001', 'Ventas valida disponibilidad y condiciones comerciales.', 'internal', now() - interval '4 hours'),
    ('DEMO-REC-002', 'Factura corregida enviada por correo. Cliente confirma recepcion.', 'customer', now() - interval '4 days'),
    ('DEMO-REQ-002', 'Gerencia solicita prioridad alta por impacto operativo del cliente.', 'internal', now() - interval '20 hours')
) as f(case_number, comment, visibility, created_at)
  on sc.case_number = f.case_number
where up.email = 'juanjose.cordova@araneda.com.ec';

insert into case_followups(case_id, author_id, comment, visibility, created_at)
select sc.id, up.id, 'Seguimiento demo: se revisa el caso y se deja constancia para la trazabilidad.', 'internal', sc.registered_at + interval '2 hours'
from service_cases sc
cross join users_profile up
where sc.case_number like 'DEMO-BULK-%'
  and up.email = 'juanjose.cordova@araneda.com.ec';

insert into case_followups(case_id, author_id, comment, visibility, created_at)
select sc.id, up.id, 'Mensaje demo al cliente: su solicitud fue recibida y esta siendo gestionada.', 'customer', sc.registered_at + interval '4 hours'
from service_cases sc
cross join users_profile up
where sc.case_number like 'DEMO-BULK-%'
  and sc.status in ('waiting_customer', 'responded', 'closed')
  and up.email = 'juanjose.cordova@araneda.com.ec';

insert into case_status_history(case_id, from_status, to_status, changed_by, comment, created_at)
select sc.id, h.from_status::case_status, h.to_status::case_status, up.id, h.comment, h.created_at
from service_cases sc
cross join users_profile up
join (
  values
    ('DEMO-REQ-001', null, 'registered', 'Solicitud registrada desde el portal.', now() - interval '2 days'),
    ('DEMO-REQ-001', 'registered', 'in_progress', 'Caso tomado por Atencion al Cliente.', now() - interval '1 day'),
    ('DEMO-REC-001', null, 'registered', 'Reclamo registrado por faltante.', now() - interval '4 days'),
    ('DEMO-REC-001', 'registered', 'waiting_area', 'Pendiente respuesta de Logistica.', now() - interval '3 days'),
    ('DEMO-AP-001', null, 'registered', 'Aumento de pedido creado.', now() - interval '6 hours'),
    ('DEMO-AP-001', 'registered', 'assigned', 'Asignado a Ventas.', now() - interval '5 hours'),
    ('DEMO-REC-002', null, 'registered', 'Reclamo de facturacion registrado.', now() - interval '8 days'),
    ('DEMO-REC-002', 'registered', 'closed', 'Caso resuelto y cerrado.', now() - interval '4 days'),
    ('DEMO-REQ-002', null, 'registered', 'Requerimiento urgente registrado.', now() - interval '1 day'),
    ('DEMO-REQ-002', 'registered', 'responded', 'Respuesta enviada al cliente.', now() - interval '6 hours')
) as h(case_number, from_status, to_status, comment, created_at)
  on sc.case_number = h.case_number
where up.email = 'juanjose.cordova@araneda.com.ec';

insert into case_status_history(case_id, from_status, to_status, changed_by, comment, created_at)
select sc.id, null, 'registered', up.id, 'Caso demo registrado para presentacion academica.', sc.registered_at
from service_cases sc
cross join users_profile up
where sc.case_number like 'DEMO-BULK-%'
  and up.email = 'juanjose.cordova@araneda.com.ec';

insert into case_status_history(case_id, from_status, to_status, changed_by, comment, created_at)
select sc.id, 'registered', sc.status, up.id, 'Cambio demo para mostrar avance del flujo de atencion.', sc.registered_at + interval '1 hour'
from service_cases sc
cross join users_profile up
where sc.case_number like 'DEMO-BULK-%'
  and sc.status <> 'registered'
  and up.email = 'juanjose.cordova@araneda.com.ec';

commit;
