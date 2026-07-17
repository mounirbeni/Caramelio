const CACHE_NAME = 'caramelio-shell-v20';
const SHELL_FILES = [
  './',
  './index.html',
  './about.html',
  './menu.html',
  './gallery.html',
  './bakery.html',
  './reviews.html',
  './reserve.html',
  './location.html',
  './dashboard.html',
  './css/style.css',
  './js/script.js',
  './js/i18n.js',
  './js/motion.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Reservation data is dynamic and contains guest PII — never let the service worker
  // intercept or cache it, so the dashboard always sees live data straight from the network.
  if (new URL(event.request.url).pathname.startsWith('/api/')) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
