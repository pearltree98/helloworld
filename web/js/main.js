import { feedView } from './views/feed.js';
import { caseView } from './views/caseDetail.js';
import { newCaseView } from './views/newCase.js';
import { wallView } from './views/wall.js';
import { aboutView } from './views/about.js';
import { nickname, setNickname } from './identity.js';
import { api } from './api.js';
import { errorBox, toast } from './ui.js';

const routes = [
  { pattern: /^\/?$/, view: feedView },
  { pattern: /^\/case\/(\d+)$/, view: caseView, params: ['id'] },
  { pattern: /^\/new$/, view: newCaseView },
  { pattern: /^\/wall$/, view: wallView },
  { pattern: /^\/about$/, view: aboutView },
];

const main = document.getElementById('main');
let token = 0;

async function render() {
  const path = location.hash.replace(/^#/, '') || '/';
  const my = ++token;
  for (const link of document.querySelectorAll('.nav a[data-route]')) {
    link.classList.toggle('active', link.dataset.route === (path.startsWith('/case/') ? '/' : path));
  }
  for (const r of routes) {
    const m = path.match(r.pattern);
    if (!m) continue;
    const params = Object.fromEntries((r.params ?? []).map((k, i) => [k, m[i + 1]]));
    try {
      await r.view(main, params);
    } catch (e) {
      if (my === token) main.replaceChildren(errorBox(e));
      console.error(e);
    }
    window.scrollTo({ top: 0 });
    return;
  }
  main.replaceChildren(errorBox(new Error('페이지를 찾을 수 없습니다.')));
}

function paintWho() {
  document.getElementById('whoami').textContent = `${nickname()} ✎`;
}

document.getElementById('whoami').addEventListener('click', async () => {
  const next = prompt('이 브라우저에서 쓸 별명 (20자 이내)', nickname());
  if (next === null) return;
  const clean = setNickname(next);
  paintWho();
  try { await api.setMe(clean); toast(`이제 "${clean}"으로 기록됩니다.`); } catch { /* 오프라인 */ }
});

window.addEventListener('hashchange', render);
paintWho();
render();
