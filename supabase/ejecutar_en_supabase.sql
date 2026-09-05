-- ============================================================
-- MIGRACIONES CONSOLIDADAS PARA PROYECTO NUEVO EN SUPABASE
-- Archivo generado automáticamente desde supabase/migrations
-- Ejecutar en SQL Editor sobre una base vacía o proyecto nuevo
-- ============================================================
-- ==================== 001_create_categorias ====================
-- Tabla de categorías (solo nombre por ahora)
create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz default now()
);

-- Índice para búsquedas por nombre
create index if not exists categorias_nombre_idx on categorias (nombre);

-- RLS: permitir lectura pública, escritura solo autenticados
alter table categorias enable row level security;

-- Cualquiera puede ver categorías (para el sitio público)
drop policy if exists "Categorías visibles para todos" on categorias;
create policy "Categorías visibles para todos"
  on categorias for select
  using (true);

-- Solo usuarios autenticados pueden crear/actualizar/eliminar
drop policy if exists "Solo autenticados pueden insertar categorías" on categorias;
create policy "Solo autenticados pueden insertar categorías"
  on categorias for insert
  to authenticated
  with check (true);

drop policy if exists "Solo autenticados pueden actualizar categorías" on categorias;
create policy "Solo autenticados pueden actualizar categorías"
  on categorias for update
  to authenticated
  using (true);

drop policy if exists "Solo autenticados pueden eliminar categorías" on categorias;
create policy "Solo autenticados pueden eliminar categorías"
  on categorias for delete
  to authenticated
  using (true);

-- ==================== 002_add_imagen_categorias ====================
-- Agregar columna imagen a categorías (URL de la imagen en Storage)
alter table categorias add column if not exists imagen text;

-- Crear bucket para imágenes de categorías
-- Nota: si falla, crea el bucket manualmente en Dashboard > Storage > New bucket > "categoria-imagenes" (public)
insert into storage.buckets (id, name, public)
values ('categoria-imagenes', 'categoria-imagenes', true)
on conflict (id) do nothing;

-- Políticas: lectura pública, escritura solo autenticados
drop policy if exists "Imágenes de categorías visibles para todos" on storage.objects;
create policy "Imágenes de categorías visibles para todos"
  on storage.objects for select
  using (bucket_id = 'categoria-imagenes');

drop policy if exists "Autenticados pueden subir imágenes de categorías" on storage.objects;
create policy "Autenticados pueden subir imágenes de categorías"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'categoria-imagenes');

drop policy if exists "Autenticados pueden actualizar imágenes de categorías" on storage.objects;
create policy "Autenticados pueden actualizar imágenes de categorías"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'categoria-imagenes');

drop policy if exists "Autenticados pueden eliminar imágenes de categorías" on storage.objects;
create policy "Autenticados pueden eliminar imágenes de categorías"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'categoria-imagenes');

-- ==================== 003_create_subcategorias ====================
-- Tabla de subcategorías (pertenecen a una categoría)
create table if not exists subcategorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria_id uuid not null references categorias(id) on delete cascade,
  created_at timestamptz default now(),
  unique(nombre, categoria_id)
);

create index if not exists subcategorias_categoria_id_idx on subcategorias (categoria_id);

-- RLS
alter table subcategorias enable row level security;

drop policy if exists "Subcategorías visibles para todos" on subcategorias;
create policy "Subcategorías visibles para todos"
  on subcategorias for select
  using (true);

drop policy if exists "Autenticados pueden insertar subcategorías" on subcategorias;
create policy "Autenticados pueden insertar subcategorías"
  on subcategorias for insert
  to authenticated
  with check (true);

drop policy if exists "Autenticados pueden actualizar subcategorías" on subcategorias;
create policy "Autenticados pueden actualizar subcategorías"
  on subcategorias for update
  to authenticated
  using (true);

drop policy if exists "Autenticados pueden eliminar subcategorías" on subcategorias;
create policy "Autenticados pueden eliminar subcategorías"
  on subcategorias for delete
  to authenticated
  using (true);

-- ==================== 004_create_productos ====================
-- Tabla de productos
create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  precio decimal(12,2) not null default 0,
  imagen text,
  subcategoria_id uuid not null references subcategorias(id) on delete cascade,
  created_at timestamptz default now(),

  -- Logística
  peso decimal(10,2),
  dimensiones text,
  requiere_refrigeracion boolean default false,
  producto_fragil boolean default false,

  -- Marketing
  destacado boolean default false,
  nuevo boolean default false,
  mas_vendido boolean default false,
  recomendado boolean default false,

  -- Secciones activas: qué datos extra tiene este producto (medicamento, alimento, juguete)
  secciones_activas text[] default '{}',

  -- Datos extra según tipo (medicamento, alimento, juguete) en JSON
  datos_medicamento jsonb,
  datos_alimento jsonb,
  datos_juguete jsonb
);

create index if not exists productos_subcategoria_id_idx on productos (subcategoria_id);
create index if not exists productos_destacado_idx on productos (destacado) where destacado = true;

-- RLS
alter table productos enable row level security;

drop policy if exists "Productos visibles para todos" on productos;
create policy "Productos visibles para todos"
  on productos for select using (true);

drop policy if exists "Autenticados pueden insertar productos" on productos;
create policy "Autenticados pueden insertar productos"
  on productos for insert to authenticated with check (true);

drop policy if exists "Autenticados pueden actualizar productos" on productos;
create policy "Autenticados pueden actualizar productos"
  on productos for update to authenticated using (true);

drop policy if exists "Autenticados pueden eliminar productos" on productos;
create policy "Autenticados pueden eliminar productos"
  on productos for delete to authenticated using (true);

-- ==================== 005_producto_imagenes_bucket ====================
-- Bucket para imágenes de productos
insert into storage.buckets (id, name, public)
values ('producto-imagenes', 'producto-imagenes', true)
on conflict (id) do nothing;

