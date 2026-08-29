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
