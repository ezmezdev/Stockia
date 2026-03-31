// ============================================================
// STOCKIA v3.0 — global.js · Multi-Empresa
// ============================================================

const SUPABASE_URL     = 'https://okovdfkkadhzjgteblus.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rb3ZkZmtrYWRoempndGVibHVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MjcxMjksImV4cCI6MjA5MDUwMzEyOX0.EmIq6n14sJ7lkID3XTwi4RnoEm5CYtYYULibzPbSeg0';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Estado global de sesión
let _sesionActual = null;  // { session, perfil, empresa, esAdminGlobal }

// ============================================================
// AUTH
// ============================================================

/**
 * Verifica sesión. Redirige si no hay sesión activa.
 * Distingue entre admin global, admin empresa y operador.
 * @param {string|null} rolRequerido - 'admin_empresa' | 'operador' | null
 * @returns {Object|null} { session, perfil, empresa, esAdminGlobal }
 */
async function verificarSesion(rolRequerido = null) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = '/login.html'; return null; }

  // ¿Es admin global?
  const { data: adminGlobal } = await sb
    .from('global_admins')
    .select('*')
    .eq('id', session.user.id)
    .eq('activo', true)
    .single();

  if (adminGlobal) {
    // Admin global: puede estar "actuando como empresa" via sessionStorage
    const empresaActual = _obtenerEmpresaActiva();
    _sesionActual = { session, perfil: adminGlobal, empresa: empresaActual, esAdminGlobal: true };
    return _sesionActual;
  }

  // Usuario normal: buscar perfil en su empresa
  const { data: perfil } = await sb
    .from('profiles')
    .select('*, empresas(*)')
    .eq('id', session.user.id)
    .single();

  if (!perfil || !perfil.activo) {
    await sb.auth.signOut();
    window.location.href = '/login.html';
    return null;
  }

  if (rolRequerido && perfil.rol !== rolRequerido && rolRequerido !== 'any') {
    mostrarAlerta('No tenés permisos para acceder a esta sección.', 'error');
    setTimeout(() => window.location.href = '/dashboard.html', 2000);
    return null;
  }

  _sesionActual = { session, perfil, empresa: perfil.empresas, esAdminGlobal: false };
  return _sesionActual;
}

/** Cierra sesión y limpia el contexto de empresa */
async function cerrarSesion() {
  sessionStorage.removeItem('stockia_empresa_activa');
  await sb.auth.signOut();
  window.location.href = '/login.html';
}

