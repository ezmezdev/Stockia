# 📦 STOCKIA v4.0 — Guía de Cambios y Configuración
### Ampliación: Proveedores · Códigos únicos · Tipo de negocio · Código de venta

---

## ¿Qué hay de nuevo en v4.0?

| # | Funcionalidad | Dónde impacta |
|---|---|---|
| 1 | **Módulo de Proveedores completo** con ficha, historial de pedidos y estado de pagos | `proveedores.html` (nuevo) |
| 2 | **Código único para Clientes** (editable, validado, sugerido automáticamente) | `clientes.html`, DB |
| 3 | **Código único para Proveedores** (mismo sistema) | `proveedores.html`, DB |
| 4 | **Código/número de venta** con sugerencia automática del próximo consecutivo | `ventas.html`, `dashboard.html` |
| 5 | **Tipo de negocio por empresa** (`Mayorista` vs `Kiosco/Almacén`) — controla si se piden datos de cliente | `admin-empresa.html`, `admin-global.html` |
| 6 | Código de venta visible en **dashboard** y en **ficha de cliente** | `dashboard.html`, `clientes.html` |
| 7 | Tabla `compras` nueva (espejo de ventas para pedidos a proveedores) | DB |
| 8 | Backup actualizado incluye tabla `compras` | `global.js` |

---

## PASO 1 — Ejecutar la migración SQL

> ⚠️ Este paso es **obligatorio**. Sin él nada funciona.

1. Ir a **Supabase → SQL Editor → New query**
2. Copiar el contenido completo de **`MIGRACION_v4.sql`**
3. Pegar y hacer clic en **Run** ▶

Esto agrega, sin borrar nada existente:
- Campo `codigo` a `clientes` y `proveedores` (con índice único por empresa)
- Campo `codigo_venta` a `ventas` (con índice único por empresa)
- Campo `tipo_negocio` a `empresas`
- Tabla nueva `compras` con RLS completo
- 3 funciones SQL para sugerir el próximo código consecutivo

---

## PASO 2 — Reemplazar los archivos

Reemplazá estos archivos en tu proyecto Cloudflare Pages:

| Archivo | Acción |
|---|---|
| `js/global.js` | Reemplazar (nueva versión v4.0) |
| `css/global.css` | Reemplazar (estilos v4.0 incluidos) |
| `clientes.html` | Reemplazar |
| `ventas.html` | Reemplazar |
| `dashboard.html` | Reemplazar |
| `admin-empresa.html` | Reemplazar |
| `admin-global.html` | Reemplazar |
| `proveedores.html` | **Nuevo** — agregar |

Los archivos `login.html`, `articulos.html` **no cambian** en esta versión.

---

## Cómo funciona cada funcionalidad nueva

### 1. Módulo de Proveedores

**Acceder:** Menú → 🏭 Proveedores (debe estar habilitado en Config de la empresa)

**Crear un proveedor:**
- Campos: Código interno, Nombre, Teléfono, Email, Dirección, CUIT, Contacto, Notas
- El código se sugiere automáticamente (1, 2, 3...) pero se puede escribir manualmente
- Si el código ya existe, aparece mensaje de error en rojo: *"Este código ya existe para otro proveedor"*

**Ficha del proveedor (clic en la card):**
- Datos completos del proveedor
- Resumen: total comprado, total pagado, deuda pendiente
- Historial de todos los pedidos con estado de pago
- Botón *"Nuevo pedido"* para registrar compras desde ahí mismo

**Registrar un pedido/compra:**
- Seleccioná un artículo del catálogo (opcional, puede ser manual)
- Cantidad y precio de compra
- Si el artículo tiene stock, se **suma** automáticamente al stock
- Forma de pago: Efectivo, Transferencia, Tarjeta, Cuenta corriente, Cheque
- Pago inicial: si pagás parcialmente, el saldo queda como pendiente
- N° de remito del proveedor (para referencia)

**Estados de pago:**
- 🔴 **Pendiente** — no se pagó nada
- 🟡 **Parcial** — se pagó algo pero queda saldo
- 🟢 **Pagado** — saldo = 0

**Registrar pago parcial:** desde la fila del pedido → botón *"💵 Pagar"*

---

### 2. Códigos únicos de Clientes y Proveedores

**Cómo funciona:**
- Al crear, el sistema sugiere el próximo número disponible (ej: `1`, `2`, `3`...)
- Podés escribir cualquier código manualmente (ej: `CLI-001`, `MAYORISTA-05`)
- Si ingresás un código que ya existe para otra entidad de la misma empresa, aparece error en rojo
- Si lo dejás vacío, se guarda sin código (aparece `—` en la tabla)

**Búsqueda por código:**
- En el buscador de Clientes podés tipear el código directamente
- Ejemplo: buscar `CLI-005` encuentra ese cliente instantáneamente
- La búsqueda funciona por: código + nombre + DNI + teléfono (todo en simultáneo)

**El código aparece en:**
- Tabla de clientes (primera columna)
- Detalle del cliente (en la ficha)
- Selector de clientes en Ventas (formato: `Nombre #código`)
- Historial de ventas del cliente