drop policy if exists "Imágenes de productos visibles para todos" on storage.objects;
create policy "Imágenes de productos visibles para todos"
  on storage.objects for select
  using (bucket_id = 'producto-imagenes');

drop policy if exists "Autenticados pueden subir imágenes de productos" on storage.objects;
create policy "Autenticados pueden subir imágenes de productos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'producto-imagenes');

drop policy if exists "Autenticados pueden actualizar imágenes de productos" on storage.objects;
create policy "Autenticados pueden actualizar imágenes de productos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'producto-imagenes');

drop policy if exists "Autenticados pueden eliminar imágenes de productos" on storage.objects;
create policy "Autenticados pueden eliminar imágenes de productos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'producto-imagenes');

-- ==================== 006_producto_presentaciones ====================
-- Presentaciones de un producto (cada una con su propia foto)
-- Ej: Royal Canin → 500g, 1kg, 2kg (cada presentación con su imagen)
create table if not exists producto_presentaciones (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id) on delete cascade,
  nombre text not null,
  imagen text,
  precio decimal(12,2),
  orden int default 0,
  created_at timestamptz default now()
);

create index if not exists producto_presentaciones_producto_id_idx on producto_presentaciones (producto_id);

-- RLS
alter table producto_presentaciones enable row level security;

drop policy if exists "Presentaciones visibles para todos" on producto_presentaciones;
create policy "Presentaciones visibles para todos"
  on producto_presentaciones for select using (true);

drop policy if exists "Autenticados pueden insertar presentaciones" on producto_presentaciones;
create policy "Autenticados pueden insertar presentaciones"
  on producto_presentaciones for insert to authenticated with check (true);

drop policy if exists "Autenticados pueden actualizar presentaciones" on producto_presentaciones;
create policy "Autenticados pueden actualizar presentaciones"
  on producto_presentaciones for update to authenticated using (true);

drop policy if exists "Autenticados pueden eliminar presentaciones" on producto_presentaciones;
create policy "Autenticados pueden eliminar presentaciones"
  on producto_presentaciones for delete to authenticated using (true);

-- ==================== 007_producto_imagenes_public ====================
-- Hacer público el bucket producto-imagenes y asegurar políticas
-- (El bucket categoria-imagenes ya tiene PUBLIC; producto-imagenes debe igualarse)

update storage.buckets
set public = true
where id = 'producto-imagenes';

-- Políticas para que cualquiera pueda VER las imágenes
drop policy if exists "Imágenes de productos visibles para todos" on storage.objects;
create policy "Imágenes de productos visibles para todos"
  on storage.objects for select
  using (bucket_id = 'producto-imagenes');

-- Políticas para subir (service_role las usa; authenticated como respaldo)
drop policy if exists "Autenticados pueden insertar imágenes de productos" on storage.objects;
create policy "Autenticados pueden insertar imágenes de productos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'producto-imagenes');

drop policy if exists "Service role puede insertar imágenes de productos" on storage.objects;
create policy "Service role puede insertar imágenes de productos"
  on storage.objects for insert
  to service_role
  with check (bucket_id = 'producto-imagenes');

-- ==================== 008_create_pedidos ====================
-- Pedidos (contra entrega, no pago online)
create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  nombre_cliente text not null,
  telefono text not null,
  direccion text not null,
  notas text,
  total decimal(12,2) not null,
  estado text default 'pendiente' check (estado in ('pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado')),
  created_at timestamptz default now()
);

-- Ítems de cada pedido
create table if not exists pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  producto_id uuid references productos(id) on delete set null,
  nombre text not null,
  presentacion text not null,
  cantidad int not null default 1,
  precio_unitario decimal(12,2) not null,
  subtotal decimal(12,2) not null,
  created_at timestamptz default now()
);

create index if not exists pedido_items_pedido_id_idx on pedido_items (pedido_id);

-- RLS
alter table pedidos enable row level security;
alter table pedido_items enable row level security;

drop policy if exists "Pedidos visibles para autenticados" on pedidos;
create policy "Pedidos visibles para autenticados"
  on pedidos for select to authenticated using (true);

drop policy if exists "Cualquiera puede crear pedidos (checkout público)" on pedidos;
create policy "Cualquiera puede crear pedidos (checkout público)"
  on pedidos for insert with check (true);

drop policy if exists "Autenticados pueden actualizar pedidos" on pedidos;
create policy "Autenticados pueden actualizar pedidos"
  on pedidos for update to authenticated using (true);

drop policy if exists "Pedido items visibles para autenticados" on pedido_items;
create policy "Pedido items visibles para autenticados"
  on pedido_items for select to authenticated using (true);

drop policy if exists "Cualquiera puede insertar pedido items" on pedido_items;
create policy "Cualquiera puede insertar pedido items"
  on pedido_items for insert with check (true);

-- ==================== 009_pedidos_ventas ====================
-- Agregar estado 'despachado' a pedidos
alter table pedidos drop constraint if exists pedidos_estado_check;
alter table pedidos add constraint pedidos_estado_check
  check (estado in ('pendiente', 'confirmado', 'enviado', 'despachado', 'entregado', 'cancelado'));

-- Tabla ventas para cierre de ventas (cuando se marca pedido como despachado)
create table if not exists ventas (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  total decimal(12,2) not null,
  fecha_venta date not null default current_date,
  created_at timestamptz default now(),
  unique(pedido_id)
);

create index if not exists ventas_fecha_venta_idx on ventas (fecha_venta);

alter table ventas enable row level security;
drop policy if exists "Ventas visibles para autenticados" on ventas;
create policy "Ventas visibles para autenticados"
  on ventas for select to authenticated using (true);
drop policy if exists "Autenticados pueden insertar ventas" on ventas;
create policy "Autenticados pueden insertar ventas"
  on ventas for insert to authenticated with check (true);
