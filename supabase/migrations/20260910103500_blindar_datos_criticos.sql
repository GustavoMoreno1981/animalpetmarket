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
  v_telefono text;
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

  v_telefono := nullif(trim(p_telefono), '');
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

  select id
  into v_cliente_id
  from clientes
  where telefono = v_telefono
  limit 1;

  if v_cliente_id is null then
    insert into clientes (nombre, telefono, direccion, updated_at, vendedor_id)
    values (
      nullif(trim(p_nombre_cliente), ''),
      v_telefono,
      nullif(trim(p_direccion), ''),
      now(),
      p_vendedor_id
    )
    returning id into v_cliente_id;
  end if;

  if v_cliente_id is null then
    raise exception 'No se pudo resolver el cliente del pedido';
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
    v_telefono,
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

create or replace function marcar_despachado_transaccional(
  p_pedido_id uuid,
  p_total decimal,
  p_domiciliario_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_pp_id uuid;
  v_cant int;
  v_restar int;
  v_lote record;
  v_disp int;
  v_quitar int;
  v_stock_total int;
  v_hoy date := current_date;
begin
  if not exists (select 1 from pedidos where id = p_pedido_id) then
    raise exception 'Pedido no encontrado';
  end if;

  if exists (select 1 from pedidos where id = p_pedido_id and estado = 'despachado') then
    raise exception 'El pedido ya está despachado';
  end if;

  update pedidos
  set estado = 'despachado',
      domiciliario_id = case when p_domiciliario_id is not null then p_domiciliario_id else domiciliario_id end
  where id = p_pedido_id;

  insert into ventas (pedido_id, total, fecha_venta)
  values (p_pedido_id, p_total, v_hoy)
  on conflict (pedido_id) do update set total = p_total, fecha_venta = v_hoy;

  for v_item in
    select producto_id, presentacion, cantidad
    from pedido_items
    where pedido_id = p_pedido_id and producto_id is not null
  loop
    v_cant := v_item.cantidad;

    select id into v_pp_id
    from producto_presentaciones
    where producto_id = v_item.producto_id and nombre = v_item.presentacion;

    if v_pp_id is null then
      raise exception 'No se encontró la presentación % para devolver/despachar inventario del pedido', v_item.presentacion;
    end if;

    select coalesce(sum(cantidad), 0)::int into v_stock_total
    from inventario_lotes
    where producto_presentacion_id = v_pp_id
      and fecha_vencimiento >= v_hoy
      and cantidad > 0;

    if v_stock_total < v_cant then
      raise exception 'Stock insuficiente para % (%). Disponible: %, solicitado: %',
        coalesce((select nombre from productos where id = v_item.producto_id), 'producto'),
        v_item.presentacion,
        v_stock_total,
        v_cant;
    end if;

    v_restar := v_cant;
    for v_lote in
      select id, cantidad
      from inventario_lotes
      where producto_presentacion_id = v_pp_id
        and fecha_vencimiento >= v_hoy
        and cantidad > 0
      order by fecha_vencimiento
      for update
    loop
      exit when v_restar <= 0;
      v_disp := v_lote.cantidad;
      v_quitar := least(v_restar, v_disp);
      if v_quitar <= 0 then
        continue;
      end if;

      update inventario_lotes
      set cantidad = v_disp - v_quitar
      where id = v_lote.id;

      v_restar := v_restar - v_quitar;
    end loop;
  end loop;
end;
$$;

create or replace function rechazar_pedido_transaccional(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_estado text;
  v_item record;
  v_presentacion_id uuid;
  v_fecha_dev date := current_date + interval '6 months';
  v_lote_suffix text := upper(substr(replace(p_pedido_id::text, '-', ''), 1, 8));
  v_index int := 0;
begin
  select estado into v_estado
  from pedidos
  where id = p_pedido_id
  for update;

  if v_estado is null then
    raise exception 'Pedido no encontrado';
  end if;

  if v_estado = 'entregado' then
    raise exception 'No se puede rechazar un pedido que ya fue entregado';
  end if;

  update cupones
  set usado = false,
      pedido_id = null
  where pedido_id = p_pedido_id;

  if v_estado = 'despachado' then
    for v_item in
      select producto_id, presentacion, cantidad
      from pedido_items
      where pedido_id = p_pedido_id
    loop
      if v_item.producto_id is null then
        raise exception 'No se puede devolver inventario: uno de los ítems perdió la referencia del producto';
      end if;

      select id
      into v_presentacion_id
      from producto_presentaciones
      where producto_id = v_item.producto_id
        and nombre = v_item.presentacion
      limit 1;

      if v_presentacion_id is null then
        raise exception 'No se puede devolver inventario: no existe la presentación % del pedido', v_item.presentacion;
      end if;

      v_index := v_index + 1;
      insert into inventario_lotes (
        producto_presentacion_id,
        lote,
        cantidad,
        fecha_vencimiento
      ) values (
        v_presentacion_id,
        format('DEV-%s-%s', v_lote_suffix, lpad(v_index::text, 2, '0')),
        v_item.cantidad,
        v_fecha_dev
      );
    end loop;
  end if;

  delete from pedidos
  where id = p_pedido_id;
end;
$$;

revoke all on function crear_pedido_transaccional(text, text, text, text, decimal, jsonb, text, uuid, text, decimal, decimal, decimal, boolean) from public, anon, authenticated;
grant execute on function crear_pedido_transaccional(text, text, text, text, decimal, jsonb, text, uuid, text, decimal, decimal, decimal, boolean) to service_role;

revoke all on function marcar_despachado_transaccional(uuid, decimal) from public, anon, authenticated;
revoke all on function marcar_despachado_transaccional(uuid, decimal, uuid) from public, anon, authenticated;
grant execute on function marcar_despachado_transaccional(uuid, decimal, uuid) to service_role;

revoke all on function dar_salida_lote_transaccional(uuid, int) from public, anon, authenticated;
grant execute on function dar_salida_lote_transaccional(uuid, int) to service_role;

revoke all on function rechazar_pedido_transaccional(uuid) from public, anon, authenticated;
grant execute on function rechazar_pedido_transaccional(uuid) to service_role;

revoke insert, update, delete on table categorias from authenticated, anon;
revoke insert, update, delete on table subcategorias from authenticated, anon;
revoke insert, update, delete on table tipos_producto from authenticated, anon;
revoke insert, update, delete on table productos from authenticated, anon;
revoke insert, update, delete on table producto_presentaciones from authenticated, anon;
revoke insert, update, delete on table producto_subcategorias from authenticated, anon;
revoke insert, update, delete on table inventario_lotes from authenticated, anon;
revoke insert, update, delete on table pedidos from authenticated, anon;
revoke insert, update, delete on table pedido_items from authenticated, anon;
revoke insert, update, delete on table ventas from authenticated, anon;
revoke insert, update, delete on table clientes from authenticated, anon;
revoke insert, update, delete on table cupones from authenticated, anon;

grant select, insert, update, delete on table categorias to service_role;
grant select, insert, update, delete on table subcategorias to service_role;
grant select, insert, update, delete on table tipos_producto to service_role;
grant select, insert, update, delete on table productos to service_role;
grant select, insert, update, delete on table producto_presentaciones to service_role;
grant select, insert, update, delete on table producto_subcategorias to service_role;
grant select, insert, update, delete on table inventario_lotes to service_role;
grant select, insert, update, delete on table pedidos to service_role;
grant select, insert, update, delete on table pedido_items to service_role;
grant select, insert, update, delete on table ventas to service_role;
grant select, insert, update, delete on table clientes to service_role;
grant select, insert, update, delete on table cupones to service_role;

alter table subcategorias
  drop constraint if exists subcategorias_categoria_id_fkey;
alter table subcategorias
  add constraint subcategorias_categoria_id_fkey
  foreign key (categoria_id) references categorias(id) on delete restrict;

alter table tipos_producto
  drop constraint if exists tipos_producto_subcategoria_id_fkey;
alter table tipos_producto
  add constraint tipos_producto_subcategoria_id_fkey
  foreign key (subcategoria_id) references subcategorias(id) on delete restrict;

alter table productos
  drop constraint if exists productos_subcategoria_id_fkey;
alter table productos
  add constraint productos_subcategoria_id_fkey
  foreign key (subcategoria_id) references subcategorias(id) on delete restrict;

alter table productos
  drop constraint if exists productos_tipo_producto_id_fkey;
alter table productos
  add constraint productos_tipo_producto_id_fkey
  foreign key (tipo_producto_id) references tipos_producto(id) on delete restrict;

alter table producto_presentaciones
  drop constraint if exists producto_presentaciones_producto_id_fkey;
alter table producto_presentaciones
  add constraint producto_presentaciones_producto_id_fkey
  foreign key (producto_id) references productos(id) on delete restrict;

alter table producto_subcategorias
  drop constraint if exists producto_subcategorias_producto_id_fkey;
alter table producto_subcategorias
  add constraint producto_subcategorias_producto_id_fkey
  foreign key (producto_id) references productos(id) on delete restrict;

alter table producto_subcategorias
  drop constraint if exists producto_subcategorias_subcategoria_id_fkey;
alter table producto_subcategorias
  add constraint producto_subcategorias_subcategoria_id_fkey
  foreign key (subcategoria_id) references subcategorias(id) on delete restrict;

alter table inventario_lotes
  drop constraint if exists inventario_lotes_producto_presentacion_id_fkey;
alter table inventario_lotes
  add constraint inventario_lotes_producto_presentacion_id_fkey
  foreign key (producto_presentacion_id) references producto_presentaciones(id) on delete restrict;