---

### 3. Código / Número de Venta

**Al crear una venta:**
- Hay un campo *"Código / N° de venta"* al inicio del formulario
- El sistema sugiere el próximo número consecutivo (ej: si la última venta fue N° 45, sugiere N° 46)
- Podés usar el sugerido (click en el texto) o escribir cualquier valor
- Si el código ya existe en la empresa, aparece error: *"Este código ya existe"*
- Se puede dejar vacío (aparece `—`)

**Editar el código después de crear:**
- En la tabla de ventas, cada código tiene un botón ✏️ al lado
- Click → modal para cambiar el código con validación de unicidad

**El código aparece en:**
- Tabla principal de ventas
- Dashboard (últimas ventas)
- Ficha de cliente → historial de compras

---

### 4. Tipo de Negocio

**Configurar:**
- `admin-empresa.html` → sección *"Tipo de negocio"*
- `admin-global.html` → editar empresa → campo *"Tipo de negocio"*

**Opciones:**

| Tipo | Comportamiento |
|---|---|
| 🏪 **Mayorista** | Modo completo: DNI, dirección en clientes; selector de cliente en ventas |
| 🛒 **Kiosco / Almacén** | Modo rápido: sin DNI/dirección; se puede vender sin cliente registrado |

**Qué cambia visualmente según el tipo:**

*En Clientes:*
- Kiosco: las columnas DNI y Dirección desaparecen de la tabla
- Kiosco: el formulario de alta no pide DNI ni dirección

*En Ventas:*
- Kiosco (sin módulo de clientes): el selector de cliente se oculta completamente

El cambio es instantáneo y no borra datos existentes.

---

## Recomendaciones estructurales detectadas

### ✅ Lo que se implementó bien
- **Índices únicos compuestos** `(empresa_id, codigo)`: un código puede repetirse entre empresas, pero no dentro de la misma. Esto es correcto.
- **Funciones RPC en Supabase** para el siguiente código: evitan race conditions (si dos usuarios crean un cliente al mismo tiempo, no se pisarán los consecutivos).
- **Snapshots en compras**: `proveedor_nombre` y `articulo_nombre` se guardan al momento de crear la compra, igual que en ventas. Si después se cambia el nombre del proveedor, el historial no se altera.

### 🔧 Mejoras que podés aplicar en el futuro

**A. Separar items de venta en una tabla aparte**
La estructura actual guarda un artículo por venta. Si necesitás vender múltiples artículos en una sola venta, habría que crear `venta_items`. Por ahora el modelo actual es suficiente para la mayoría de los casos de uso.

**B. Agregar tabla de pagos como log**
En lugar de solo actualizar `pagado` y `saldo`, podrías tener una tabla `pagos` con cada registro de pago (fecha, monto, forma de pago). Útil para auditoría. Se puede agregar como módulo futuro sin romper lo actual.

**C. Índice de texto completo para búsqueda**
Para búsquedas muy frecuentes en tablas grandes, Supabase soporta `pg_trgm` (trigramas) que hace búsquedas `LIKE %texto%` mucho más rápidas:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX ON public.clientes USING gin(nombre gin_trgm_ops);
CREATE INDEX ON public.articulos USING gin(nombre gin_trgm_ops);
```

**D. Migración de `productos` a `articulos`**
Si tenés datos en la tabla `productos` del sistema anterior, podés migrarlos con:
```sql
INSERT INTO public.articulos (empresa_id, nombre, descripcion, codigo, precio, stock, activo, created_at)
SELECT empresa_id, nombre, descripcion, codigo, precio, stock, activo, created_at
FROM public.productos
ON CONFLICT DO NOTHING;
```

---

## Solución de problemas v4.0

### ❌ "función siguiente_codigo_venta no existe"
Ejecutar `MIGRACION_v4.sql` completo en Supabase SQL Editor.

### ❌ El código de proveedor/cliente no valida la unicidad
Verificar que el índice único se creó. En Supabase → Table Editor → `clientes` → Indexes, debería aparecer `idx_clientes_codigo_empresa`.

### ❌ El tipo de negocio no cambia el comportamiento
El `tipo_negocio` se lee desde `sessionStorage` (empresa activa). Si cambiás el tipo, cerrá sesión y volvé a entrar para que se refresque, o usá el botón "✓ Guardar tipo" en `admin-empresa.html` que actualiza el `sessionStorage` automáticamente.

### ❌ El módulo de Proveedores no aparece en el menú
Ir a `admin-empresa.html` → Módulos → activar el toggle de Proveedores → Guardar.

### ❌ Al registrar una compra, el stock no sube
El stock sube solo si se selecciona un artículo del catálogo en el campo "Artículo". Si se escribió el detalle manualmente (sin seleccionar del selector), no hay artículo vinculado y el stock no se modifica. Esto es intencional: si comprás algo que no está en el catálogo, primero crealo en Artículos.

---

*Stockia v4.0 · Ampliación de funcionalidades · Documentación interna*
