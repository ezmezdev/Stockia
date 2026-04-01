-- ============================================================
-- STOCKIA v4.0 — MIGRACIONES INCREMENTALES
-- Ejecutar en Supabase SQL Editor DESPUÉS del SCHEMA.sql v3.0
-- Cada bloque es seguro de re-ejecutar (usa IF NOT EXISTS / OR REPLACE)
-- ============================================================

-- ── 1. CLIENTES: agregar código único ────────────────────────
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS codigo text;

-- Índice único por empresa (un código no puede repetirse dentro de la misma empresa)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_codigo_empresa
  ON public.clientes (empresa_id, codigo)
  WHERE codigo IS NOT NULL;

-- ── 2. VENTAS: agregar código/número de venta ────────────────
ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS codigo_venta text;

-- Índice único por empresa
CREATE UNIQUE INDEX IF NOT EXISTS idx_ventas_codigo_empresa
  ON public.ventas (empresa_id, codigo_venta)
  WHERE codigo_venta IS NOT NULL;

-- ── 3. EMPRESAS: agregar tipo de negocio ─────────────────────
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS tipo_negocio text DEFAULT 'mayorista';
  -- valores: 'mayorista' | 'kiosco_almacen'

-- ── 4. PROVEEDORES: ampliar tabla existente ──────────────────
-- La tabla ya existe del schema v3.0, sólo le agregamos los campos que faltan
ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS codigo       text,
  ADD COLUMN IF NOT EXISTS contacto     text,   -- nombre de contacto
  ADD COLUMN IF NOT EXISTS email        text,
  ADD COLUMN IF NOT EXISTS updated_at   timestamptz DEFAULT now();

-- Índice único código por empresa
CREATE UNIQUE INDEX IF NOT EXISTS idx_proveedores_codigo_empresa
  ON public.proveedores (empresa_id, codigo)
  WHERE codigo IS NOT NULL;

-- ── 5. TABLA: compras (pedidos a proveedores) ────────────────
-- Espejo de "ventas" pero invertido: nosotros compramos al proveedor
CREATE TABLE IF NOT EXISTS public.compras (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id        uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  proveedor_id      uuid REFERENCES public.proveedores(id) ON DELETE SET NULL,
  proveedor_nombre  text,                          -- snapshot
  articulo_id       uuid REFERENCES public.articulos(id) ON DELETE SET NULL,
  articulo_nombre   text,                          -- snapshot
  cantidad          integer DEFAULT 1,
  precio_unitario   numeric(12,2) DEFAULT 0,
  total             numeric(12,2) DEFAULT 0,
  forma_pago        text DEFAULT 'efectivo',        -- efectivo | transferencia | tarjeta | cuenta_corriente | cheque
  estado            text DEFAULT 'pendiente',       -- pendiente | parcial | pagado
  pagado            numeric(12,2) DEFAULT 0,
  saldo             numeric(12,2) DEFAULT 0,
  es_cuotas         boolean DEFAULT false,
  cantidad_cuotas   integer DEFAULT 1,
  recargo_pct       numeric(5,2) DEFAULT 0,
  notas             text,
  nro_remito        text,                           -- número de remito del proveedor
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- Índices compras
CREATE INDEX IF NOT EXISTS idx_compras_empresa    ON public.compras(empresa_id);
CREATE INDEX IF NOT EXISTS idx_compras_proveedor  ON public.compras(proveedor_id);

-- RLS compras
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "admin_global_compras" ON public.compras
  FOR ALL USING (public.es_admin_global());

CREATE POLICY IF NOT EXISTS "empresa_compras" ON public.compras
  FOR ALL USING (empresa_id = public.mi_empresa_id());

-- Trigger updated_at para compras
CREATE TRIGGER set_updated_at_compras
  BEFORE UPDATE ON public.compras
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger updated_at para proveedores (si no existe)
DROP TRIGGER IF EXISTS set_updated_at_proveedores ON public.proveedores;
CREATE TRIGGER set_updated_at_proveedores
  BEFORE UPDATE ON public.proveedores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 6. FUNCIÓN: siguiente código de venta ────────────────────
-- Devuelve el próximo número consecutivo disponible para una empresa
CREATE OR REPLACE FUNCTION public.siguiente_codigo_venta(p_empresa_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  ultimo text;
  num    int;
BEGIN
  SELECT codigo_venta
    INTO ultimo
    FROM public.ventas
   WHERE empresa_id = p_empresa_id
     AND codigo_venta ~ '^\d+$'          -- solo los numéricos puros
   ORDER BY (codigo_venta::int) DESC
   LIMIT 1;

  IF ultimo IS NULL THEN
    RETURN '1';
  END IF;

  num := ultimo::int + 1;
  RETURN num::text;
END;
$$;

-- ── 7. FUNCIÓN: siguiente código de cliente ───────────────────
CREATE OR REPLACE FUNCTION public.siguiente_codigo_cliente(p_empresa_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  ultimo text;
  num    int;
BEGIN
  SELECT codigo
    INTO ultimo
    FROM public.clientes
   WHERE empresa_id = p_empresa_id
     AND codigo ~ '^\d+$'
   ORDER BY (codigo::int) DESC
   LIMIT 1;

  IF ultimo IS NULL THEN
    RETURN '1';
  END IF;

  RETURN (ultimo::int + 1)::text;
END;
$$;

-- ── 8. FUNCIÓN: siguiente código de proveedor ────────────────
CREATE OR REPLACE FUNCTION public.siguiente_codigo_proveedor(p_empresa_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  ultimo text;
  num    int;
BEGIN
  SELECT codigo
    INTO ultimo
    FROM public.proveedores
   WHERE empresa_id = p_empresa_id
     AND codigo ~ '^\d+$'
   ORDER BY (codigo::int) DESC
   LIMIT 1;

  IF ultimo IS NULL THEN
    RETURN '1';
  END IF;

  RETURN (ultimo::int + 1)::text;
END;
$$;

-- ── 9. BACKUP: agregar compras al export ─────────────────────
-- (No requiere SQL — se maneja en el frontend global.js)

-- ── RESUMEN DE CAMBIOS ────────────────────────────────────────
-- clientes    : + codigo (unique por empresa)
-- ventas      : + codigo_venta (unique por empresa)
-- empresas    : + tipo_negocio ('mayorista' | 'kiosco_almacen')
-- proveedores : + codigo, contacto, email, updated_at (unique codigo por empresa)
-- compras     : tabla nueva (espejo de ventas para compras a proveedores)
-- funciones   : siguiente_codigo_venta / cliente / proveedor