/** Obtiene la empresa activa del sessionStorage (para admin global) */
function _obtenerEmpresaActiva() {
  try {
    const raw = sessionStorage.getItem('stockia_empresa_activa');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** Guarda la empresa activa en sessionStorage (para admin global) */
function guardarEmpresaActiva(empresa) {
  sessionStorage.setItem('stockia_empresa_activa', JSON.stringify(empresa));
}

/** Devuelve el empresa_id actual (sea admin global con empresa seleccionada o usuario normal) */
function getEmpresaId() {
  if (!_sesionActual) return null;
  return _sesionActual.empresa?.id || null;
}

// ============================================================
// NAV — construir navegación dinámica según módulos
// ============================================================

/**
 * Construye el nav completo según rol y módulos habilitados de la empresa.
 * Llama esta función después de verificarSesion().
 */
function construirNav() {
  if (!_sesionActual) return;
  const { perfil, empresa, esAdminGlobal } = _sesionActual;
  const modulos = empresa?.modulos_habilitados || {};
  const nombreArticulos = empresa?.modulo_articulos_nombre || 'Artículos';
  const iconoArticulos  = empresa?.modulo_articulos_icono || '📦';

  // Items base del nav
  const items = [
    { href: 'dashboard.html', icono: '🏠', label: 'Inicio', siempre: true },
    { href: 'articulos.html', icono: iconoArticulos, label: nombreArticulos, modulo: 'articulos' },
    { href: 'clientes.html',  icono: '👥', label: 'Clientes',  modulo: 'clientes' },
    { href: 'ventas.html',    icono: '💰', label: 'Ventas',    modulo: 'ventas' },
    { href: 'proveedores.html', icono: '🏭', label: 'Proveedores', modulo: 'proveedores' },
  ];

  // Admin empresa o global con empresa seleccionada
  const esAdminConEmpresa = esAdminGlobal ? !!empresa : perfil.rol === 'admin_empresa';
  if (esAdminConEmpresa) {
    items.push({ href: 'admin-empresa.html', icono: '⚙️', label: 'Config', siempre: true });
  }
  if (esAdminGlobal) {
    items.push({ href: 'admin-global.html', icono: '🌐', label: 'Super Admin', siempre: true });
  }

  // Filtrar por módulos habilitados
  const itemsVisibles = items.filter(item => {
    if (item.siempre) return true;
    return modulos[item.modulo] === true;
  });

  // ── Nav desktop ──────────────────────────────────────────
  const navLinks = document.getElementById('navLinks');
  if (navLinks) {
    navLinks.innerHTML = itemsVisibles.map(item => `
      <li>
        <a href="${item.href}" class="nav-link">
          <span class="icono">${item.icono}</span> ${item.label}
        </a>
      </li>
    `).join('');
  }

  // ── Nav móvil ────────────────────────────────────────────
  const navMovil = document.getElementById('navMovilLinks');
  if (navMovil) {
    navMovil.innerHTML = itemsVisibles.map(item => `
      <a href="${item.href}" class="nav-link">
        <span class="icono">${item.icono}</span> ${item.label}
      </a>
    `).join('');
  }

  // ── Nombre usuario ───────────────────────────────────────
  const elNombre = document.getElementById('navNombre');
  const elRol    = document.getElementById('navRol');
  if (elNombre) elNombre.textContent = perfil.nombre;
  if (elRol)    elRol.textContent    = esAdminGlobal ? 'Super Admin' : (perfil.rol === 'admin_empresa' ? 'Admin' : 'Operador');

  // ── Badge empresa ─────────────────────────────────────────
  const badge = document.getElementById('navEmpresaBadge');
  if (badge && empresa) {
    badge.querySelector('.nav-empresa-nombre').textContent = empresa.nombre;
    badge.style.display = 'flex';
  }

  // ── Nombre empresa en menú móvil ──────────────────────────
  const menuEmpresa = document.getElementById('menuEmpresaInfo');
  if (menuEmpresa && empresa) menuEmpresa.textContent = empresa.nombre;

  // ── Info usuario en menú móvil ────────────────────────────
  const menuUsuario = document.getElementById('menuUsuarioInfo');
  if (menuUsuario) menuUsuario.textContent = `${perfil.nombre} · ${esAdminGlobal ? 'Super Admin' : perfil.rol}`;

  // Marcar link activo
  marcarNavActivo();
}

function marcarNavActivo() {
  const pagina = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('activo');
    if (link.getAttribute('href') === pagina) link.classList.add('activo');
  });
}

// ============================================================
// HAMBURGUESA
// ============================================================
function toggleMenu() {
  const btn     = document.getElementById('navHamburguesa');
  const menu    = document.getElementById('navMenuMovil');
  const overlay = document.getElementById('navOverlay');
  const abierto = menu?.classList.contains('abierto');
  if (abierto) { cerrarMenu(); }
  else {
    btn?.classList.add('abierto');
    menu?.classList.add('abierto');
    overlay?.classList.add('abierto');
    document.body.style.overflow = 'hidden';
  }
}
function cerrarMenu() {
  document.getElementById('navHamburguesa')?.classList.remove('abierto');
  document.getElementById('navMenuMovil')?.classList.remove('abierto');
  document.getElementById('navOverlay')?.classList.remove('abierto');
  document.body.style.overflow = '';
}

// ============================================================
// ALERTAS
// ============================================================
function mostrarAlerta(mensaje, tipo = 'info', duracion = 4000) {
  const alerta = document.createElement('div');
  alerta.className = `alerta alerta-${tipo}`;
  alerta.innerHTML = `
    <span class="alerta-icono">${tipo === 'exito' ? '✓' : tipo === 'error' ? '✗' : 'ℹ'}</span>
    <span>${mensaje}</span>
  `;
  document.body.appendChild(alerta);
  requestAnimationFrame(() => alerta.classList.add('visible'));
  setTimeout(() => {
    alerta.classList.remove('visible');
    setTimeout(() => alerta.remove(), 300);
  }, duracion);
}

