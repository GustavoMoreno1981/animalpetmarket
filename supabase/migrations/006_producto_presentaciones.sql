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
