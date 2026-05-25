importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.6.1/workbox-sw.js');

if (workbox) {

  console.log('✅ Workbox cargado correctamente');

  workbox.setConfig({
    debug: false
  });

  // Precarga archivos esenciales
  workbox.precaching.precacheAndRoute([
    { url: '/', revision: null },
    { url: '/index.html', revision: null },
    { url: '/manifest.json', revision: null },
    { url: '/icon-192.png', revision: null },
    { url: '/icon-512.png', revision: null },
  ]);

  // Cache para JS, CSS e imágenes
  workbox.routing.registerRoute(
    ({ request }) =>
      request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'image',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'assets-cache',
    })
  );

  // Cache especial para Leaflet y recursos externos
  workbox.routing.registerRoute(
    ({ url }) =>
      url.href.includes('leaflet') ||
      url.href.includes('unpkg.com'),
    new workbox.strategies.CacheFirst({
      cacheName: 'leaflet-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
        }),
      ],
    })
  );

  // Navegación SPA para React
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'pages-cache',
    })
  );

  // Activar inmediatamente el nuevo SW
  self.addEventListener('install', () => {
    self.skipWaiting();
  });

  self.addEventListener('activate', () => {
    self.clients.claim();
  });

  console.log('✅ Eventora PWA - Service Worker activo');

} else {

  console.log('❌ Workbox no pudo cargarse');

}
