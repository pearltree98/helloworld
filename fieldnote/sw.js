// 오프라인 캐시. 앱 파일과 지도 라이브러리는 미리 받아 두고, 폰트 조각은 처음 쓸 때 저장한다.
// 주소·날씨 조회와 지도 타일은 캐시하지 않는다(항상 최신, 실패하면 앱이 알아서 처리).
const VERSION = 'fieldnote-v1';
const APP = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/main.js', 'js/ui.js', 'js/db.js', 'js/state.js', 'js/catalog.js', 'js/stats.js', 'js/privacy.js',
  'js/geo.js', 'js/weather.js', 'js/maplib.js', 'js/demo.js',
  'js/views/home.js', 'js/views/record.js', 'js/views/report.js', 'js/views/visits.js', 'js/views/visit.js',
  'js/views/map.js', 'js/views/place.js', 'js/views/settings.js',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css', 'vendor/pretendard/pretendardvariable-dynamic-subset.css',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    // 앱 파일: 네트워크 우선(새 버전 반영), 실패하면 캐시
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('index.html'))),
    );
  }

});