// ============================================================
// FORMATO
// ============================================================
function formatoPeso(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n || 0);
}
function formatoFecha(f) {
  if (!f) return '-';
  return new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatoFechaHora(f) {
  if (!f) return '-';
  return new Date(f).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ============================================================
// MODALES
// ============================================================
function abrirModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.classList.add('activo'); document.body.style.overflow = 'hidden'; }
}
function cerrarModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.classList.remove('activo'); document.body.style.overflow = ''; }
}
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('activo');
    document.body.style.overflow = '';
  }
});

// ============================================================
// BACKUP / EXPORTAR
// ============================================================

/**
 * Exporta todos los datos de una empresa como JSON
 * @param {string} empresaId
 * @param {string} empresaNombre
 */
async function exportarEmpresaJSON(empresaId, empresaNombre) {
  try {
    mostrarAlerta('Preparando backup...', 'info', 8000);
    const [articulos, clientes, ventas, proveedores] = await Promise.all([
      sb.from('articulos').select('*').eq('empresa_id', empresaId),
      sb.from('clientes').select('*').eq('empresa_id', empresaId),
      sb.from('ventas').select('*').eq('empresa_id', empresaId),
      sb.from('proveedores').select('*').eq('empresa_id', empresaId),
    ]);

    const backup = {
      version: '3.0',
      empresa: empresaNombre,
      empresa_id: empresaId,
      exportado_at: new Date().toISOString(),
      datos: {
        articulos:   articulos.data  || [],
        clientes:    clientes.data   || [],
        ventas:      ventas.data     || [],
        proveedores: proveedores.data || [],
      }
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `stockia-backup-${empresaNombre.replace(/\s+/g,'-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    mostrarAlerta('Backup descargado correctamente ✓', 'exito');
  } catch (e) {
    mostrarAlerta('Error al exportar: ' + e.message, 'error');
  }
}

/**
 * Exporta datos de empresa como CSV (múltiples archivos zip no disponible, genera el de ventas)
 */
async function exportarEmpresaCSV(empresaId, empresaNombre, tabla = 'ventas') {
  try {
    const { data } = await sb.from(tabla).select('*').eq('empresa_id', empresaId);
    if (!data || !data.length) { mostrarAlerta('No hay datos para exportar', 'info'); return; }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row =>
      Object.values(row).map(v => {
        const val = v === null ? '' : String(v);
        return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g,'""')}"` : val;
      }).join(',')
    );
    const csv  = [headers, ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `stockia-${tabla}-${empresaNombre.replace(/\s+/g,'-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    mostrarAlerta(`CSV de ${tabla} descargado ✓`, 'exito');
  } catch (e) {
    mostrarAlerta('Error al exportar CSV: ' + e.message, 'error');
  }
}

/**
 * Importa un backup JSON a la empresa actual (sobreescribe con merge por ID)
 * @param {File} file - Archivo JSON
 * @param {string} empresaId - ID destino
 */
async function importarBackupJSON(file, empresaId) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backup = JSON.parse(e.target.result);
        if (!backup.datos) throw new Error('Formato de backup inválido');

        mostrarAlerta('Importando datos...', 'info', 15000);
        const tablas = ['articulos', 'clientes', 'ventas', 'proveedores'];
        for (const tabla of tablas) {
          const registros = backup.datos[tabla] || [];
          if (!registros.length) continue;
          // Reasignar empresa_id al destino
          const datos = registros.map(r => ({ ...r, empresa_id: empresaId }));
          const { error } = await sb.from(tabla).upsert(datos, { onConflict: 'id' });
          if (error) throw new Error(`Error en ${tabla}: ${error.message}`);
        }

        mostrarAlerta('Importación completada ✓', 'exito');
        resolve(true);
      } catch (err) {
        mostrarAlerta('Error al importar: ' + err.message, 'error');
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}

// ── Año actual en footer ──────────────────────────────────────
document.querySelectorAll('.anio-actual').forEach(el => { el.textContent = new Date().getFullYear(); });
