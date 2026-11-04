import { feedView } from './views/feed.js';
import { caseView } from './views/caseDetail.js';
import { newCaseView } from './views/newCase.js';
import { wallView } from './views/wall.js';
import { aboutView } from './views/about.js';
import { nickname, setNickname } from './identity.js';
import { api } from './api.js';
import { h, clear, errorBox, toast } from './ui.js';
import { t, locale, setLocale, LOCALES, BRAND } from './i18n.js';

const routes = [
  { pattern: /^\/?$/, view: feedView, nav: '/' },
  { pattern: /^\/case\/(\d+)$/, view: caseView, params: ['id'], nav: '/' },
  { pattern: /^\/new$/, view: newCaseView, nav: '/new' },
  { pattern: /^\/wall$/, view: wallView, nav: '/wall' },
  { pattern: /^\/about$/, view: aboutView, nav: '/about' },
];

const main = document.getElementById('main');
let token = 0;

function paintChrome() {
  document.documentElement.lang = locale;
  document.getElementById('brand-name').textContent = BRAND;
  document.getElementById('footer').textContent = `${BRAND} · ${t('footer')}`;
  clear(document.getElementById('nav')).append(
    h('a', { href: '#/', dataset: { route: '/' } }, t('nav.cases')),
    h('a', { href: '#/wall', dataset: { route: '/wall' } }, t('nav.wall')),
    h('a', { href: '#/about', dataset: { route: '/about' } }, t('nav.about')),
    h('a', { href: '#/new', dataset: { route: '/new' }, class: 'btn btn--primary btn--sm' }, t('nav.new')),
  );
  const lang = document.getElementById('lang');
  clear(lang).append(...LOCALES.map((l) => h('option', { value: l.key }, l.label)));
  lang.value = locale;
  lang.setAttribute('aria-label', t('lang.label'));
  const who = document.getElementById('whoami');
  who.textContent = `${nickname()} ✎`;
  who.title = t('who.edit');
}

async function render() {
  const path = location.hash.replace(/^#/, '') || '/';
  const my = ++token;
  const route = routes.find((r) => r.pattern.test(path));
  for (const link of document.querySelectorAll('.nav a[data-route]')) {
    link.classList.toggle('active', link.dataset.route === route?.nav);
  }
  if (!route) return main.replaceChildren(errorBox(new Error(t('errors.not_found'))));
  const m = path.match(route.pattern);
  const params = Object.fromEntries((route.params ?? []).map((k, i) => [k, m[i + 1]]));
  try {
    await route.view(main, params);
  } catch (e) {
    if (my === token) main.replaceChildren(errorBox(e));
    console.error(e);
  }
  window.scrollTo({ top: 0 });
}

document.getElementById('whoami').addEventListener('click', async () => {
  const next = prompt(t('who.edit'), nickname());
  if (next === null) return;
  const clean = setNickname(next);
  paintChrome();
  try { await api.setMe(clean); toast(t('who.saved', { name: clean })); } catch { /* offline */ }
});

document.getElementById('lang').addEventListener('change', (e) => {
  setLocale(e.target.value);
  paintChrome();
  render();
});

window.addEventListener('hashchange', render);
paintChrome();
render();
