// Stockia Service Worker v5.2
// Cache básico para funcionamiento offline parcial

const CACHE_NAME = 'stockia-v5.2';
const ASSETS_CACHE = 'stockia-assets-v5.2';

// Archivos estáticos a cachear (CSS, JS, fuentes)
const STATIC_ASSETS = [
  '/css/global.css',
  '/js/global.js',
];

// Páginas de la app
const APP_PAGES = [
  '/login.html',
  '/dashboard.html',
  '/ventas.html',
  '/articulos.html',
  '/clientes.html',
  '/proveedores.html',
  '/admin-empresa.html',
  '/admin-global.html',
];

// ── Instalación: cachear assets estáticos ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(ASSETS_CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

// ── Activación: limpiar caches viejos ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== ASSETS_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: estrategia Network First para páginas, Cache First para assets ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Solo manejar peticiones del mismo origen (no Supabase, no fuentes)
  if (url.origin !== self.location.origin) return;

  // Para assets estáticos: Cache First
  if (url.pathname.startsWith('/css/') || url.pathname.startsWith('/js/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(ASSETS_CACHE).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Para páginas HTML: Network First (datos siempre frescos)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Sin red: servir desde cache si existe
          return caches.match(event.request).then(cached => {
            return cached || caches.match('/login.html');
          });
        })
    );
    return;
  }
});
