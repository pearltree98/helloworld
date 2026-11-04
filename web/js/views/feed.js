import { api, meta } from '../api.js';
import { h, clear, fmtDate, labelOf, riskBadge, loading, errorBox } from '../ui.js';

const state = { category: '', sort: 'recent', q: '' };

export async function feedView(root) {
  const { categories } = await meta();
  const hero = h('section', { class: 'hero' },
    h('h1', {}, '아무 일도 일어나지 않은 것이 가장 큰 승리입니다.'),
    h('p', {}, '아찔했던 순간, 영상으로 본 사고, 부모님 댁 욕실. 거기서 배운 "피하는 행동"을 기록하고 다음 사람에게 건넵니다.'),
  );
  const stats = h('section', { class: 'stats' });
  const chips = h('div', { class: 'chips' },
    chip('전체', '', categories),
    ...categories.map((c) => chip(c.label, c.key, categories)),
  );
  const search = h('input', { type: 'text', placeholder: '검색: 후진, 사다리, 블랙아이스…', value: state.q,
    oninput: (e) => { state.q = e.target.value; debounce(load); } });
  const sort = h('select', { onchange: (e) => { state.sort = e.target.value; load(); } },
    opt('recent', '최신순'), opt('risk', '위험도순'), opt('lessons', '교훈 많이 받은 순'));
  sort.value = state.sort;
  const list = h('section', { class: 'cards' });

  clear(root).append(hero, stats, h('div', { class: 'toolbar' }, search, sort), chips, h('div', { style: 'height:16px' }), list);

  api.stats().then((s) => {
    clear(stats).append(
      stat(s.cases, '기록된 사례'),
      stat(s.lessons, '교훈을 받은 횟수'),
      stat(s.tickets_on_wall, '벽에 붙은 티켓'),
      stat(s.tickets_taken, '건네진 티켓'),
    );
  }).catch(() => stats.remove());

  async function load() {
    for (const el of chips.children) el.classList.toggle('active', el.dataset.key === state.category);
    list.replaceChildren(loading());
    try {
      const { items } = await api.cases({ category: state.category, sort: state.sort, q: state.q });
      list.replaceChildren(...(items.length ? items.map((c) => card(c, categories)) : [h('p', { class: 'empty' }, '아직 기록이 없습니다. 첫 번째 사례를 남겨주세요.')]));
    } catch (e) {
      list.replaceChildren(errorBox(e));
    }
  }
  load();

  function chip(label, key) {
    return h('button', { class: 'chip', type: 'button', dataset: { key }, onclick: () => { state.category = key; load(); } }, label);
  }
}

let t;
function debounce(fn) { clearTimeout(t); t = setTimeout(fn, 250); }
const opt = (v, l) => h('option', { value: v }, l);
const stat = (n, label) => h('div', { class: 'stat' }, h('b', {}, Number(n).toLocaleString('ko-KR')), h('span', {}, label));

export function card(c, categories) {
  return h('a', { class: 'card', href: `#/case/${c.id}` },
    h('div', { class: 'meta', style: 'margin:0' }, h('span', { class: 'tag' }, labelOf(categories, c.category)), riskBadge(c)),
    h('h3', {}, c.title),
    h('p', { class: 'lead' }, c.situation),
    h('p', { class: 'avoid' }, h('b', {}, '피하는 행동 · '), c.avoidance),
    h('div', { class: 'meta' },
      h('span', {}, `교훈 ${c.lesson_count}`),
      h('span', {}, `티켓 ${c.tickets_on_wall}장`),
      h('span', {}, fmtDate(c.created_at)),
    ),
  );
}
