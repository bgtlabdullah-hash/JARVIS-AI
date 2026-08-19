const CACHE_NAME = 'king-ai-v8'; // Bumped version to break old cache
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// Install Event: Cache app shell assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Smart routing for static files vs API requests
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // 1. Bypass Service Worker for non-GET requests (e.g. POST to AI APIs)
  if (req.method !== 'GET') {
    return;
  }

  // 2. Network-First strategy with proper fallbacks for GET requests
  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        // Optional: Cache newly fetched static GET resources
        if (networkResponse && networkResponse.status === 200 && req.url.startsWith(self.location.origin)) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, responseClone));
        }
        return networkResponse;
      })
      .catch(async () => {
        // Fallback to cache if network fails
        const cachedResponse = await caches.match(req);
        if (cachedResponse) {
          return cachedResponse;
        }
        // If navigating to a page offline, return index.html
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
      })
  );
});
