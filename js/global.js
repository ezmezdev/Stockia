// ============================================================
// STOCKIA v4.0 — global.js · Multi-Empresa
// ============================================================

const SUPABASE_URL      = 'https://okovdfkkadhzjgteblus.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rb3ZkZmtrYWRoempndGVibHVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MjcxMjksImV4cCI6MjA5MDUwMzEyOX0.EmIq6n14sJ7lkID3XTwi4RnoEm5CYtYYULibzPbSeg0';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let _sesionActual = null;

// ============================================================
// AUTH
// ============================================================
async function verificarSesion(rolRequerido = null) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = '/login.html'; return null; }

  const { data: adminGlobal } = await sb.from('global_admins').select('*')
    .eq('id', session.user.id).eq('activo', true).single();

  if (adminGlobal) {
    _sesionActual = { session, perfil: adminGlobal, empresa: _obtenerEmpresaActiva(), esAdminGlobal: true };
    return _sesionActual;
  }

  const { data: perfil } = await sb.from('profiles').select('*, empresas(*)')
    .eq('id', session.user.id).single();

  if (!perfil || !perfil.activo) { await sb.auth.signOut(); window.location.href = '/login.html'; return null; }

  if (rolRequerido && perfil.rol !== rolRequerido && rolRequerido !== 'any') {
    mostrarAlerta('No tenés permisos para acceder a esta sección.', 'error');
    setTimeout(() => window.location.href = '/dashboard.html', 2000);
    return null;
  }

  _sesionActual = { session, perfil, empresa: perfil.empresas, esAdminGlobal: false };
  return _sesionActual;
}

async function cerrarSesion() {
  sessionStorage.removeItem('stockia_empresa_activa');
  await sb.auth.signOut();
  window.location.href = '/login.html';
}

function _obtenerEmpresaActiva() {
  try { return JSON.parse(sessionStorage.getItem('stockia_empresa_activa') || 'null'); }
  catch { return null; }
}

function guardarEmpresaActiva(e) { sessionStorage.setItem('stockia_empresa_activa', JSON.stringify(e)); }
function getEmpresaId()   { return _sesionActual?.empresa?.id   || null; }
function getTipoNegocio() { return _sesionActual?.empresa?.tipo_negocio || 'mayorista'; }
function esKiosco()       { return getTipoNegocio() === 'kiosco_almacen'; }

// ============================================================
// CÓDIGOS ÚNICOS
// ============================================================
async function siguienteCodigo(tipo, empresaId) {
  const fn = { venta:'siguiente_codigo_venta', cliente:'siguiente_codigo_cliente', proveedor:'siguiente_codigo_proveedor' }[tipo];
  if (!fn) return '1';
  const { data } = await sb.rpc(fn, { p_empresa_id: empresaId });
  return data || '1';
}

async function codigoEsUnico(tabla, campo, valor, empresaId, excluirId = null) {
  if (!valor?.trim()) return true;
  let q = sb.from(tabla).select('id').eq('empresa_id', empresaId).eq(campo, valor.trim());
  if (excluirId) q = q.neq('id', excluirId);
  const { data } = await q.limit(1);
  return !data?.length;
}

// ============================================================
// NAV
// ============================================================
function construirNav() {
  if (!_sesionActual) return;
  const { perfil, empresa, esAdminGlobal } = _sesionActual;
  const modulos = empresa?.modulos_habilitados || {};
  const nArt    = empresa?.modulo_articulos_nombre || 'Artículos';
  const iArt    = empresa?.modulo_articulos_icono  || '📦';

  const items = [
    { href: 'dashboard.html',   icono: '🏠', label: 'Inicio',      siempre: true },
    { href: 'articulos.html',   icono: iArt, label: nArt,           modulo: 'articulos' },
    { href: 'clientes.html',    icono: '👥', label: 'Clientes',     modulo: 'clientes' },
    { href: 'ventas.html',      icono: '💰', label: 'Ventas',       modulo: 'ventas' },
    { href: 'proveedores.html', icono: '🏭', label: 'Proveedores',  modulo: 'proveedores' },
  ];

  const esAdminCon = esAdminGlobal ? !!empresa : perfil.rol === 'admin_empresa';
  // Un admin_empresa ve Config solo si tiene permiso ver_config (o si el campo no existe aún)
  const puedeVerConfig = esAdminCon && (
    esAdminGlobal ||
    perfil.permisos_admin?.ver_config !== false
  );
  if (puedeVerConfig) items.push({ href: 'admin-empresa.html', icono: '⚙️', label: 'Config', siempre: true });
  if (esAdminGlobal) items.push({ href: 'admin-global.html',  icono: '🌐', label: 'Super Admin', siempre: true });

  const visibles = items.filter(i => i.siempre || modulos[i.modulo] === true);
  const mkLi  = i => `<li><a href="${i.href}" class="nav-link"><span class="icono">${i.icono}</span> ${i.label}</a></li>`;
  const mkA   = i => `<a href="${i.href}" class="nav-link"><span class="icono">${i.icono}</span> ${i.label}</a>`;

  const nl = document.getElementById('navLinks');     if (nl) nl.innerHTML = visibles.map(mkLi).join('');
  const nm = document.getElementById('navMovilLinks'); if (nm) nm.innerHTML = visibles.map(mkA).join('');

  const en = document.getElementById('navNombre'); if (en) en.textContent = perfil.nombre;
  const er = document.getElementById('navRol');    if (er) er.textContent = esAdminGlobal ? 'Super Admin' : (perfil.rol === 'admin_empresa' ? 'Admin' : 'Operador');

  const badge = document.getElementById('navEmpresaBadge');
  if (badge && empresa) { badge.querySelector('.nav-empresa-nombre').textContent = empresa.nombre; badge.style.display = 'flex'; }

  const me = document.getElementById('menuEmpresaInfo');  if (me && empresa) { me.textContent = empresa.nombre; me.style.display = 'flex'; }
  const mu = document.getElementById('menuUsuarioInfo');   if (mu) mu.textContent = `${perfil.nombre} · ${esAdminGlobal ? 'Super Admin' : perfil.rol}`;

  marcarNavActivo();
}

