// Leaflet을 필요할 때만 불러온다(지도·기록 화면). 앱 안에 포함된 파일(vendor/leaflet)을 쓴다.
const CSS = 'vendor/leaflet/leaflet.css';
const JS = 'vendor/leaflet/leaflet.js';

let loading;
export function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CSS;
    document.head.append(link);
    const s = document.createElement('script');
    s.src = JS;
    s.onload = () => resolve(window.L);
    s.onerror = () => {
      loading = null;
      reject(new Error('지도를 불러오지 못했습니다.'));
    };
    document.head.append(s);
  });
  return loading;
}

export const OUTCOME_COLORS = {
  applied: 'var(--o-applied)',
  revisit: 'var(--o-revisit)',
  info: 'var(--o-info)',
  rejected: 'var(--o-rejected)',
};

export function baseMap(L, el, { center = [37.5665, 126.978], zoom = 15, interactive = true } = {}) {
  const map = L.map(el, {
    center,
    zoom,
    zoomControl: interactive,
    attributionControl: true,
    dragging: interactive,
    scrollWheelZoom: interactive,
    touchZoom: interactive,
    doubleClickZoom: interactive,
  });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  return map;
}

export function pinIcon(L, color) {
  return L.divIcon({
    className: '',
    html: `<div class="pin" style="background:${color}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

export function mineIcon(L) {
  return L.divIcon({ className: '', html: '<div class="pin-mine"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
}
