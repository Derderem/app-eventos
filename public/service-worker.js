importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.6.1/workbox-sw.js');

const OFFLINE_HTML = '/index.html';

if (workbox) {
  console.log('🚀 Workbox activado - Versión Final Offline');

  // 1. Guardamos el index.html en el móvil nada más instalar
  self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
      caches.open('offline-cache').then((cache) => cache.add(OFFLINE_HTML))
    );
  });
  workbox.core.clientsClaim();

  // 2. Caché para CSS, JS, Imágenes y Mapas de Leaflet
  workbox.routing.registerRoute(
    ({ request, url }) =>
      request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'image' ||
      url.href.includes('leaflet') || 
      url.href.includes('unpkg.com'),
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'recursos-app',
    })
  );

  // 3. Estrategia de Navegación: Intentar red, si falla, usar caché
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.NetworkOnly()
  );

  // 4. EL TRUCO DE MAGIA OFFLINE: Si falla la red (Modo Avión), muestra el index.html
  workbox.routing.setCatchHandler(({ event }) => {
    if (event.request.mode === 'navigate') {
      return caches.match(OFFLINE_HTML);
    }
    return Response.error();
  });

}
