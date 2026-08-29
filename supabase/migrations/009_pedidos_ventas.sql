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
