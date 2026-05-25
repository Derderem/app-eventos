importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.6.1/workbox-sw.js');

if (workbox) {
  console.log('Workbox cargado. Versión optimizada para PWABuilder.');

  // Forzar actualización al detectar cambios
  self.skipWaiting();
  workbox.core.clientsClaim();

  // 1. Caché para CSS, JS e Imágenes (Seguro, no bloquea al robot)
  workbox.routing.registerRoute(
    ({ request }) =>
      request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'image',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'recursos-estaticos',
    })
  );

  // 2. Caché específico para mapas de Leaflet (Vital para tu app)
  workbox.routing.registerRoute(
    ({ url }) => url.href.includes('leaflet') || url.href.includes('unpkg.com'),
    new workbox.strategies.CacheFirst({
      cacheName: 'mapas-leaflet',
    })
  );

  // 3. Estrategia para la navegación (HTML)
  // Ignoramos peticiones raras de robots, solo cacheamos navegación real de usuarios
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: 'paginas-html',
      networkTimeoutSeconds: 5,
    })
  );

} else {
  console.error('Workbox falló al cargar');
}
