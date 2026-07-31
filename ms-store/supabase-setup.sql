-- EJECUTAR EN SUPABASE → SQL Editor (una sola vez)
-- 1) Tabla de productos
create table if not exists public.productos (
  id text primary key,
  nombre text not null,
  descripcion text default '',
  descripcion_larga text default '',
  precio numeric not null default 0,
  categoria text not null default 'cargadores',
  img text default 'img/placeholder.svg',
  imagenes jsonb default '[]'::jsonb,
  visible boolean default true,
  agotado boolean default false,
  creado_en timestamptz default now()
);
alter table public.productos enable row level security;
drop policy if exists "lectura publica productos" on public.productos;
create policy "lectura publica productos" on public.productos for select using (true);
drop policy if exists "escritura admin productos" on public.productos;
create policy "escritura admin productos" on public.productos for all to authenticated using (true) with check (true);

-- 2) Tabla de pedidos
create table if not exists public.pedidos (
  id text primary key,
  fecha timestamptz default now(),
  nombre text not null,
  telefono text not null,
  direccion text not null,
  notas text default '',
  items jsonb not null default '[]'::jsonb,
  total numeric not null default 0
);
alter table public.pedidos enable row level security;
drop policy if exists "insertar pedidos publico" on public.pedidos;
create policy "insertar pedidos publico" on public.pedidos for insert to anon with check (true);
drop policy if exists "leer admin pedidos" on public.pedidos;
create policy "leer admin pedidos" on public.pedidos for select to authenticated using (true);
drop policy if exists "borrar admin pedidos" on public.pedidos;
create policy "borrar admin pedidos" on public.pedidos for delete to authenticated using (true);

-- 3) Tabla de comentarios
create table if not exists public.comentarios (
  id bigint generated always as identity primary key,
  producto_id text not null,
  nombre text not null default 'Anónimo',
  texto text not null,
  estrellas int not null default 5,
  fecha timestamptz default now()
);
alter table public.comentarios enable row level security;
drop policy if exists "leer comentarios publico" on public.comentarios;
create policy "leer comentarios publico" on public.comentarios for select using (true);
drop policy if exists "insertar comentarios publico" on public.comentarios;
create policy "insertar comentarios publico" on public.comentarios for insert to anon with check (true);

-- 4) Bucket de imágenes (público para leer, solo admin sube/borra)
insert into storage.buckets (id, name, public) values ('imagenes', 'imagenes', true)
on conflict (id) do nothing;
drop policy if exists "leer imagenes publico" on storage.objects;
create policy "leer imagenes publico" on storage.objects for select using (bucket_id = 'imagenes');
drop policy if exists "subir imagenes admin" on storage.objects;
create policy "subir imagenes admin" on storage.objects for insert to authenticated with check (bucket_id = 'imagenes');
drop policy if exists "borrar imagenes admin" on storage.objects;
create policy "borrar imagenes admin" on storage.objects for delete to authenticated using (bucket_id = 'imagenes');
