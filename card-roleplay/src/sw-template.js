/*
 * Service worker for 카드 응대 연습.
 * This is a template: vite.config.js fills in the version and the precache
 * list at build time and writes the result to dist/sw.js.
 */
const VERSION = '__VERSION__';
const PRECACHE = '__PRECACHE__';
const CACHE = `card-roleplay-${VERSION}`;
const SHELL = new URL('index.html', self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith('card-roleplay-') && key !== CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

function isAppPage(url) {
  const last = url.pathname.split('/').pop();
  return last === '' || last === 'index.html' || !last.includes('.');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // The app is one page with hash routing: every page load gets the cached shell.
  if (request.mode === 'navigate' && isAppPage(url)) {
    event.respondWith(
      caches.match(SHELL, { cacheName: CACHE }).then((hit) => hit || fetch(request)),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const hit = await caches.match(request, { cacheName: CACHE });
      if (hit) return hit;
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE);
        cache.put(request, response.clone());
      }
      return response;
    })(),
  );
});
