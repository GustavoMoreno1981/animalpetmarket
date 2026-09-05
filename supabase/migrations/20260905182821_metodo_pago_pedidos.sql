alter table pedidos
  add column if not exists metodo_pago text;

update pedidos
set metodo_pago = 'efectivo'
where metodo_pago is null;

alter table pedidos
  alter column metodo_pago set default 'efectivo';

alter table pedidos
  alter column metodo_pago set not null;

alter table pedidos
  drop constraint if exists pedidos_metodo_pago_check;

alter table pedidos
  add constraint pedidos_metodo_pago_check
  check (metodo_pago in ('efectivo', 'codigo_qr'));

comment on column pedidos.metodo_pago is 'Método de pago contra entrega. Valores permitidos: efectivo, codigo_qr.';

drop function if exists crear_pedido_transaccional(text, text, text, text, decimal, jsonb);
drop function if exists crear_pedido_transaccional(text, text, text, text, decimal, jsonb, text);
drop function if exists crear_pedido_transaccional(text, text, text, text, decimal, jsonb, text, uuid);
drop function if exists crear_pedido_transaccional(text, text, text, text, decimal, jsonb, text, uuid, text);

create or replace function crear_pedido_transaccional(
  p_nombre_cliente text,
  p_telefono text,
  p_direccion text,
  p_notas text,
  p_total decimal,
  p_items jsonb,
  p_cupon_codigo text default null,
  p_vendedor_id uuid default null,
  p_metodo_pago text default 'efectivo'
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
  v_total_final decimal;
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
  if coalesce(nullif(trim(p_metodo_pago), ''), 'efectivo') not in ('efectivo', 'codigo_qr') then
    raise exception 'Método de pago inválido';
  end if;

  v_total_final := p_total;

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
    v_total_final := p_total * (1 - v_porcentaje::decimal / 100);
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
