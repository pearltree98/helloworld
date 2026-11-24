import { h, icon, toast } from './ui.js';
import { loadState } from './state.js';
import home from './views/home.js';
import record from './views/record.js';
import report from './views/report.js';
import visits from './views/visits.js';
import visit from './views/visit.js';
import mapView from './views/map.js';
import place from './views/place.js';
import settings from './views/settings.js';

const NAV = {
  home: { label: '홈', icon: 'home' },
  report: { label: '성적표', icon: 'report' },
  visits: { label: '기록', icon: 'list' },
  record: { label: '방문 기록', icon: 'plus' },
  map: { label: '지도', icon: 'map' },
  settings: { label: '설정', icon: 'settings' },
};

const ROUTES = [
  [/^\/?$/, home, 'home'],
  [/^\/report$/, report, 'report'],
  [/^\/record(?:\/([\w-]+))?$/, record, 'record'],
  [/^\/visits$/, visits, 'visits'],
  [/^\/visit\/([\w-]+)$/, visit, 'visits'],
  [/^\/map$/, mapView, 'map'],
  [/^\/place\/([\w-]+)$/, place, 'map'],
  [/^\/settings$/, settings, 'settings'],
];

function buildNav() {
  for (const a of document.querySelectorAll('[data-nav]')) {
    const n = NAV[a.dataset.nav];
    if (a.classList.contains('tab-record')) {
      a.append(h('span.tab-plus', icon('plus', 24)), h('span.lbl', n.label));
    } else {
      a.append(icon(n.icon, 22), h('span', n.label));
    }
  }
}

let current = null;
let renderSeq = 0;

async function route() {
  const path = location.hash.replace(/^#/, '') || '/';
  const [re, view, navKey] = ROUTES.find(([r]) => r.test(path)) ?? ROUTES[0];
  const params = path.match(re)?.slice(1) ?? [];
  const seq = ++renderSeq;

  current?.onLeave?.();
  current = null;

  for (const a of document.querySelectorAll('[data-nav]')) a.classList.toggle('on', a.dataset.nav === navKey);

  let result;
  try {
    result = await view(...params);
  } catch (err) {
    console.error(err);
    result = { title: '문제가 생겼습니다', node: h('div.page', h('div.notice.bad', String(err.message ?? err))) };
  }
  if (seq !== renderSeq) {
    result.onLeave?.();
    return;
  }
  current = result;

  const bar = document.getElementById('topbar');
  bar.replaceChildren(
    ...[
    result.back
      ? h('button.icon-btn.back', { type: 'button', 'aria-label': '뒤로', onclick: () => (history.length > 1 ? history.back() : (location.hash = result.back)) }, icon('back', 24))
      : null,
    h('h1', result.title),
    ...(result.actions ?? []),
    ].filter(Boolean),
  );
  const view$ = document.getElementById('view');
  view$.replaceChildren(result.node);
  if (!result.keepScroll) window.scrollTo(0, 0);
  document.title = `${result.title} · 현장노트`;
  result.onMount?.();
}

async function start() {
  buildNav();
  try {
    await loadState();
  } catch (err) {
    console.error(err);
    toast('저장소를 열 수 없습니다. 사생활 보호 모드에서는 저장이 안 될 수 있습니다.', 'bad');
  }
  window.addEventListener('hashchange', route);
  await route();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

start();
