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
