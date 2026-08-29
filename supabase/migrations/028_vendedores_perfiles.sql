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
