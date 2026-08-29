-- Tabla configuracion: una sola fila con datos de la tienda
create table if not exists configuracion (
  id smallint primary key default 1 check (id = 1),
  nombre_tienda text default 'Pet Market Animal',
  telefono text,
  whatsapp text,
  email text,
  direccion text,
  facebook_url text,
  instagram_url text,
  updated_at timestamptz default now()
);

-- Insertar fila por defecto si no existe
insert into configuracion (id, nombre_tienda, telefono, whatsapp, email, direccion, facebook_url, instagram_url)
values (1, 'Pet Market Animal', '311 234 5678', null, 'info@petmarket.com', 'Barrancabermeja, Colombia', 'https://facebook.com', 'https://instagram.com')
on conflict (id) do nothing;

-- Tabla interna: acceso solo mediante service role / server actions
alter table configuracion enable row level security;
