import { api, meta } from '../api.js';
import { h, clear, fmtDate, fmtNum, labelOf, riskText, loading, errorBox, sep } from '../ui.js';
import { t } from '../i18n.js';

const state = { category: '', sort: 'recent', q: '' };

export async function feedView(root) {
  const m = await meta();
  const stats = h('p', { class: 'muted' });
  const category = h('select', { 'aria-label': t('form.category'), onchange: (e) => { state.category = e.target.value; load(); } },
    h('option', { value: '' }, t('home.category')),
    ...m.categories.map((c) => h('option', { value: c.key }, c.label)));
  category.value = state.category;
  const sort = h('select', { 'aria-label': t('home.sort.recent'), onchange: (e) => { state.sort = e.target.value; load(); } },
    ...['recent', 'risk', 'lessons'].map((k) => h('option', { value: k }, t(`home.sort.${k}`))));
  sort.value = state.sort;
  const search = h('input', { type: 'search', placeholder: t('home.search'), 'aria-label': t('home.search'), value: state.q,
    oninput: (e) => { state.q = e.target.value; debounce(load); } });
  const list = h('ul', { class: 'list' });

  clear(root).append(
    h('h1', {}, t('home.h1')),
    h('p', { class: 'lead' }, t('home.lead')),
    stats,
    h('div', { class: 'filters' }, category, sort, search),
    list,
    h('p', { class: 'muted' }, h('a', { href: '/api/export', download: 'stepback-export.json' }, t('home.export'))),
  );

  api.stats().then((s) => {
    stats.textContent = t('home.stats', { cases: fmtNum(s.cases), lessons: fmtNum(s.lessons), wall: fmtNum(s.tickets_on_wall), taken: fmtNum(s.tickets_taken) });
  }).catch(() => stats.remove());

  async function load() {
    list.replaceChildren(h('li', {}, loading()));
    try {
      const { items } = await api.cases({ category: state.category, sort: state.sort, q: state.q });
      list.replaceChildren(...(items.length ? items.map((c) => row(c, m)) : [h('li', { class: 'muted' }, t('home.empty'))]));
    } catch (e) {
      list.replaceChildren(h('li', {}, errorBox(e)));
    }
  }
  load();
}

let timer;
const debounce = (fn) => { clearTimeout(timer); timer = setTimeout(fn, 250); };

function row(c, m) {
  return h('li', { class: 'row' },
    h('a', { class: 'row-title', href: `#/case/${c.id}`, dir: 'auto' }, c.title),
    h('div', { class: 'meta' },
      labelOf(m.categories, c.category), sep(),
      riskText(c, m.risk_levels), sep(),
      t('card.lessons', { n: c.lesson_count }), sep(),
      t('card.tickets', { n: c.tickets_on_wall }), sep(),
      fmtDate(c.created_at),
    ),
    h('p', { class: 'row-avoid' }, h('b', {}, t('card.avoid')), ' ', h('span', { dir: 'auto' }, c.avoidance)),
  );
}