drop policy if exists "Autenticados pueden actualizar ventas" on ventas;
create policy "Autenticados pueden actualizar ventas"
  on ventas for update to authenticated using (true);

-- Permitir eliminar pedidos (rechazado)
drop policy if exists "Autenticados pueden eliminar pedidos" on pedidos;
create policy "Autenticados pueden eliminar pedidos"
  on pedidos for delete to authenticated using (true);

-- ==================== 010_inventario_lotes ====================
-- Inventario por lote y fecha de vencimiento
create table if not exists inventario_lotes (
  id uuid primary key default gen_random_uuid(),
  producto_presentacion_id uuid not null references producto_presentaciones(id) on delete cascade,
  lote text not null,
  cantidad int not null default 0 check (cantidad >= 0),
  fecha_vencimiento date not null,
  created_at timestamptz default now()
);

create index if not exists inventario_lotes_producto_presentacion_idx
  on inventario_lotes (producto_presentacion_id);
create index if not exists inventario_lotes_fecha_vencimiento_idx
  on inventario_lotes (fecha_vencimiento);

-- RLS
alter table inventario_lotes enable row level security;

drop policy if exists "Lotes visibles para autenticados" on inventario_lotes;
create policy "Lotes visibles para autenticados"
  on inventario_lotes for select to authenticated using (true);

drop policy if exists "Autenticados pueden insertar lotes" on inventario_lotes;
create policy "Autenticados pueden insertar lotes"
  on inventario_lotes for insert to authenticated with check (true);

drop policy if exists "Autenticados pueden actualizar lotes" on inventario_lotes;
create policy "Autenticados pueden actualizar lotes"
  on inventario_lotes for update to authenticated using (true);

drop policy if exists "Autenticados pueden eliminar lotes" on inventario_lotes;
create policy "Autenticados pueden eliminar lotes"
  on inventario_lotes for delete to authenticated using (true);

-- ==================== 011_pedidos_numero_orden ====================
-- Número de orden para cada pedido (ORD-0001, ORD-0002, ...)
create sequence if not exists pedidos_numero_orden_seq;

alter table pedidos add column if not exists numero_orden int;

-- Asignar números a pedidos existentes (por fecha de creación)
update pedidos p set numero_orden = sub.n from (
  select id, row_number() over (order by created_at) as n from pedidos
) sub where p.id = sub.id;

-- Secuencia para nuevos pedidos
select setval('pedidos_numero_orden_seq', coalesce((select max(numero_orden) from pedidos), 0) + 1);

alter table pedidos alter column numero_orden set default nextval('pedidos_numero_orden_seq');

-- ==================== 012_ventas_delete_policy ====================
-- Política DELETE en ventas para rechazar pedidos despachados
drop policy if exists "Autenticados pueden eliminar ventas" on ventas;
create policy "Autenticados pueden eliminar ventas"
  on ventas for delete to authenticated using (true);

