// 위치: 내(모집인) 현재 위치만 쓴다. 외부로 보내는 값은 좌표뿐이다.

export const SAME_PLACE_METERS = 150;

export function getPosition({ timeout = 12000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('이 브라우저는 위치 기능을 지원하지 않습니다.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy) }),
      (err) => {
        const msg =
          err.code === 1
            ? '위치 권한이 꺼져 있습니다. 브라우저 설정에서 허용해 주세요.'
            : err.code === 3
              ? '위치를 찾는 데 시간이 너무 걸립니다. 실외에서 다시 시도해 주세요.'
              : '위치를 찾지 못했습니다.';
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout, maximumAge: 30000 },
    );
  });
}

/** 두 좌표 사이 거리(m) */
export function distance(a, b) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 가까운 장소 목록(가까운 순) */
export function nearbyPlaces(places, pos, within = SAME_PLACE_METERS) {
  if (!pos) return [];
  return places
    .filter((p) => p.lat != null)
    .map((p) => ({ ...p, distance: distance(pos, p) }))
    .filter((p) => p.distance <= within)
    .sort((a, b) => a.distance - b.distance);
}

/** 좌표 → 짧은 한국어 주소(OpenStreetMap Nominatim). 실패하면 null */
export async function reverseGeocode({ lat, lng }) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&accept-language=ko&lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    clearTimeout(t);
    if (!res.ok) return null;
    const j = await res.json();
    const a = j.address ?? {};
    const area = a.city || a.province || a.state || '';
    const district = a.borough || a.county || a.city_district || a.district || '';
    const dong = a.quarter || a.suburb || a.neighbourhood || a.village || '';
    const road = a.road ? `${a.road}${a.house_number ? ` ${a.house_number}` : ''}` : '';
    const parts = [area, district, road || dong].filter(Boolean);
    const short = parts.join(' ');
    return { address: short || j.display_name || null, building: a.building || a.office || a.amenity || a.shop || null };
  } catch {
    return null;
  }
}

export function formatCoord(pos) {
  if (!pos) return '';
  return `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`;
}
