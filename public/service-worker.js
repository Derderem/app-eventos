// Service Worker de Eventora - PWA Instalable
const CACHE_NAME = 'eventora-cache-v1';

// Archivos que se guardarán para funcionar sin internet
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

// Cuando se instala el Service Worker
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('Eventora: Guardando archivos en caché');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Cuando se activa
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) { return name !== CACHE_NAME; })
          .map(function(name) { return caches.delete(name); })
      );
    })
  );
  self.clients.claim();
});

// Cuando la app pide un recurso (internet o caché)
self.addEventListener('fetch', function(event) {
  // Solo cachear peticiones GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Si hay internet, usar la respuesta de internet
        return response;
      })
      .catch(function() {
        // Si NO hay internet, buscar en caché
        return caches.match(event.request).then(function(cached) {
          return cached || caches.match('/index.html');
        });
      })
  );
});
