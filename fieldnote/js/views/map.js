import { h, icon, section, empty, pct } from '../ui.js';
import { allVisits, allPlaces } from '../db.js';
import { state } from '../state.js';
import { OUTCOMES, labelOf } from '../catalog.js';
import { loadLeaflet, baseMap, pinIcon, OUTCOME_COLORS } from '../maplib.js';
import { splitByPeriod } from '../stats.js';

const RANK = { applied: 0, revisit: 1, info: 2, rejected: 3 };

let range = 'all';

/** 장소별 묶음: 가장 좋은 결과의 색으로 핀을 칠한다 */
function placeSummaries(visits, places) {
  const byPlace = new Map();
  for (const v of visits) {
    if (!v.placeId) continue;
    if (!byPlace.has(v.placeId)) byPlace.set(v.placeId, []);
    byPlace.get(v.placeId).push(v);
  }
  return places
    .filter((p) => byPlace.has(p.id))
    .map((p) => {
      const vs = byPlace.get(p.id);
      const best = vs.reduce((a, v) => (RANK[v.outcome] < RANK[a] ? v.outcome : a), 'rejected');
      return { ...p, visits: vs, n: vs.length, applied: vs.filter((v) => v.outcome === 'applied').length, best, last: vs[0].createdAt };
    })
    .sort((a, b) => (a.last < b.last ? 1 : -1));
}

export default async function mapView() {
  const [visits, places] = await Promise.all([allVisits(), allPlaces()]);
  const c = state.catalog;
  const mapEl = h('div.map');
  const listMount = h('div');
  let map;
  let layer;

  const switcher = h('div.period', { role: 'tablist', 'aria-label': '기간' });
  const drawSwitch = () =>
    switcher.replaceChildren(
      ...[
        ['month', '이번 달'],
        ['all', '전체'],
      ].map(([k, label]) =>
        h('button', { type: 'button', role: 'tab', class: range === k ? 'on' : '', 'aria-selected': String(range === k), onclick: () => { range = k; drawSwitch(); draw(); } }, label),
      ),
    );
  drawSwitch();

  function current() {
    return placeSummaries(range === 'all' ? visits : splitByPeriod(visits, 'month').current, places);
  }

  function drawMarkers(L, list, fit) {
    layer?.remove();
    layer = L.layerGroup().addTo(map);
    const pts = [];
    for (const p of list) {
      if (p.lat == null) continue;
      pts.push([p.lat, p.lng]);
      const popup = h(
        'div',
        h('div.popup-title', p.name),
        h('div', `${labelOf(c, 'industry', p.industry)} · 방문 ${p.n}회 · 신청 ${p.applied}건`),
        h('a.popup-link', { href: `#/place/${p.id}` }, '방문 이력 보기 →'),
      );
      L.marker([p.lat, p.lng], { icon: pinIcon(L, OUTCOME_COLORS[p.best]), title: p.name, riseOnHover: true }).bindPopup(popup).addTo(layer);
    }
    if (fit && pts.length) map.fitBounds(pts, { padding: [36, 36], maxZoom: 16 });
  }

  function drawList(list) {
    listMount.replaceChildren(
      section(
        `방문한 장소 ${list.length}곳`,
        list.length
          ? h(
              'ul.list',
              list.map((p) =>
                h(
                  'li.row',
                  { onclick: () => (location.hash = `#/place/${p.id}`) },
                  h('span.dot', { style: { background: OUTCOME_COLORS[p.best] } }),
                  h(
                    'div.row-main',
                    h('div.row-title', p.name),
                    h('div.row-sub', `${labelOf(c, 'industry', p.industry)} · 방문 ${p.n}회 · 신청률 ${pct(p.applied / p.n)}%${p.lat == null ? ' · 위치 없음' : ''}`),
                  ),
                  icon('chevron', 18),
                ),
              ),
            )
          : empty('이 기간에 기록한 장소가 없습니다.'),
      ),
    );
  }

  function draw(fit = true) {
    const list = current();
    drawList(list);
    if (map && window.L) drawMarkers(window.L, list, fit);
  }

  const legend = h(
    'div.map-legend',
    OUTCOMES.map((o) => h('span', h('i.dot', { style: { background: OUTCOME_COLORS[o.key], width: '10px', height: '10px' } }), o.label)),
  );

  const node = h(
    'div.page',
    h('div', { style: { margin: '4px 0 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' } }, switcher, h('span.small.muted', '핀 색 = 그 장소의 가장 좋은 결과')),
    h('div.map-wrap', mapEl, legend),
    listMount,
  );

  draw(false);

  return {
    title: '지도',
    node,
    async onMount() {
      try {
        const L = await loadLeaflet();
        if (!mapEl.isConnected) return;
        map = baseMap(L, mapEl, { zoom: 12 });
        drawMarkers(L, current(), true);
      } catch {
        mapEl.replaceChildren(h('div.map-fallback', '지도를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요. 아래 장소 목록은 그대로 볼 수 있습니다.'));
      }
    },
    onLeave() {
      map?.remove();
    },
  };
}
