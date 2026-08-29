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
