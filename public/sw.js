// BuildNerve Service Worker — Phase 17
// Caches app shell and selected static resources only.
// Never caches: auth, API, secrets, tokens, signed URLs.

const CACHE_VERSION = 'v2.18.0';
const STATIC_CACHE = `site-ledger-static-${CACHE_VERSION}`;
const OFFLINE_PAGE = '/offline.html';

// Only cache the app shell — never API responses
const PRECACHE_URLS = [
  '/',
  OFFLINE_PAGE,
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install: precache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Gracefully handle individual cache failures
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('site-ledger-static-') && name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Helper: should this request be cached?
function isCacheableRequest(request) {
  const url = new URL(request.url);

  // Only GET requests
  if (request.method !== 'GET') return false;

  // Only same-origin
  if (url.origin !== self.location.origin) return false;

  // Never cache authentication
  if (url.pathname.startsWith('/auth/')) return false;
  if (url.pathname.includes('/api/')) return false;

  // Never cache Supabase calls
  if (url.pathname.includes('/rest/v1/')) return false;
  if (url.pathname.includes('/storage/v1/')) return false;
  if (url.pathname.includes('/functions/v1/')) return false;

  // Only HTML documents and static asset requests
  if (request.destination === 'document') return true;
  if (request.destination === 'style') return true;
  if (request.destination === 'script') return true;
  if (request.destination === 'font') return true;
  if (request.destination === 'image') return true;

  return false;
}

self.addEventListener('fetch', (event) => {
  // Skip non-GET and non-http(s)
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Never cache Supabase or API requests
  if (url.hostname.includes('supabase.co') ||
      url.pathname.includes('/rest/v1/') ||
      url.pathname.includes('/storage/v1/') ||
      url.pathname.includes('/functions/v1/') ||
      url.pathname.includes('/auth/')) {
    return; // Let browser handle normally
  }

  event.respondWith(
    (async () => {
      // Try network first for cacheable requests
      if (isCacheableRequest(event.request)) {
        try {
          const networkResponse = await fetch(event.request);
          // Cache a clone
          const cache = await caches.open(STATIC_CACHE);
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        } catch (err) {
          // Offline — try cache for documents, static assets
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;

          // For document navigation requests, show offline fallback
          if (event.request.destination === 'document' || event.request.mode === 'navigate') {
            const offlineFallback = await caches.match(OFFLINE_PAGE);
            if (offlineFallback) return offlineFallback;
          }

          throw err;
        }
      }

      // Non-cacheable: network only, with offline fallback for navigation
      try {
        return await fetch(event.request);
      } catch (err) {
        if (event.request.destination === 'document' || event.request.mode === 'navigate') {
          const offlineFallback = await caches.match(OFFLINE_PAGE);
          if (offlineFallback) return offlineFallback;
        }
        throw err;
      }
    })()
  );
});

// Handle update notification
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});