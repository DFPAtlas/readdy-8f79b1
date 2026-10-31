// BuildNerve Service Worker — Phase 17
// Caches app shell and selected static resources only.
// Never caches: auth, API, secrets, tokens, signed URLs.

const CACHE_VERSION = 'v2.18.2';
const STATIC_CACHE = `site-ledger-static-${CACHE_VERSION}`;
const OFFLINE_PAGE = '/offline.html';

// Only cache the app shell — never API responses
const PRECACHE_URLS = [
  '/',
  OFFLINE_PAGE,
  '/icons/icon.svg',
  '/icons/icon-maskable.svg',
];

// Install: cache each resource independently so one unavailable optional file
// does not prevent the service worker from installing.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const results = await Promise.allSettled(
        PRECACHE_URLS.map((url) => cache.add(url))
      );
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(`BuildNerve precache failed for ${PRECACHE_URLS[index]}`, result.reason);
        }
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
          cache.put(event.request, networkResponse.clone()).catch((err) => {
            console.warn('BuildNerve cache write failed', err);
          });
          return networkResponse;
        } catch (err) {
          // Offline — try cache for documents, static assets
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;

          // The signed-in local reader can reuse the public app shell. No API data is cached.
          if (url.pathname === '/mobile/offline-jobs') {
            const shell = await caches.match('/');
            if (shell) return shell;
          }

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
// Explicit opt-in preparation caches only public same-origin build assets.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_OFFLINE_READER') return;
  const port = event.ports?.[0];
  if (!port) return;
  event.waitUntil((async () => {
    try {
      const response = await fetch('/', { cache: 'reload', credentials: 'omit' });
      if (!response.ok || response.redirected || !response.headers.get('content-type')?.includes('text/html')) throw new Error('Invalid app shell');
      const html = await response.clone().text();
      const assets = [...new Set([...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)].map(match => new URL(match[1], self.location.origin)).filter(url => url.origin === self.location.origin && url.pathname.startsWith('/assets/') && /\.(js|css)$/.test(url.pathname) && !url.search && !url.hash).map(url => url.href))];
      if (!assets.some(url => url.endsWith('.js')) || assets.length > 20) throw new Error('Missing app assets');
      const cache = await caches.open(STATIC_CACHE);
      await Promise.all(assets.map(async url => {
        const asset = await fetch(url, { cache: 'reload', credentials: 'omit' });
        if (!asset.ok || asset.redirected) throw new Error('Asset unavailable');
        await cache.put(url, asset);
      }));
      await cache.put('/', response);
      port.postMessage({ ready: true });
    } catch {
      port.postMessage({ ready: false });
    }
  })());
});
