-- Tabla suscriptores para newsletter
create table if not exists suscriptores (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz default now()
);

create unique index if not exists suscriptores_email_idx on suscriptores (lower(email));

-- Tabla interna: acceso solo mediante service role / server actions
alter table suscriptores enable row level security;
