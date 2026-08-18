const CACHE_NAME = 'king-ai-v1';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// Install Service Worker and cache basic static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Service Worker and clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event handler with API and non-GET bypass
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // 1. Skip non-GET requests (POST requests to Gemini API cannot be cached)
  if (req.method !== 'GET') {
    return;
  }

  // 2. Skip external API requests (Gemini API, Safepay, etc.)
  if (req.url.includes('generativelanguage.googleapis.com') || req.url.includes('getsafepay.com')) {
    return;
  }

  // 3. Cache-First strategy for static local assets
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(req).catch(() => {
        // Fallback for offline mode if asset isn't cached
        return caches.match('./index.html');
      });
    })
  );
});