function marcarNavActivo() {
  const p = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('activo', l.getAttribute('href') === p));
}

// ============================================================
// HAMBURGUESA
// ============================================================
function toggleMenu() {
  const btn = document.getElementById('navHamburguesa');
  const menu = document.getElementById('navMenuMovil');
  const ov   = document.getElementById('navOverlay');
  if (menu?.classList.contains('abierto')) { cerrarMenu(); }
  else { btn?.classList.add('abierto'); menu?.classList.add('abierto'); ov?.classList.add('abierto'); document.body.style.overflow = 'hidden'; }
}
function cerrarMenu() {
  ['navHamburguesa','navMenuMovil','navOverlay'].forEach(id => document.getElementById(id)?.classList.remove('abierto'));
  document.body.style.overflow = '';
}

// ============================================================
// ALERTAS
// ============================================================
function mostrarAlerta(msg, tipo = 'info', dur = 4000) {
  const a = document.createElement('div');
  a.className = `alerta alerta-${tipo}`;
  a.innerHTML = `<span class="alerta-icono">${tipo==='exito'?'✓':tipo==='error'?'✗':'ℹ'}</span><span>${msg}</span>`;
  document.body.appendChild(a);
  requestAnimationFrame(() => a.classList.add('visible'));
  setTimeout(() => { a.classList.remove('visible'); setTimeout(() => a.remove(), 300); }, dur);
}

// ============================================================
// FORMATO
// ============================================================
function formatoPeso(n) {
  const num = Number(n) || 0;
  const tieneCentavos = num % 1 !== 0;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: tieneCentavos ? 2 : 0,
    maximumFractionDigits: tieneCentavos ? 2 : 0,
  }).format(num);
}
function formatoFecha(f)     { if(!f)return'-'; return new Date(f).toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'}); }
function formatoFechaHora(f) { if(!f)return'-'; return new Date(f).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); }

// ============================================================
// MODALES
// ============================================================
function abrirModal(id)  { const m=document.getElementById(id); if(m){m.classList.add('activo');document.body.style.overflow='hidden';} }
function cerrarModal(id) { const m=document.getElementById(id); if(m){m.classList.remove('activo');document.body.style.overflow='';} }
document.addEventListener('click', e => { if(e.target.classList.contains('modal-overlay')){e.target.classList.remove('activo');document.body.style.overflow='';} });

// ============================================================
// BACKUP
// ============================================================
async function exportarEmpresaJSON(empresaId, empresaNombre) {
  try {
    mostrarAlerta('Preparando backup...', 'info', 8000);
    const [art, cli, ven, pro, com] = await Promise.all([
      sb.from('articulos').select('*').eq('empresa_id', empresaId),
      sb.from('clientes').select('*').eq('empresa_id', empresaId),
      sb.from('ventas').select('*').eq('empresa_id', empresaId),
      sb.from('proveedores').select('*').eq('empresa_id', empresaId),
      sb.from('compras').select('*').eq('empresa_id', empresaId),
    ]);
    const backup = { version:'4.0', empresa:empresaNombre, empresa_id:empresaId, exportado_at:new Date().toISOString(),
      datos:{ articulos:art.data||[], clientes:cli.data||[], ventas:ven.data||[], proveedores:pro.data||[], compras:com.data||[] } };
    const blob = new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `stockia-backup-${empresaNombre.replace(/\s+/g,'-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
    mostrarAlerta('Backup descargado ✓', 'exito');
  } catch(e){ mostrarAlerta('Error: '+e.message,'error'); }
}

async function exportarEmpresaCSV(empresaId, empresaNombre, tabla='ventas') {
  try {
    const {data} = await sb.from(tabla).select('*').eq('empresa_id', empresaId);
    if(!data?.length){mostrarAlerta('Sin datos para exportar','info');return;}
    const h = Object.keys(data[0]).join(',');
    const r = data.map(row=>Object.values(row).map(v=>{const s=v===null?'':String(v);return s.includes(',')||s.includes('"')?`"${s.replace(/"/g,'""')}"`:''+s;}).join(','));
    const csv = [h,...r].join('\n');
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download=`stockia-${tabla}-${empresaNombre.replace(/\s+/g,'-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    mostrarAlerta(`CSV de ${tabla} descargado ✓`,'exito');
  } catch(e){mostrarAlerta('Error: '+e.message,'error');}
}

async function importarBackupJSON(file, empresaId) {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=async e=>{
      try {
        const backup=JSON.parse(e.target.result);
        if(!backup.datos) throw new Error('Formato inválido');
        mostrarAlerta('Importando...','info',15000);
        for(const tabla of ['articulos','clientes','ventas','proveedores','compras']){
          const regs=backup.datos[tabla]||[];
          if(!regs.length)continue;
          const datos=regs.map(r=>({...r,empresa_id:empresaId}));
          const{error}=await sb.from(tabla).upsert(datos,{onConflict:'id'});
          if(error) throw new Error(`Error en ${tabla}: ${error.message}`);
        }
        mostrarAlerta('Importación completada ✓','exito'); resolve(true);
      } catch(err){mostrarAlerta('Error: '+err.message,'error');reject(err);}
    };
    reader.readAsText(file);
  });
}

document.querySelectorAll('.anio-actual').forEach(el=>el.textContent=new Date().getFullYear());