-- ==================== 013_crear_pedido_transaccional ====================
-- Función para crear pedido + ítems en una sola transacción
-- Si falla cualquier insert, todo hace rollback
create or replace function crear_pedido_transaccional(
  p_nombre_cliente text,
  p_telefono text,
  p_direccion text,
  p_notas text,
  p_total decimal,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido_id uuid;
  v_item jsonb;
  v_subtotal decimal;
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

  insert into pedidos (
    nombre_cliente,
    telefono,
    direccion,
    notas,
    total,
    estado
  ) values (
    nullif(trim(p_nombre_cliente), ''),
    nullif(trim(p_telefono), ''),
    nullif(trim(p_direccion), ''),
    nullif(trim(coalesce(p_notas, '')), ''),
    p_total,
    'pendiente'
  )
  returning id into v_pedido_id;

  if v_pedido_id is null then
    raise exception 'No se pudo crear el pedido';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_subtotal := (v_item->>'precio_unitario')::decimal * (v_item->>'cantidad')::int;

    insert into pedido_items (
      pedido_id,
      producto_id,
      nombre,
      presentacion,
      cantidad,
      precio_unitario,
      subtotal
    ) values (
      v_pedido_id,
      (v_item->>'producto_id')::uuid,
      v_item->>'nombre',
      v_item->>'presentacion',
      (v_item->>'cantidad')::int,
      (v_item->>'precio_unitario')::decimal,
      v_subtotal
    );
  end loop;

  return v_pedido_id;
end;
$$;

-- Permitir ejecución (checkout es público, se llama con service_role)
grant execute on function crear_pedido_transaccional(text, text, text, text, decimal, jsonb) to service_role;
grant execute on function crear_pedido_transaccional(text, text, text, text, decimal, jsonb) to anon;

-- ==================== 014_marcar_despachado_transaccional ====================
-- Función para marcar pedido como despachado en una transacción atómica
-- Incluye: update pedido, upsert ventas, descuento inventario FIFO
-- Usa FOR UPDATE para evitar race conditions
create or replace function marcar_despachado_transaccional(p_pedido_id uuid, p_total decimal)
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
  -- Verificar que el pedido existe y no está ya despachado
  if not exists (select 1 from pedidos where id = p_pedido_id) then
    raise exception 'Pedido no encontrado';
  end if;

  if exists (select 1 from pedidos where id = p_pedido_id and estado = 'despachado') then
    raise exception 'El pedido ya está despachado';
  end if;

  -- 1. Actualizar estado del pedido
  update pedidos set estado = 'despachado' where id = p_pedido_id;

  -- 2. Upsert ventas
  insert into ventas (pedido_id, total, fecha_venta)
  values (p_pedido_id, p_total, v_hoy)
  on conflict (pedido_id) do update set total = p_total, fecha_venta = v_hoy;

  -- 3. Descontar inventario (FIFO) por cada ítem
  for v_item in
    select producto_id, presentacion, cantidad
    from pedido_items
    where pedido_id = p_pedido_id and producto_id is not null
  loop
    v_cant := v_item.cantidad;

    -- Obtener producto_presentacion_id
    select id into v_pp_id
    from producto_presentaciones
    where producto_id = v_item.producto_id and nombre = v_item.presentacion;

    if v_pp_id is null then
      continue; -- Sin presentación, saltar
    end if;

    -- Verificar stock disponible
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

    -- Descontar FIFO (bloqueando filas con FOR UPDATE)
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

grant execute on function marcar_despachado_transaccional(uuid, decimal) to service_role;
grant execute on function marcar_despachado_transaccional(uuid, decimal) to authenticated;

-- ==================== 015_dar_salida_lote_transaccional ====================
-- Función para dar salida a un lote con bloqueo (evita race condition)
-- Usa SELECT ... FOR UPDATE para bloquear la fila durante la operación
create or replace function dar_salida_lote_transaccional(p_lote_id uuid, p_cantidad int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cantidad_actual int;
  v_nueva_cantidad int;
begin
  if p_cantidad is null or p_cantidad < 1 then
    raise exception 'La cantidad debe ser mayor a 0';
  end if;

  -- Bloquear la fila para evitar race condition
  select cantidad into v_cantidad_actual
  from inventario_lotes
  where id = p_lote_id
  for update;

  if not found then
    raise exception 'Lote no encontrado';
  end if;

  if p_cantidad > v_cantidad_actual then
    raise exception 'Solo hay % unidades. No puedes dar salida a más.', v_cantidad_actual;
  end if;

  v_nueva_cantidad := v_cantidad_actual - p_cantidad;

  if v_nueva_cantidad = 0 then
    delete from inventario_lotes where id = p_lote_id;
  else
    update inventario_lotes set cantidad = v_nueva_cantidad where id = p_lote_id;
  end if;
end;
$$;

grant execute on function dar_salida_lote_transaccional(uuid, int) to service_role;
grant execute on function dar_salida_lote_transaccional(uuid, int) to authenticated;

-- ==================== 016_clientes ====================
-- Tabla clientes (se crea/actualiza al registrar un pedido)
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text not null,
  direccion text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists clientes_telefono_idx on clientes (telefono);

-- Tabla interna: acceso solo mediante service role / server actions
alter table clientes enable row level security;

-- Vincular pedidos a clientes
alter table pedidos add column if not exists cliente_id uuid references clientes(id) on delete set null;

create index if not exists pedidos_cliente_id_idx on pedidos (cliente_id);

-- ==================== 017_pedido_con_cliente ====================
-- Actualizar función para crear cliente y vincular pedido
create or replace function crear_pedido_transaccional(
  p_nombre_cliente text,
  p_telefono text,
  p_direccion text,
  p_notas text,
  p_total decimal,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido_id uuid;
  v_cliente_id uuid;
  v_item jsonb;
  v_subtotal decimal;
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

  -- Crear o actualizar cliente por teléfono
  insert into clientes (nombre, telefono, direccion, updated_at)
  values (
    nullif(trim(p_nombre_cliente), ''),
    nullif(trim(p_telefono), ''),
    nullif(trim(p_direccion), ''),
    now()
  )
  on conflict (telefono) do update set
    nombre = excluded.nombre,
    direccion = excluded.direccion,
    updated_at = now()
  returning id into v_cliente_id;

  if v_cliente_id is null then
    select id into v_cliente_id from clientes where telefono = nullif(trim(p_telefono), '') limit 1;
  end if;

  insert into pedidos (
    nombre_cliente,
    telefono,
    direccion,
    notas,
    total,
    estado,
    cliente_id
  ) values (
    nullif(trim(p_nombre_cliente), ''),
    nullif(trim(p_telefono), ''),
    nullif(trim(p_direccion), ''),
    nullif(trim(coalesce(p_notas, '')), ''),
    p_total,
    'pendiente',
    v_cliente_id
  )
  returning id into v_pedido_id;

  if v_pedido_id is null then
    raise exception 'No se pudo crear el pedido';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_subtotal := (v_item->>'precio_unitario')::decimal * (v_item->>'cantidad')::int;

    insert into pedido_items (
      pedido_id,
      producto_id,
      nombre,
      presentacion,
      cantidad,
      precio_unitario,
      subtotal
    ) values (
      v_pedido_id,
      (v_item->>'producto_id')::uuid,
      v_item->>'nombre',
      v_item->>'presentacion',
      (v_item->>'cantidad')::int,
      (v_item->>'precio_unitario')::decimal,
      v_subtotal
    );
  end loop;

  return v_pedido_id;
end;
$$;

-- ==================== 018_ofertas ====================
-- Ofertas: porcentaje de descuento en productos y presentaciones
alter table productos add column if not exists porcentaje_oferta int default null
  check (porcentaje_oferta is null or (porcentaje_oferta >= 1 and porcentaje_oferta <= 99));

alter table producto_presentaciones add column if not exists porcentaje_oferta int default null
  check (porcentaje_oferta is null or (porcentaje_oferta >= 1 and porcentaje_oferta <= 99));

create index if not exists productos_oferta_idx on productos (porcentaje_oferta) where porcentaje_oferta is not null;
create index if not exists producto_presentaciones_oferta_idx on producto_presentaciones (porcentaje_oferta) where porcentaje_oferta is not null;

-- ==================== 019_lote_codigo_consecutivo ====================
-- Código consecutivo para lotes: fecha ingreso + cantidad + fecha vencimiento
-- Formato: ING-YYYYMMDD-SEQ-CANT-VENC-YYYYMMDD
create sequence if not exists inventario_lotes_codigo_seq;

-- Función para generar el código al insertar (trigger)
create or replace function generar_codigo_lote()
returns trigger
language plpgsql
as $$
declare
  v_ingreso text;
  v_venc text;
  v_seq int;
begin
  v_ingreso := to_char(now(), 'YYYYMMDD');
  v_venc := replace(new.fecha_vencimiento::text, '-', '');
  v_seq := nextval('inventario_lotes_codigo_seq');
  new.lote := 'ING-' || v_ingreso || '-' || lpad(v_seq::text, 4, '0') || '-' || new.cantidad || '-VENC-' || v_venc;
  return new;
end;
$$;

drop trigger if exists trg_generar_codigo_lote on inventario_lotes;
create trigger trg_generar_codigo_lote
  before insert on inventario_lotes
  for each row
  execute function generar_codigo_lote();

-- ==================== 020_iva_productos ====================
-- IVA 19% opcional por producto
-- aplica_iva: si true, se suma 19% al precio base. El admin decide por producto.
-- Por defecto true (lo legal) pero puede desactivarse si el producto está exento.

alter table productos
  add column if not exists aplica_iva boolean not null default true;

comment on column productos.aplica_iva is 'Si true, se cobra IVA 19% sobre el precio. Por defecto true.';

-- En presentaciones: nullable = hereda del producto
alter table producto_presentaciones
  add column if not exists aplica_iva boolean;

comment on column producto_presentaciones.aplica_iva is 'Si null, hereda de productos.aplica_iva. Si no null, override por presentación.';

-- ==================== 021_iva_pedido_items ====================
-- Guardar si el ítem tuvo IVA (para factura)
alter table pedido_items
  add column if not exists aplica_iva boolean not null default false;

comment on column pedido_items.aplica_iva is 'Si true, el precio_unitario incluye IVA 19%. Para desglose en factura.';

-- Actualizar función para aceptar aplica_iva por ítem
create or replace function crear_pedido_transaccional(
  p_nombre_cliente text,
  p_telefono text,
  p_direccion text,
  p_notas text,
  p_total decimal,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido_id uuid;
  v_cliente_id uuid;
  v_item jsonb;
  v_subtotal decimal;
  v_aplica_iva boolean;
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

  -- Crear o actualizar cliente por teléfono
  insert into clientes (nombre, telefono, direccion, updated_at)
  values (
    nullif(trim(p_nombre_cliente), ''),
    nullif(trim(p_telefono), ''),
    nullif(trim(p_direccion), ''),
    now()
  )
  on conflict (telefono) do update set
    nombre = excluded.nombre,
    direccion = excluded.direccion,
    updated_at = now()
  returning id into v_cliente_id;

  if v_cliente_id is null then
    select id into v_cliente_id from clientes where telefono = nullif(trim(p_telefono), '') limit 1;
  end if;

  insert into pedidos (
    nombre_cliente,
    telefono,
    direccion,
    notas,
    total,
    estado,
    cliente_id
  ) values (
    nullif(trim(p_nombre_cliente), ''),
    nullif(trim(p_telefono), ''),
    nullif(trim(p_direccion), ''),
    nullif(trim(coalesce(p_notas, '')), ''),
    p_total,
    'pendiente',
    v_cliente_id
  )
  returning id into v_pedido_id;

  if v_pedido_id is null then
    raise exception 'No se pudo crear el pedido';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_subtotal := (v_item->>'precio_unitario')::decimal * (v_item->>'cantidad')::int;
    v_aplica_iva := coalesce((v_item->>'aplica_iva')::boolean, false);

    insert into pedido_items (
      pedido_id,
      producto_id,
      nombre,
      presentacion,
      cantidad,
      precio_unitario,
      subtotal,
      aplica_iva
    ) values (
      v_pedido_id,
      (v_item->>'producto_id')::uuid,
      v_item->>'nombre',
      v_item->>'presentacion',
      (v_item->>'cantidad')::int,
      (v_item->>'precio_unitario')::decimal,
      v_subtotal,
      v_aplica_iva
    );
  end loop;

  return v_pedido_id;
end;
$$;

-- ==================== 022_token_factura ====================
-- Token único para compartir factura de forma segura
-- Sin el token, /factura/[id] no muestra la factura
alter table pedidos add column if not exists token_factura text unique;

-- Generar tokens para pedidos existentes
update pedidos
set token_factura = encode(gen_random_bytes(24), 'hex')
where token_factura is null;

-- Índice para búsqueda por token
create unique index if not exists pedidos_token_factura_idx on pedidos (token_factura) where token_factura is not null;

-- ==================== 023_pedido_token_factura ====================
-- Incluir token_factura al crear pedido
create or replace function crear_pedido_transaccional(
  p_nombre_cliente text,
  p_telefono text,
  p_direccion text,
  p_notas text,
  p_total decimal,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido_id uuid;
  v_cliente_id uuid;
  v_item jsonb;
  v_subtotal decimal;
  v_aplica_iva boolean;
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

  -- Crear o actualizar cliente por teléfono
  insert into clientes (nombre, telefono, direccion, updated_at)
  values (
    nullif(trim(p_nombre_cliente), ''),
    nullif(trim(p_telefono), ''),
    nullif(trim(p_direccion), ''),
    now()
  )
  on conflict (telefono) do update set
    nombre = excluded.nombre,
    direccion = excluded.direccion,
    updated_at = now()
  returning id into v_cliente_id;

  if v_cliente_id is null then
    select id into v_cliente_id from clientes where telefono = nullif(trim(p_telefono), '') limit 1;
  end if;

  insert into pedidos (
    nombre_cliente,
    telefono,
    direccion,
    notas,
    total,
    estado,
    cliente_id,
    token_factura
  ) values (
    nullif(trim(p_nombre_cliente), ''),
    nullif(trim(p_telefono), ''),
    nullif(trim(p_direccion), ''),
    nullif(trim(coalesce(p_notas, '')), ''),
    p_total,
    'pendiente',
    v_cliente_id,
    encode(gen_random_bytes(24), 'hex')
  )
  returning id into v_pedido_id;

  if v_pedido_id is null then
    raise exception 'No se pudo crear el pedido';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_subtotal := (v_item->>'precio_unitario')::decimal * (v_item->>'cantidad')::int;
    v_aplica_iva := coalesce((v_item->>'aplica_iva')::boolean, false);

    insert into pedido_items (
      pedido_id,
      producto_id,
      nombre,
      presentacion,
      cantidad,
      precio_unitario,
      subtotal,
      aplica_iva
    ) values (
      v_pedido_id,
      (v_item->>'producto_id')::uuid,
      v_item->>'nombre',
      v_item->>'presentacion',
      (v_item->>'cantidad')::int,
      (v_item->>'precio_unitario')::decimal,
      v_subtotal,
      v_aplica_iva
    );
  end loop;

  return v_pedido_id;
end;
$$;

-- ==================== 024_suscriptores ====================
-- Tabla suscriptores para newsletter
create table if not exists suscriptores (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz default now()
);

create unique index if not exists suscriptores_email_idx on suscriptores (lower(email));

-- Tabla interna: acceso solo mediante service role / server actions
alter table suscriptores enable row level security;

-- ==================== 025_cupones ====================
-- Tabla cupones: código único, porcentaje descuento, uso único
create table if not exists cupones (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  porcentaje smallint not null check (porcentaje >= 1 and porcentaje <= 99),
  usado boolean default false,
  pedido_id uuid references pedidos(id),
  valido_hasta date,
  created_at timestamptz default now()
);

create unique index if not exists cupones_codigo_upper_idx on cupones (upper(trim(codigo)));

-- Tabla interna: acceso solo mediante service role / RPC
alter table cupones enable row level security;

-- ==================== 026_crear_pedido_con_cupon ====================
-- Extender crear_pedido_transaccional para aceptar cupón opcional
create or replace function crear_pedido_transaccional(
  p_nombre_cliente text,
  p_telefono text,
  p_direccion text,
  p_notas text,
  p_total decimal,
  p_items jsonb,
  p_cupon_codigo text default null
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

  v_total_final := p_total;

  -- Validar y aplicar cupón si se proporciona
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

  -- Crear o actualizar cliente por teléfono
  insert into clientes (nombre, telefono, direccion, updated_at)
  values (
    nullif(trim(p_nombre_cliente), ''),
    nullif(trim(p_telefono), ''),
    nullif(trim(p_direccion), ''),
    now()
  )
  on conflict (telefono) do update set
    nombre = excluded.nombre,
    direccion = excluded.direccion,
    updated_at = now()
  returning id into v_cliente_id;

  if v_cliente_id is null then
    select id into v_cliente_id from clientes where telefono = nullif(trim(p_telefono), '') limit 1;
  end if;

  insert into pedidos (
    nombre_cliente,
    telefono,
    direccion,
    notas,
    total,
    estado,
    cliente_id,
    token_factura
  ) values (
    nullif(trim(p_nombre_cliente), ''),
    nullif(trim(p_telefono), ''),
    nullif(trim(p_direccion), ''),
    nullif(trim(coalesce(p_notas, '')), ''),
    v_total_final,
    'pendiente',
    v_cliente_id,
    encode(gen_random_bytes(24), 'hex')
  )
  returning id into v_pedido_id;

  if v_pedido_id is null then
    raise exception 'No se pudo crear el pedido';
  end if;

  -- Marcar cupón como usado
  if v_cupon_id is not null then
    update cupones set usado = true, pedido_id = v_pedido_id where id = v_cupon_id;
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_subtotal := (v_item->>'precio_unitario')::decimal * (v_item->>'cantidad')::int;
    v_aplica_iva := coalesce((v_item->>'aplica_iva')::boolean, false);

    insert into pedido_items (
      pedido_id,
      producto_id,
      nombre,
      presentacion,
      cantidad,
      precio_unitario,
      subtotal,
      aplica_iva
    ) values (
      v_pedido_id,
      (v_item->>'producto_id')::uuid,
      v_item->>'nombre',
      v_item->>'presentacion',
      (v_item->>'cantidad')::int,
      (v_item->>'precio_unitario')::decimal,
      v_subtotal,
      v_aplica_iva
    );
  end loop;

  return v_pedido_id;
end;
$$;

-- ==================== 027_configuracion ====================
-- Tabla configuracion: una sola fila con datos de la tienda
create table if not exists configuracion (
  id smallint primary key default 1 check (id = 1),
  nombre_tienda text default 'Pet Market Animal',
  telefono text,
  whatsapp text,
  email text,
  direccion text,
  facebook_url text,
  instagram_url text,
  updated_at timestamptz default now()
);

-- Insertar fila por defecto si no existe
insert into configuracion (id, nombre_tienda, telefono, whatsapp, email, direccion, facebook_url, instagram_url)
values (1, 'Pet Market Animal', '311 234 5678', null, 'info@petmarket.com', 'Barrancabermeja, Colombia', 'https://facebook.com', 'https://instagram.com')
on conflict (id) do nothing;

-- Tabla interna: acceso solo mediante service role / server actions
alter table configuracion enable row level security;

-- ==================== 028_vendedores_perfiles ====================
-- Tabla vendedores: creados por el admin, ganan % de comisión
create table if not exists vendedores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  nombre text not null,
  email text not null,
  porcentaje_comision decimal(5,2) not null default 0 check (porcentaje_comision >= 0 and porcentaje_comision <= 100),
  activo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabla perfiles: vincula auth.users con rol (admin/vendedor)
create table if not exists perfiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  rol text not null check (rol in ('admin', 'vendedor')),
  vendedor_id uuid references vendedores(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists perfiles_user_id_idx on perfiles (user_id);
create index if not exists perfiles_rol_idx on perfiles (rol);
create index if not exists vendedores_user_id_idx on vendedores (user_id);

-- Tablas internas: acceso solo mediante service role / server actions
alter table vendedores enable row level security;
alter table perfiles enable row level security;

-- Agregar vendedor_id a pedidos y clientes
alter table pedidos add column if not exists vendedor_id uuid references vendedores(id) on delete set null;
alter table clientes add column if not exists vendedor_id uuid references vendedores(id) on delete set null;

create index if not exists pedidos_vendedor_id_idx on pedidos (vendedor_id);
create index if not exists clientes_vendedor_id_idx on clientes (vendedor_id);

-- ==================== 029_crear_pedido_con_vendedor ====================
-- Extender crear_pedido_transaccional para aceptar vendedor_id opcional
create or replace function crear_pedido_transaccional(
  p_nombre_cliente text,
  p_telefono text,
  p_direccion text,
  p_notas text,
  p_total decimal,
  p_items jsonb,
  p_cupon_codigo text default null,
  p_vendedor_id uuid default null
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

  v_total_final := p_total;

  -- Validar y aplicar cupón si se proporciona
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

  -- Crear o actualizar cliente por teléfono
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

  -- Marcar cupón como usado
  if v_cupon_id is not null then
    update cupones set usado = true, pedido_id = v_pedido_id where id = v_cupon_id;
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_subtotal := (v_item->>'precio_unitario')::decimal * (v_item->>'cantidad')::int;
    v_aplica_iva := coalesce((v_item->>'aplica_iva')::boolean, false);

    insert into pedido_items (
      pedido_id,
      producto_id,
      nombre,
      presentacion,
      cantidad,
      precio_unitario,
      subtotal,
      aplica_iva
    ) values (
      v_pedido_id,
      (v_item->>'producto_id')::uuid,
      v_item->>'nombre',
      v_item->>'presentacion',
      (v_item->>'cantidad')::int,
      (v_item->>'precio_unitario')::decimal,
      v_subtotal,
      v_aplica_iva
    );
  end loop;

  return v_pedido_id;
end;
$$;

-- ==================== 030_domiciliarios ====================
-- Tabla domiciliarios: creados por el admin
create table if not exists domiciliarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  nombre text not null,
  placa text not null unique,
  telefono text not null,
  activo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists domiciliarios_user_id_idx on domiciliarios (user_id);
create index if not exists domiciliarios_placa_idx on domiciliarios (placa);

-- Tabla interna: acceso solo mediante service role / server actions
alter table domiciliarios enable row level security;

-- Extender perfiles para rol domiciliario
alter table perfiles drop constraint if exists perfiles_rol_check;
alter table perfiles add constraint perfiles_rol_check
  check (rol in ('admin', 'vendedor', 'domiciliario'));

alter table perfiles add column if not exists domiciliario_id uuid references domiciliarios(id) on delete set null;
create index if not exists perfiles_domiciliario_id_idx on perfiles (domiciliario_id);

-- Agregar domiciliario_id y entrega_foto_url a pedidos
alter table pedidos add column if not exists domiciliario_id uuid references domiciliarios(id) on delete set null;
alter table pedidos add column if not exists entrega_foto_url text;

create index if not exists pedidos_domiciliario_id_idx on pedidos (domiciliario_id);

-- Bucket para fotos de entrega
insert into storage.buckets (id, name, public)
values ('entrega-fotos', 'entrega-fotos', true)
on conflict (id) do nothing;

drop policy if exists "Fotos entrega visibles para todos" on storage.objects;
create policy "Fotos entrega visibles para todos"
  on storage.objects for select
  using (bucket_id = 'entrega-fotos');

drop policy if exists "Autenticados pueden subir fotos entrega" on storage.objects;
create policy "Autenticados pueden subir fotos entrega"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'entrega-fotos');

-- ==================== 031_marcar_despachado_con_domiciliario ====================
-- Extender marcar_despachado_transaccional para aceptar domiciliario_id
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

  -- 1. Actualizar estado y domiciliario del pedido
  update pedidos
  set estado = 'despachado',
      domiciliario_id = case when p_domiciliario_id is not null then p_domiciliario_id else domiciliario_id end
  where id = p_pedido_id;

  -- 2. Upsert ventas
  insert into ventas (pedido_id, total, fecha_venta)
  values (p_pedido_id, p_total, v_hoy)
  on conflict (pedido_id) do update set total = p_total, fecha_venta = v_hoy;

  -- 3. Descontar inventario (FIFO)
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
      continue;
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

grant execute on function marcar_despachado_transaccional(uuid, decimal, uuid) to service_role;
grant execute on function marcar_despachado_transaccional(uuid, decimal, uuid) to authenticated;

-- ==================== 032_iva_porcentaje ====================
-- Soportar IVA configurable por producto/presentacion (0%, 5%, 19%)
alter table productos
  add column if not exists iva_porcentaje smallint;

update productos
set iva_porcentaje = case when coalesce(aplica_iva, true) then 19 else 0 end
where iva_porcentaje is null;

alter table productos
  alter column iva_porcentaje set default 19;

alter table productos
  alter column iva_porcentaje set not null;

alter table productos
  drop constraint if exists productos_iva_porcentaje_check;

alter table productos
  add constraint productos_iva_porcentaje_check
  check (iva_porcentaje in (0, 5, 19));

comment on column productos.iva_porcentaje is 'Porcentaje de IVA del producto. Valores permitidos: 0, 5, 19.';

alter table producto_presentaciones
  add column if not exists iva_porcentaje smallint;

update producto_presentaciones
set iva_porcentaje = case
  when aplica_iva is true then 19
  when aplica_iva is false then 0
  else null
end
where iva_porcentaje is null;

alter table producto_presentaciones
  drop constraint if exists producto_presentaciones_iva_porcentaje_check;

alter table producto_presentaciones
  add constraint producto_presentaciones_iva_porcentaje_check
  check (iva_porcentaje in (0, 5, 19) or iva_porcentaje is null);

comment on column producto_presentaciones.iva_porcentaje is 'Porcentaje de IVA de la presentación. Si es null, hereda de productos.iva_porcentaje.';

alter table pedido_items
  add column if not exists iva_porcentaje smallint;

update pedido_items
set iva_porcentaje = case when coalesce(aplica_iva, false) then 19 else 0 end
where iva_porcentaje is null;

alter table pedido_items
  alter column iva_porcentaje set default 0;

alter table pedido_items
  alter column iva_porcentaje set not null;

alter table pedido_items
  drop constraint if exists pedido_items_iva_porcentaje_check;

alter table pedido_items
  add constraint pedido_items_iva_porcentaje_check
  check (iva_porcentaje in (0, 5, 19));

comment on column pedido_items.iva_porcentaje is 'Porcentaje de IVA incluido en el precio_unitario del item. Valores permitidos: 0, 5, 19.';

drop function if exists crear_pedido_transaccional(text, text, text, text, decimal, jsonb);
drop function if exists crear_pedido_transaccional(text, text, text, text, decimal, jsonb, text);
drop function if exists crear_pedido_transaccional(text, text, text, text, decimal, jsonb, text, uuid);

create or replace function crear_pedido_transaccional(
  p_nombre_cliente text,
  p_telefono text,
  p_direccion text,
  p_notas text,
  p_total decimal,
  p_items jsonb,
  p_cupon_codigo text default null,
  p_vendedor_id uuid default null
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

-- ==================== 033_producto_subcategorias ====================
-- Permite que un producto pertenezca a varias subcategorias
create table if not exists producto_subcategorias (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id) on delete cascade,
  subcategoria_id uuid not null references subcategorias(id) on delete cascade,
  created_at timestamptz default now(),
  unique(producto_id, subcategoria_id)
);

create index if not exists producto_subcategorias_producto_id_idx
  on producto_subcategorias (producto_id);

create index if not exists producto_subcategorias_subcategoria_id_idx
  on producto_subcategorias (subcategoria_id);

-- Migrar la subcategoria principal actual a la tabla pivote
insert into producto_subcategorias (producto_id, subcategoria_id)
select id, subcategoria_id
from productos
where subcategoria_id is not null
on conflict (producto_id, subcategoria_id) do nothing;

alter table producto_subcategorias enable row level security;

drop policy if exists "Relaciones producto-subcategoria visibles para todos" on producto_subcategorias;
create policy "Relaciones producto-subcategoria visibles para todos"
  on producto_subcategorias for select using (true);

drop policy if exists "Autenticados pueden insertar relaciones producto-subcategoria" on producto_subcategorias;
create policy "Autenticados pueden insertar relaciones producto-subcategoria"
  on producto_subcategorias for insert to authenticated with check (true);

drop policy if exists "Autenticados pueden actualizar relaciones producto-subcategoria" on producto_subcategorias;
create policy "Autenticados pueden actualizar relaciones producto-subcategoria"
  on producto_subcategorias for update to authenticated using (true);

drop policy if exists "Autenticados pueden eliminar relaciones producto-subcategoria" on producto_subcategorias;
create policy "Autenticados pueden eliminar relaciones producto-subcategoria"
  on producto_subcategorias for delete to authenticated using (true);

-- ==================== 20260905173506_add_tipos_producto ====================
create table if not exists tipos_producto (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  subcategoria_id uuid not null references subcategorias(id) on delete cascade,
  created_at timestamptz default now(),
  unique(nombre, subcategoria_id)
);

create index if not exists tipos_producto_subcategoria_id_idx on tipos_producto (subcategoria_id);

alter table tipos_producto enable row level security;

drop policy if exists "Tipos de producto visibles para todos" on tipos_producto;
create policy "Tipos de producto visibles para todos"
  on tipos_producto for select
  using (true);

drop policy if exists "Autenticados pueden insertar tipos de producto" on tipos_producto;
create policy "Autenticados pueden insertar tipos de producto"
  on tipos_producto for insert
  to authenticated
  with check (true);

drop policy if exists "Autenticados pueden actualizar tipos de producto" on tipos_producto;
create policy "Autenticados pueden actualizar tipos de producto"
  on tipos_producto for update
  to authenticated
  using (true);

drop policy if exists "Autenticados pueden eliminar tipos de producto" on tipos_producto;
create policy "Autenticados pueden eliminar tipos de producto"
  on tipos_producto for delete
  to authenticated
  using (true);

create or replace function crear_tipo_general_subcategoria()
returns trigger
language plpgsql
as $$
begin
  insert into tipos_producto (nombre, subcategoria_id)
  values ('General', new.id)
  on conflict (nombre, subcategoria_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_subcategorias_tipo_general on subcategorias;
create trigger trg_subcategorias_tipo_general
after insert on subcategorias
for each row
execute function crear_tipo_general_subcategoria();

insert into tipos_producto (nombre, subcategoria_id)
select 'General', s.id
from subcategorias s
where not exists (
  select 1
  from tipos_producto tp
  where tp.subcategoria_id = s.id
    and tp.nombre = 'General'
);

alter table productos
  add column if not exists tipo_producto_id uuid references tipos_producto(id);

update productos p
set tipo_producto_id = tp.id
from tipos_producto tp
where tp.subcategoria_id = p.subcategoria_id
  and tp.nombre = 'General'
  and p.tipo_producto_id is null;

alter table productos
  alter column tipo_producto_id set not null;

create index if not exists productos_tipo_producto_id_idx on productos (tipo_producto_id);

-- ==================== 20260905182821_metodo_pago_pedidos ====================
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

