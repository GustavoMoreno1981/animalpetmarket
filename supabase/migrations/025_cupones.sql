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
