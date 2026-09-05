create table if not exists tipos_producto (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  subcategoria_id uuid not null references subcategorias(id) on delete cascade,
  created_at timestamptz default now(),
  unique(nombre, subcategoria_id)
);

create index if not exists tipos_producto_subcategoria_id_idx on tipos_producto (subcategoria_id);

alter table tipos_producto enable row level security;

drop policy if exists "Tipos de producto visibles para todos" on tipos_producto;
create policy "Tipos de producto visibles para todos"
  on tipos_producto for select
  using (true);

drop policy if exists "Autenticados pueden insertar tipos de producto" on tipos_producto;
create policy "Autenticados pueden insertar tipos de producto"
  on tipos_producto for insert
  to authenticated
  with check (true);

drop policy if exists "Autenticados pueden actualizar tipos de producto" on tipos_producto;
create policy "Autenticados pueden actualizar tipos de producto"
  on tipos_producto for update
  to authenticated
  using (true);

drop policy if exists "Autenticados pueden eliminar tipos de producto" on tipos_producto;
create policy "Autenticados pueden eliminar tipos de producto"
  on tipos_producto for delete
  to authenticated
  using (true);

create or replace function crear_tipo_general_subcategoria()
returns trigger
language plpgsql
as $$
begin
  insert into tipos_producto (nombre, subcategoria_id)
  values ('General', new.id)
  on conflict (nombre, subcategoria_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_subcategorias_tipo_general on subcategorias;
create trigger trg_subcategorias_tipo_general
after insert on subcategorias
for each row
execute function crear_tipo_general_subcategoria();

insert into tipos_producto (nombre, subcategoria_id)
select 'General', s.id
from subcategorias s
where not exists (
  select 1
  from tipos_producto tp
  where tp.subcategoria_id = s.id
    and tp.nombre = 'General'
);

alter table productos
  add column if not exists tipo_producto_id uuid references tipos_producto(id);

update productos p
set tipo_producto_id = tp.id
from tipos_producto tp
where tp.subcategoria_id = p.subcategoria_id
  and tp.nombre = 'General'
  and p.tipo_producto_id is null;

alter table productos
  alter column tipo_producto_id set not null;

create index if not exists productos_tipo_producto_id_idx on productos (tipo_producto_id);
