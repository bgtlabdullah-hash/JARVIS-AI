const CACHE_NAME = 'king-ai-v9';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// Install Event - Pre-cache essential app shell assets
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force active state immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate Event - Clear old caches (v8, v7, etc.) immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network-first strategy with API call bypass
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // 1. Completely BYPASS Service Worker for non-GET requests (e.g. POST to OpenAI)
  if (event.request.method !== 'GET') {
    return;
  }

  // 2. BYPASS Service Worker for external APIs (OpenAI, Pollinations, CORS proxies)
  if (
    requestUrl.hostname.includes('openai.com') ||
    requestUrl.hostname.includes('corsproxy.io') ||
    requestUrl.hostname.includes('pollinations.ai')
  ) {
    return;
  }

  // 3. For local static assets (Network-First, fallback to Cache)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If network request succeeds, clone and update cache dynamically
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if offline
        return caches.match(event.request);
      })
  );
});
