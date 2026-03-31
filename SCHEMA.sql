-- ============================================================
-- STOCKIA v3.0 — SCHEMA MULTI-EMPRESA
-- Ejecutar completo en Supabase SQL Editor
-- ============================================================

-- ── 1. EXTENSIONES ──────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── 2. TABLA: empresas ──────────────────────────────────────
create table if not exists public.empresas (
  id          uuid primary key default uuid_generate_v4(),
  nombre      text not null,
  slug        text unique not null,           -- identificador URL amigable
  logo_url    text,
  color       text default '#1e3a8a',         -- color acento de la empresa
  activa      boolean default true,
  -- Nombre personalizado del módulo de artículos
  modulo_articulos_nombre text default 'Artículos',
  modulo_articulos_icono  text default '📦',
  modulo_articulos_placeholder_nombre text default 'Ej: Camisa manga larga',
  modulo_articulos_placeholder_desc   text default 'Descripción del artículo',
  modulo_articulos_placeholder_codigo text default 'Ej: ART-001',
  -- Módulos habilitados (JSON)
  modulos_habilitados jsonb default '{"articulos": true, "clientes": true, "ventas": true, "proveedores": false}'::jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── 3. TABLA: global_admins ──────────────────────────────────
-- Admins globales que controlan todo el sistema
create table if not exists public.global_admins (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null,
  email       text not null,
  activo      boolean default true,
  created_at  timestamptz default now()
);

-- ── 4. TABLA: profiles (usuarios por empresa) ────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  empresa_id  uuid references public.empresas(id) on delete cascade,
  nombre      text not null,
  email       text not null,
  rol         text not null default 'operador',  -- 'admin_empresa' | 'operador'
  activo      boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── 5. TABLA: articulos ───────────────────────────────────────
create table if not exists public.articulos (
  id          uuid primary key default uuid_generate_v4(),
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  nombre      text not null,
  descripcion text,
  codigo      text,
  categoria   text,
  precio      numeric(12,2) default 0,
  stock       integer default 0,
  stock_minimo integer default 0,
  activo      boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── 6. TABLA: clientes ────────────────────────────────────────
create table if not exists public.clientes (
  id          uuid primary key default uuid_generate_v4(),
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  nombre      text not null,
  telefono    text,
  email       text,
  direccion   text,
  dni         text,
  notas       text,
  activo      boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── 7. TABLA: ventas ──────────────────────────────────────────
create table if not exists public.ventas (
  id              uuid primary key default uuid_generate_v4(),
  empresa_id      uuid not null references public.empresas(id) on delete cascade,
  cliente_id      uuid references public.clientes(id) on delete set null,
  vendedor_id     uuid references public.profiles(id) on delete set null,
  articulo_id     uuid references public.articulos(id) on delete set null,
  articulo_nombre text,                        -- snapshot del nombre
  cantidad        integer default 1,
  precio_unitario numeric(12,2) default 0,
  total           numeric(12,2) default 0,
  forma_pago      text default 'efectivo',     -- efectivo | transferencia | tarjeta | cuenta_corriente
  estado          text default 'pendiente',    -- pendiente | pagado | parcial
  pagado          numeric(12,2) default 0,
  saldo           numeric(12,2) default 0,
  -- Cuotas
  es_cuotas       boolean default false,
  cantidad_cuotas integer default 1,
  recargo_pct     numeric(5,2) default 0,
  mora_pct        numeric(5,2) default 0,
  notas           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── 8. TABLA: proveedores (módulo futuro) ────────────────────
create table if not exists public.proveedores (
  id          uuid primary key default uuid_generate_v4(),
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  nombre      text not null,
  telefono    text,
  email       text,
  direccion   text,
  cuit        text,
  notas       text,
  activo      boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── 9. ÍNDICES ────────────────────────────────────────────────
create index if not exists idx_profiles_empresa    on public.profiles(empresa_id);
create index if not exists idx_articulos_empresa   on public.articulos(empresa_id);
create index if not exists idx_clientes_empresa    on public.clientes(empresa_id);
create index if not exists idx_ventas_empresa      on public.ventas(empresa_id);
create index if not exists idx_ventas_cliente      on public.ventas(cliente_id);
create index if not exists idx_proveedores_empresa on public.proveedores(empresa_id);

-- ── 10. ROW LEVEL SECURITY ────────────────────────────────────
alter table public.empresas          enable row level security;
alter table public.global_admins     enable row level security;
alter table public.profiles          enable row level security;
alter table public.articulos         enable row level security;
alter table public.clientes          enable row level security;
alter table public.ventas            enable row level security;
alter table public.proveedores       enable row level security;

-- ── FUNCIÓN HELPER: obtener empresa_id del usuario actual ────
create or replace function public.mi_empresa_id()
returns uuid language sql security definer stable as $$
  select empresa_id from public.profiles where id = auth.uid()
$$;

-- ── FUNCIÓN HELPER: verificar si es admin global ─────────────
create or replace function public.es_admin_global()
returns boolean language sql security definer stable as $$
  select exists(select 1 from public.global_admins where id = auth.uid() and activo = true)
$$;

-- ── FUNCIÓN HELPER: verificar si es admin de empresa ─────────
create or replace function public.es_admin_empresa()
returns boolean language sql security definer stable as $$
  select exists(select 1 from public.profiles where id = auth.uid() and rol = 'admin_empresa' and activo = true)
$$;

-- ── POLÍTICAS: global_admins ──────────────────────────────────
create policy "admins_globales_ven_todo" on public.global_admins
  for all using (public.es_admin_global());

-- ── POLÍTICAS: empresas ───────────────────────────────────────
-- Admin global: acceso total
create policy "admin_global_empresas" on public.empresas
  for all using (public.es_admin_global());

-- Usuario normal: solo ve su empresa
create policy "usuario_ve_su_empresa" on public.empresas
  for select using (
    id = public.mi_empresa_id()
  );

-- ── POLÍTICAS: profiles ───────────────────────────────────────
-- Admin global: acceso total
create policy "admin_global_profiles" on public.profiles
  for all using (public.es_admin_global());

-- Admin empresa: ve y gestiona usuarios de su empresa
create policy "admin_empresa_profiles" on public.profiles
  for all using (
    empresa_id = public.mi_empresa_id() and public.es_admin_empresa()
  );

-- Operador: solo ve su propio perfil
create policy "operador_ve_su_perfil" on public.profiles
  for select using (id = auth.uid());

-- ── POLÍTICAS: articulos ──────────────────────────────────────
create policy "admin_global_articulos" on public.articulos
  for all using (public.es_admin_global());

create policy "empresa_articulos" on public.articulos
  for all using (empresa_id = public.mi_empresa_id());

-- ── POLÍTICAS: clientes ───────────────────────────────────────
create policy "admin_global_clientes" on public.clientes
  for all using (public.es_admin_global());

create policy "empresa_clientes" on public.clientes
  for all using (empresa_id = public.mi_empresa_id());

-- ── POLÍTICAS: ventas ─────────────────────────────────────────
create policy "admin_global_ventas" on public.ventas
  for all using (public.es_admin_global());

create policy "empresa_ventas" on public.ventas
  for all using (empresa_id = public.mi_empresa_id());

-- ── POLÍTICAS: proveedores ────────────────────────────────────
create policy "admin_global_proveedores" on public.proveedores
  for all using (public.es_admin_global());

create policy "empresa_proveedores" on public.proveedores
  for all using (empresa_id = public.mi_empresa_id());

-- ── 11. TRIGGER: updated_at automático ───────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_empresas
  before update on public.empresas
  for each row execute function public.set_updated_at();

create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at_articulos
  before update on public.articulos
  for each row execute function public.set_updated_at();

create trigger set_updated_at_clientes
  before update on public.clientes
  for each row execute function public.set_updated_at();

create trigger set_updated_at_ventas
  before update on public.ventas
  for each row execute function public.set_updated_at();

-- ── 12. INSERTAR PRIMER ADMIN GLOBAL ─────────────────────────
-- IMPORTANTE: Primero registrate en Supabase Auth y copiá tu UUID.
-- Luego ejecutá este INSERT reemplazando los valores:
--
-- insert into public.global_admins (id, nombre, email)
-- values ('TU-UUID-DE-AUTH', 'Tu Nombre', 'tu@email.com');
