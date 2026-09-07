alter table configuracion
  add column if not exists valor_domicilio_base decimal(12,2);

update configuracion
set valor_domicilio_base = 0
where valor_domicilio_base is null;

alter table configuracion
  alter column valor_domicilio_base set default 0;

alter table configuracion
  alter column valor_domicilio_base set not null;

alter table configuracion
  add column if not exists domicilio_gratis_activo boolean;

update configuracion
set domicilio_gratis_activo = false
where domicilio_gratis_activo is null;

alter table configuracion
  alter column domicilio_gratis_activo set default false;

alter table configuracion
  alter column domicilio_gratis_activo set not null;

comment on column configuracion.valor_domicilio_base is 'Costo interno base del domicilio para pedidos nuevos.';
comment on column configuracion.domicilio_gratis_activo is 'Si es true, el cliente ve domicilio gratis por defecto pero el costo real interno se conserva.';

alter table pedidos
  add column if not exists subtotal_productos decimal(12,2);

alter table pedidos
  add column if not exists valor_domicilio_cobrado decimal(12,2);

alter table pedidos
  add column if not exists valor_domicilio_real decimal(12,2);

alter table pedidos
  add column if not exists domicilio_es_gratis boolean;

alter table pedidos
  add column if not exists descuento_pedido decimal(12,2);

update pedidos
set
  subtotal_productos = coalesce(total, 0),
  valor_domicilio_cobrado = 0,
  valor_domicilio_real = 0,
  domicilio_es_gratis = false,
  descuento_pedido = 0
where subtotal_productos is null
   or valor_domicilio_cobrado is null
   or valor_domicilio_real is null
   or domicilio_es_gratis is null
   or descuento_pedido is null;

alter table pedidos
  alter column subtotal_productos set default 0;
alter table pedidos
  alter column subtotal_productos set not null;

alter table pedidos
  alter column valor_domicilio_cobrado set default 0;
alter table pedidos
  alter column valor_domicilio_cobrado set not null;

alter table pedidos
  alter column valor_domicilio_real set default 0;
alter table pedidos
  alter column valor_domicilio_real set not null;

alter table pedidos
  alter column domicilio_es_gratis set default false;
alter table pedidos
  alter column domicilio_es_gratis set not null;

alter table pedidos
  alter column descuento_pedido set default 0;
alter table pedidos
  alter column descuento_pedido set not null;

comment on column pedidos.subtotal_productos is 'Snapshot del subtotal de productos antes del domicilio.';
comment on column pedidos.valor_domicilio_cobrado is 'Valor de domicilio cobrado al cliente en ese pedido.';
comment on column pedidos.valor_domicilio_real is 'Costo interno real del domicilio en ese pedido.';
comment on column pedidos.domicilio_es_gratis is 'Indica si el cliente vio/canceló domicilio gratis.';
comment on column pedidos.descuento_pedido is 'Descuento total aplicado al pedido.';

drop function if exists crear_pedido_transaccional(text, text, text, text, decimal, jsonb, text, uuid, text);
drop function if exists crear_pedido_transaccional(text, text, text, text, decimal, jsonb, text, uuid, text, decimal, decimal, decimal, boolean);

