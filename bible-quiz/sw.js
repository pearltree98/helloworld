// 서비스 워커: 오프라인 지원 (PWABuilder/APK 변환 요건)
//
// 전략: 네트워크 우선 → 실패하거나 4초 안에 응답이 없으면 캐시.
// 그래서 data/*.json 에 문항을 추가하고 배포하면, 온라인일 때 바로 새 문항이 보인다.
// 앱 파일 목록(SHELL)을 바꿨을 때만 VERSION을 올리면 된다.

const VERSION = '2026-11-25.1';
const CACHE = `bible-quiz-${VERSION}`;
const NETWORK_TIMEOUT_MS = 4000;

const SHELL = [
  './',
  './index.html',
  './css/app.css',
  './js/app.js',
  './js/store.js',
  './js/data.js',
  './js/schema.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// 설치할 때 문항 파일도 미리 받아 둔다 (첫 방문 직후 오프라인이어도 풀 수 있게).
async function precacheData(cache) {
  try {
    const res = await fetch('./data/eras.json', { cache: 'no-cache' });
    if (!res.ok) return;
    await cache.put('./data/eras.json', res.clone());
    const { eras = [] } = await res.json();
    const files = eras.flatMap((e) => (Array.isArray(e.files) && e.files.length ? e.files : [`${e.id}.json`]));
    await Promise.all(
      files.map(async (f) => {
        try {
          const r = await fetch(`./data/${f}`, { cache: 'no-cache' });
          if (r.ok || r.status === 404) await cache.put(`./data/${f}`, r);
        } catch {
          /* 다음에 온라인일 때 채워진다 */
        }
      }),
    );
  } catch {
    /* 무시 */
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(SHELL);
      await precacheData(cache);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('bible-quiz-') && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(networkFirst(event, url));
});

async function networkFirst(event, url) {
  const req = event.request;
  const isNav = req.mode === 'navigate';
  const isData = url.pathname.includes('/data/');
  const cache = await caches.open(CACHE);

  const network = fetch(req).then(async (res) => {
    // 없는 시대 파일(404)도 기억해 두어, 오프라인에서 '준비 중'으로 보이게 한다.
    if (res.ok || (isData && res.status === 404)) await cache.put(req, res.clone());
    return res;
  });
  event.waitUntil(network.catch(() => {}));

  const cached =
    (await cache.match(req, { ignoreSearch: isNav })) ||
    (isNav ? (await cache.match('./index.html')) || (await cache.match('./')) : undefined);

  if (!cached) {
    return network.catch(
      () => new Response('오프라인 상태입니다.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }),
    );
  }

  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(cached), NETWORK_TIMEOUT_MS);
  });
  try {
    return await Promise.race([network, timeout]);
  } catch {
    return cached;
  } finally {
    clearTimeout(timer);
  }
}
