const CACHE_NAME = 'ledger-cache-v1.6.5';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/ledger-icon.svg',
  '/favicon.svg'
];

// Install: Cache core static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Strategy for offline capability & caching
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Strictly skip all API requests and non-GET requests from caching to protect dynamic financial data
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) {
    return;
  }

  // Handle static assets and navigation
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Network fetch with cache update
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (url.origin === location.origin || url.hostname.includes('fonts.') || url.hostname.includes('fontshare.com'))
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and request is HTML navigation, fallback to root / index.html
          if (event.request.mode === 'navigate') {
            return caches.match('/') || caches.match('/index.html');
          }
          return cachedResponse;
        });

      // Return cached response immediately if found, or wait for network
      return cachedResponse || fetchPromise;
    })
  );
});
