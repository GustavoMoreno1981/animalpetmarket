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
