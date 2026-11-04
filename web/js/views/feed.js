import { api, meta } from '../api.js';
import { h, clear, fmtDate, labelOf, riskBadge, loading, errorBox, stat } from '../ui.js';
import { t } from '../i18n.js';

const state = { category: '', sort: 'recent', q: '' };

export async function feedView(root) {
  const m = await meta();
  const hero = h('section', { class: 'hero' }, h('h1', {}, t('home.h1')), h('p', {}, t('home.lead')));
  const stats = h('section', { class: 'stats' });
  const chips = h('div', { class: 'chips' }, chip(t('home.all'), ''), ...m.categories.map((c) => chip(c.label, c.key)));
  const search = h('input', { type: 'text', placeholder: t('home.search'), value: state.q,
    oninput: (e) => { state.q = e.target.value; debounce(load); } });
  const sort = h('select', { onchange: (e) => { state.sort = e.target.value; load(); } },
    ...['recent', 'risk', 'lessons'].map((k) => h('option', { value: k }, t(`home.sort.${k}`))));
  sort.value = state.sort;
  const list = h('section', { class: 'cards' });

  clear(root).append(hero, stats, h('div', { class: 'toolbar' }, search, sort), chips, h('div', { style: 'height:16px' }), list);

  api.stats().then((s) => {
    clear(stats).append(
      stat(s.cases, t('home.stats.cases')),
      stat(s.lessons, t('home.stats.lessons')),
      stat(s.tickets_on_wall, t('home.stats.wall')),
      stat(s.tickets_taken, t('home.stats.taken')),
    );
  }).catch(() => stats.remove());

  async function load() {
    for (const el of chips.children) el.classList.toggle('active', el.dataset.key === state.category);
    list.replaceChildren(loading());
    try {
      const { items } = await api.cases({ category: state.category, sort: state.sort, q: state.q });
      list.replaceChildren(...(items.length ? items.map((c) => card(c, m)) : [h('p', { class: 'empty' }, t('home.empty'))]));
    } catch (e) {
      list.replaceChildren(errorBox(e));
    }
  }
  load();

  function chip(label, key) {
    return h('button', { class: 'chip', type: 'button', dataset: { key }, onclick: () => { state.category = key; load(); } }, label);
  }
}

let timer;
const debounce = (fn) => { clearTimeout(timer); timer = setTimeout(fn, 250); };

export function card(c, m) {
  return h('a', { class: 'card', href: `#/case/${c.id}` },
    h('div', { class: 'meta', style: 'margin:0' }, h('span', { class: 'tag' }, labelOf(m.categories, c.category)), riskBadge(c, m.risk_levels)),
    h('h3', {}, c.title),
    h('p', { class: 'lead' }, c.situation),
    h('p', { class: 'avoid' }, h('b', {}, t('card.avoid')), c.avoidance),
    h('div', { class: 'meta' },
      h('span', {}, t('card.lessons', { n: c.lesson_count })),
      h('span', {}, t('card.tickets', { n: c.tickets_on_wall })),
      h('span', {}, fmtDate(c.created_at)),
    ),
  );
}
