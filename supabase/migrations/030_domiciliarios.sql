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
