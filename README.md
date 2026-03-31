# 📦 STOCKIA v3.0 — Guía de Configuración Completa
### Sistema multi-empresa de gestión de inventario

---

## 📋 ÍNDICE
1. [¿Qué hay de nuevo en v3.0?](#qué-hay-de-nuevo)
2. [Archivos del proyecto](#archivos-del-proyecto)
3. [Paso 1 — Configurar Supabase](#paso-1--configurar-supabase)
4. [Paso 2 — Crear el primer Admin Global](#paso-2--crear-el-primer-admin-global)
5. [Paso 3 — Subir los archivos (Cloudflare Pages)](#paso-3--subir-los-archivos)
6. [Paso 4 — Crear empresas](#paso-4--crear-empresas)
7. [Paso 5 — Crear usuarios por empresa](#paso-5--crear-usuarios-por-empresa)
8. [Paso 6 — Personalizar módulos por empresa](#paso-6--personalizar-módulos)
9. [Backup e importación de datos](#backup-e-importación)
10. [Cómo agregar módulos nuevos en el futuro](#agregar-módulos-nuevos)
11. [Solución de problemas frecuentes](#solución-de-problemas)

---

## ¿Qué hay de nuevo?

- **Multi-empresa**: cada empresa tiene sus propios datos, usuarios y configuración. Una empresa no puede ver datos de otra.
- **Admins Globales (2-5)**: pueden entrar a todas las empresas, crear y gestionar todo desde el panel `admin-global.html`.
- **Módulos por empresa**: activar/desactivar Clientes, Ventas, Proveedores y futuros módulos con un toggle.
- **Nombre personalizable de artículos**: una empresa puede llamarlo "Prendas", otra "Productos de almacén", otra "Repuestos".
- **Placeholders configurables**: los textos de ejemplo del formulario de artículos cambian según el rubro.
- **Backup JSON + CSV**: exportar/importar todos los datos de cada empresa individualmente.
- **Nueva tabla**: `articulos` reemplaza a `productos` (más general).

---

## Archivos del proyecto

```
stockia/
├── login.html            ← Pantalla de ingreso (igual para todos)
├── dashboard.html        ← Panel principal de cada empresa
├── articulos.html        ← Módulo de artículos (reemplaza productos)
├── clientes.html         ← Módulo de clientes
├── ventas.html           ← Módulo de ventas
├── admin-empresa.html    ← Config interna (admin de empresa)
├── admin-global.html     ← Super panel (solo admins globales)
├── css/
│   └── global.css        ← Estilos del sistema
├── js/
│   └── global.js         ← Lógica compartida
└── SCHEMA.sql            ← SQL para ejecutar en Supabase
```

---

## Paso 1 — Configurar Supabase

### 1.1 Ir al SQL Editor

1. Entrar a [supabase.com](https://supabase.com) → tu proyecto → **SQL Editor**
2. Hacer clic en **"New query"**
3. Copiar TODO el contenido del archivo `SCHEMA.sql`
4. Pegarlo en el editor y hacer clic en **"Run"** (▶)

✅ Vas a ver varios mensajes de éxito. Si sale algún error de "already exists", está bien, significa que la tabla ya existía.

### 1.2 Configurar autenticación

1. En Supabase, ir a **Authentication → Settings**
2. En la sección **"Email"**, desactivar la opción **"Enable email confirmations"**
   - Esto permite crear usuarios directamente sin que tengan que confirmar el email
   - ⚠️ Importante: sin este paso, los usuarios creados desde el panel no podrán ingresar
3. Guardar cambios

### 1.3 Verificar que el proyecto correcto esté conectado

La URL y clave que está en el código son:
```
URL:  https://okovdfkkadhzjgteblus.supabase.co
KEY:  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
Estas ya están escritas en todos los archivos. No hay que cambiar nada más.

---

## Paso 2 — Crear el primer Admin Global

Este es el paso más importante. El primer admin global se tiene que crear de forma manual.

### 2.1 Registrarse en Supabase Auth

1. Abrí el archivo `login.html` en el navegador (podés hacerlo local o subirlo)
2. Intentá ingresar con tu email (va a fallar porque no existe el usuario todavía)
3. En Supabase → **Authentication → Users** → hacer clic en **"Add user"**
4. Completar:
   - **Email**: tu email
   - **Password**: tu contraseña (mínimo 8 caracteres)
   - **Auto Confirm User**: activado ✓
5. Hacer clic en **"Create User"**
6. Copiar el **UUID** que aparece (es algo como `a1b2c3d4-e5f6-...`)

### 2.2 Insertar en la tabla global_admins

1. Volver al **SQL Editor** de Supabase
2. Ejecutar este comando (reemplazando con TUS datos):

```sql
INSERT INTO public.global_admins (id, nombre, email)
VALUES (
  'PEGAR-AQUI-EL-UUID',
  'Tu Nombre Completo',
  'tu@email.com'
);
```

**Ejemplo real:**
```sql
INSERT INTO public.global_admins (id, nombre, email)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Juan Admin',
  'juan@stockia.com'
);
```

3. Hacer clic en **"Run"** ▶

✅ Ahora podés ingresar con ese email/contraseña en `login.html` y vas a ser redirigido directamente a `admin-global.html`.

### 2.3 Crear admins globales adicionales (2-5 admins)

Una vez que entraste como admin global:
1. Ir a `admin-global.html`
2. Hacer clic en la pestaña **"Admins Globales"**
3. Clic en **"Agregar admin global"**
4. Completar nombre, email y contraseña
5. Listo — el nuevo admin puede entrar con esas credenciales

---

## Paso 3 — Subir los archivos

### Opción A: Cloudflare Pages (recomendado, como venías usando)

1. Ir a [dash.cloudflare.com](https://dash.cloudflare.com) → **Pages**
2. Crear un nuevo proyecto o actualizar el existente
3. Subir la carpeta completa del proyecto (con `css/` y `js/` adentro)
4. En la configuración del proyecto, asegurarse que el directorio raíz sea correcto

**Estructura que tiene que quedar en Cloudflare:**
```
/login.html
/dashboard.html
/articulos.html
/clientes.html
/ventas.html
/admin-empresa.html
/admin-global.html
/css/global.css
/js/global.js
```

### Opción B: Prueba local rápida

Podés abrir los archivos directamente en el navegador desde la carpeta local.  
⚠️ Algunos navegadores bloquean fetch() en archivos locales. En ese caso usá una extensión como **"Live Server"** en VS Code.

---

## Paso 4 — Crear empresas

Una vez que entraste como admin global:

1. Ir a `admin-global.html`
2. Clic en **"➕ Nueva empresa"**
3. Completar:
   - **Nombre**: "Ropa El Centro" (lo que quieras)
   - **Slug**: se genera automático (ej: `ropa-el-centro`) — es solo un identificador interno
   - **Color**: elegí un color para diferenciar visualmente cada empresa
   - **Nombre del módulo de artículos**: aquí definís cómo se llaman los artículos para esta empresa:
     - Para ropa: `Prendas`
     - Para almacén: `Productos`
     - Para hogar: `Artículos`
     - Para repuestos: `Repuestos`
   - **Ícono del módulo**: pegá un emoji (ej: `👗` `🥩` `🔧` `🏠`)
4. Clic en **"✓ Crear empresa"**

### Ingresar a una empresa como admin global

1. En la lista de empresas, clic en **"🔑 Ingresar"**
2. Vas a ver el dashboard de esa empresa como si fueras un usuario de ella
3. Para volver al panel de admin global, usá el botón **"← Volver al admin"** en el banner superior

---

## Paso 5 — Crear usuarios por empresa

Hay dos formas:

### Desde admin-global.html (recomendado para setup inicial)

1. En la tarjeta de la empresa → clic en **"👥 Usuarios"**
2. Clic en **"➕ Agregar usuario"**
3. Completar nombre, email, contraseña y rol:
   - **Operador**: puede ver y cargar datos
   - **Admin de empresa**: puede gestionar usuarios y cambiar configuración de esa empresa
4. Clic en **"✓ Crear"**

### Desde admin-empresa.html (lo hace el admin de la empresa)

1. Ingresar a la empresa
2. Ir a **"⚙️ Config"** en el menú
3. En la sección "Usuarios", clic en **"➕ Agregar usuario"**
4. Mismo proceso

### Credenciales para el usuario nuevo

Cuando creás un usuario desde el panel, tenés que comunicarle:
- Su email
- Su contraseña (la que ingresaste)
- La URL del sistema

El usuario puede cambiar su contraseña desde el perfil de Supabase si lo configurás, o simplemente darle una contraseña segura desde el inicio.

---

## Paso 6 — Personalizar módulos

### Activar/desactivar módulos por empresa

1. En `admin-global.html`, clic en **"✏️ Editar"** en la tarjeta de la empresa
2. En la sección **"Módulos habilitados"**, activá o desactivá con los toggles:
   - **Artículos**: siempre activo (no se puede desactivar)
   - **Clientes**: on/off
   - **Ventas**: on/off
   - **Proveedores**: on/off (módulo preparado para usar)
3. Clic en **"✓ Guardar cambios"**

Los módulos desactivados desaparecen del menú de navegación automáticamente.

### Cambiar el nombre y placeholders del módulo de artículos

En el mismo modal de edición de empresa:
- **Nombre del módulo**: ej. "Prendas" → aparece en el menú como "Prendas"
- **Ícono**: ej. `👗`
- **Textos de ejemplo**:
  - "Nombre del artículo" → ej. `Camisa manga larga`
  - "Descripción" → ej. `Talle M, color azul marino`
  - "Código" → ej. `PRENDA-001`

Estos textos aparecen como placeholder (texto gris de guía) en el formulario de artículos de esa empresa.

---

## Backup e importación

### Descargar un backup completo (JSON)

**Desde admin-global.html:**
1. En la tarjeta de la empresa → clic en **"⬇️ Backup"**
2. Se descarga un archivo `.json` con artículos, clientes, ventas y proveedores

**Desde admin-empresa.html (el admin de la empresa):**
1. Ir a ⚙️ Config → sección "Backup de datos"
2. Clic en **"⬇️ Descargar"** (JSON)

### Descargar CSV para Excel

1. En **admin-empresa.html** → sección Backup
2. Elegir "Exportar ventas (CSV)" o "Exportar artículos (CSV)"
3. El archivo se abre directo en Excel, Sheets, o cualquier programa de planilla

### Importar un backup

1. En **admin-empresa.html** → sección Backup
2. Clic en **"⬆️ Importar"**
3. Seleccionar el archivo `.json` que descargaste antes
4. El sistema confirma antes de importar
5. Los registros se actualizan por ID (si ya existen) o se crean nuevos

⚠️ **Importante sobre la importación:**
- Solo importa artículos, clientes, ventas y proveedores (no borra lo existente)
- Si el ID ya existe en la base, actualiza el registro (no duplica)
- El `empresa_id` se reemplaza automáticamente con el de la empresa destino
- Sirve para migrar datos de una empresa a otra, o para restaurar un backup

---

## Agregar módulos nuevos en el futuro

Cuando quieras agregar un módulo nuevo (ej: "Remitos", "Pedidos", "Caja"):

### Paso 1: Agregar el módulo a la lista en admin-global.js

En el archivo `admin-global.html`, buscar el array `modulosDisponibles` y agregar una línea:

```javascript
const modulosDisponibles = [
  { key: 'articulos',   label: 'Artículos',   icono: '📦', desc: 'Catálogo de artículos' },
  { key: 'clientes',    label: 'Clientes',    icono: '👥', desc: 'Gestión de clientes' },
  { key: 'ventas',      label: 'Ventas',      icono: '💰', desc: 'Registro de ventas' },
  { key: 'proveedores', label: 'Proveedores', icono: '🏭', desc: 'Gestión de proveedores' },
  // ↓ AGREGAR ACÁ:
  { key: 'remitos',     label: 'Remitos',     icono: '📄', desc: 'Gestión de remitos' },
];
```

Hacer lo mismo en `admin-empresa.html`.

### Paso 2: Agregar al nav en global.js

En `js/global.js`, función `construirNav()`, agregar:

```javascript
{ href: 'remitos.html', icono: '📄', label: 'Remitos', modulo: 'remitos' },
```

### Paso 3: Crear el archivo HTML del módulo

Copiar `articulos.html` como base, renombrarlo `remitos.html` y adaptar el contenido.

### Paso 4: Crear la tabla en Supabase

```sql
CREATE TABLE public.remitos (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  -- tus columnas acá
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.remitos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "empresa_remitos" ON public.remitos
  FOR ALL USING (empresa_id = public.mi_empresa_id());
```

---

## Solución de problemas

### ❌ "No hay permisos" al ingresar

**Causa:** El usuario existe en Auth pero no en la tabla `profiles` o `global_admins`.

**Solución:**
1. Ir a Supabase → **Authentication → Users**
2. Verificar que el usuario existe
3. Ir a **Table Editor → profiles** (o `global_admins`)
4. Verificar que hay una fila con ese `id` y `activo = true`

---

### ❌ Al crear un usuario el botón "Crear" no hace nada

**Causa:** Email confirmations está activado en Supabase Auth.

**Solución:** Supabase → Authentication → Settings → **desactivar "Enable email confirmations"**

---

### ❌ El admin global ve el dashboard vacío al entrar

**Causa:** El admin global no tiene empresa seleccionada. Tiene que primero ir a `admin-global.html` y hacer clic en **"🔑 Ingresar"** en una empresa.

---

### ❌ Los datos de una empresa aparecen en otra

**Causa:** Posiblemente el RLS (Row Level Security) no está configurado correctamente.

**Solución:** Ejecutar el SCHEMA.sql completo nuevamente en el SQL Editor de Supabase (el `IF NOT EXISTS` evita duplicar tablas).

---

### ❌ El menú no muestra todos los módulos

**Causa:** Los módulos están desactivados para esa empresa.

**Solución:** Admin global → editar empresa → activar módulos necesarios.

---

### ❌ Error "relation does not exist" en consola

**Causa:** La tabla que necesita el módulo no fue creada.

**Solución:** Ejecutar el SCHEMA.sql completo en Supabase.

---

## 🔐 Resumen de roles

| Rol | Qué puede hacer |
|-----|----------------|
| **Super Admin (global)** | Ver y gestionar TODAS las empresas, crear admins globales, crear empresas, ingresar a cualquier empresa |
| **Admin de empresa** | Gestionar usuarios de SU empresa, cambiar módulos habilitados, hacer backup, ver todos los datos de su empresa |
| **Operador** | Cargar artículos, clientes y ventas de su empresa. No puede eliminar ni acceder a configuración |

---

## 📱 Acceso móvil

El sistema es **mobile-first**: funciona perfectamente en celular (probado en Redmi 13, 360-500px). El menú hamburguesa despliega todos los módulos habilitados.

---

*Stockia v3.0 · Sistema multi-empresa · Documentación interna*
