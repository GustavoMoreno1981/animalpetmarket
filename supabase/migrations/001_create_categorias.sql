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
