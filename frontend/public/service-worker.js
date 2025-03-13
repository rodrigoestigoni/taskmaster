/* eslint-disable no-restricted-globals */

// Este service worker pode ser personalizado
// Veja https://developers.google.com/web/tools/workbox/modules para mais informações
self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open('taskmaster-v1').then((cache) => {
        return cache.addAll([
          '/',
          '/index.html',
          '/static/js/main.chunk.js',
          '/static/js/0.chunk.js',
          '/static/js/bundle.js',
          '/manifest.json',
          '/favicon.ico',
          '/logo192.png',
          '/logo512.png',
        ]);
      })
    );
    self.skipWaiting();
  });
  
  self.addEventListener('fetch', (event) => {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  });
  
  self.addEventListener('activate', (event) => {
    const cacheWhitelist = ['taskmaster-v1'];
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
    self.clients.claim();
  });