const CACHE_NAME = 'king-ai-v5';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// Install Service Worker and cache core static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate Service Worker and delete outdated caches
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

// Fetch event handler: Handles offline assets while bypassing external API calls
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // 1. Bypass non-GET requests (e.g., POST calls to Gemini API)
  if (req.method !== 'GET') return;

  // 2. Bypass external services and APIs
  if (
    req.url.includes('generativelanguage.googleapis.com') ||
    req.url.includes('getsafepay.com')
  ) {
    return;
  }

  // 3. Cache-first strategy for static assets with offline fallback
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(req).catch(() => caches.match('./index.html'));
    })
  );
});