create or replace function crear_pedido_transaccional(
  p_nombre_cliente text,
  p_telefono text,
  p_direccion text,
  p_notas text,
  p_total decimal,
  p_items jsonb,
  p_cupon_codigo text default null,
  p_vendedor_id uuid default null,
  p_metodo_pago text default 'efectivo',
  p_subtotal_productos decimal default 0,
  p_valor_domicilio_cobrado decimal default 0,
  p_valor_domicilio_real decimal default 0,
  p_domicilio_es_gratis boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_pedido_id uuid;
  v_cliente_id uuid;
  v_item jsonb;
  v_subtotal decimal;
  v_aplica_iva boolean;
  v_iva_porcentaje smallint;
  v_cupon_id uuid;
  v_porcentaje smallint;
  v_total_base decimal;
  v_descuento_pedido decimal;
  v_total_final decimal;
  v_valor_domicilio_cobrado decimal;
begin
  if nullif(trim(p_nombre_cliente), '') is null then
    raise exception 'El nombre es obligatorio';
  end if;
  if nullif(trim(p_telefono), '') is null then
    raise exception 'El teléfono es obligatorio';
  end if;
  if nullif(trim(p_direccion), '') is null then
    raise exception 'La dirección es obligatoria';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito está vacío';
  end if;
  if coalesce(nullif(trim(p_metodo_pago), ''), 'efectivo') not in ('efectivo', 'codigo_qr', 'tarjeta') then
    raise exception 'Método de pago inválido';
  end if;
  if coalesce(p_subtotal_productos, 0) < 0 then
    raise exception 'Subtotal de productos inválido';
  end if;
  if coalesce(p_valor_domicilio_cobrado, 0) < 0 or coalesce(p_valor_domicilio_real, 0) < 0 then
    raise exception 'Valor de domicilio inválido';
  end if;

  v_valor_domicilio_cobrado := case
    when coalesce(p_domicilio_es_gratis, false) then 0
    else coalesce(p_valor_domicilio_cobrado, 0)
  end;
  v_total_base := coalesce(p_subtotal_productos, 0) + v_valor_domicilio_cobrado;
  v_descuento_pedido := 0;

  if nullif(trim(p_cupon_codigo), '') is not null then
    select id, porcentaje into v_cupon_id, v_porcentaje
    from cupones
    where upper(trim(codigo)) = upper(trim(p_cupon_codigo))
      and usado = false
      and (valido_hasta is null or valido_hasta >= current_date)
    limit 1;
    if v_cupon_id is null then
      raise exception 'Cupón inválido, ya utilizado o expirado';
    end if;
    v_descuento_pedido := round(v_total_base * v_porcentaje::numeric / 100, 2);
  end if;

  v_total_final := greatest(round(v_total_base - v_descuento_pedido, 2), 0);

  if abs(coalesce(p_total, 0) - v_total_final) > 0.01 then
    raise exception 'El total del pedido no coincide con el cálculo esperado';
  end if;

  insert into clientes (nombre, telefono, direccion, updated_at, vendedor_id)
  values (
    nullif(trim(p_nombre_cliente), ''),
    nullif(trim(p_telefono), ''),
    nullif(trim(p_direccion), ''),
    now(),
    p_vendedor_id
  )
  on conflict (telefono) do update set
    nombre = excluded.nombre,
    direccion = excluded.direccion,
    updated_at = now(),
    vendedor_id = coalesce(excluded.vendedor_id, clientes.vendedor_id)
  returning id into v_cliente_id;

  if v_cliente_id is null then
    select id into v_cliente_id from clientes where telefono = nullif(trim(p_telefono), '') limit 1;
  end if;

  insert into pedidos (
    nombre_cliente,
    telefono,
    direccion,
    notas,
    metodo_pago,
    subtotal_productos,
    valor_domicilio_cobrado,
    valor_domicilio_real,
    domicilio_es_gratis,
    descuento_pedido,
    total,
    estado,
    cliente_id,
    token_factura,
    vendedor_id
  ) values (
    nullif(trim(p_nombre_cliente), ''),
    nullif(trim(p_telefono), ''),
    nullif(trim(p_direccion), ''),
    nullif(trim(coalesce(p_notas, '')), ''),
    coalesce(nullif(trim(p_metodo_pago), ''), 'efectivo'),
    round(coalesce(p_subtotal_productos, 0), 2),
    round(v_valor_domicilio_cobrado, 2),
    round(coalesce(p_valor_domicilio_real, 0), 2),
    coalesce(p_domicilio_es_gratis, false),
    v_descuento_pedido,
    v_total_final,
    'pendiente',
    v_cliente_id,
    encode(gen_random_bytes(24), 'hex'),
    p_vendedor_id
  )
  returning id into v_pedido_id;

  if v_pedido_id is null then
    raise exception 'No se pudo crear el pedido';
  end if;

  if v_cupon_id is not null then
    update cupones set usado = true, pedido_id = v_pedido_id where id = v_cupon_id;
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_subtotal := (v_item->>'precio_unitario')::decimal * (v_item->>'cantidad')::int;
    v_iva_porcentaje := coalesce((v_item->>'iva_porcentaje')::smallint,
      case when coalesce((v_item->>'aplica_iva')::boolean, false) then 19 else 0 end
    );
    if v_iva_porcentaje not in (0, 5, 19) then
      raise exception 'IVA inválido en uno de los ítems';
    end if;
    v_aplica_iva := v_iva_porcentaje > 0;

    insert into pedido_items (
      pedido_id,
      producto_id,
      nombre,
      presentacion,
      cantidad,
      precio_unitario,
      subtotal,
      aplica_iva,
      iva_porcentaje
    ) values (
      v_pedido_id,
      (v_item->>'producto_id')::uuid,
      v_item->>'nombre',
      v_item->>'presentacion',
      (v_item->>'cantidad')::int,
      (v_item->>'precio_unitario')::decimal,
      v_subtotal,
      v_aplica_iva,
      v_iva_porcentaje
    );
  end loop;

  return v_pedido_id;
end;
$$;
