import { feedView } from './views/feed.js';
import { caseView } from './views/caseDetail.js';
import { newCaseView } from './views/newCase.js';
import { wallView } from './views/wall.js';
import { aboutView } from './views/about.js';
import { nickname, setNickname } from './identity.js';
import { api } from './api.js';
import { h, clear, errorBox, loading, toast } from './ui.js';
import { t, locale, setLocale, initI18n, available, BRAND } from './i18n.js';

const routes = [
  { pattern: /^\/?$/, view: feedView, nav: '/' },
  { pattern: /^\/case\/(\d+)$/, view: caseView, params: ['id'], nav: '/' },
  { pattern: /^\/new$/, view: newCaseView, nav: '/new' },
  { pattern: /^\/wall$/, view: wallView, nav: '/wall' },
  { pattern: /^\/about$/, view: aboutView, nav: '/about' },
];

const main = document.getElementById('main');
let token = 0;
let metaInfo = null;

function paintChrome() {
  document.title = `${BRAND} — ${t('tagline')}`;
  document.getElementById('brand-name').textContent = BRAND;
  const code = metaInfo?.code_license ?? { name: 'AGPL-3.0', url: '#' };
  const content = metaInfo?.content_license ?? { name: 'CC BY-SA 4.0', url: '#' };
  const lic = t('footer.license', { code: '\u0000code\u0000', content: '\u0000content\u0000' }).split('\u0000');
  clear(document.getElementById('footer')).append(
    h('p', {}, `${BRAND} · ${t('footer.blame')}`),
    h('p', {}, t('footer.free')),
    h('p', {}, ...lic.map((part) => (part === 'code' ? h('a', { href: code.url, rel: 'license noopener', target: '_blank' }, code.name)
      : part === 'content' ? h('a', { href: content.url, rel: 'license noopener', target: '_blank' }, content.name) : part)),
      metaInfo?.source_url ? [' · ', h('a', { href: metaInfo.source_url, rel: 'noopener', target: '_blank' }, t('footer.source'))] : null),
  );
  clear(document.getElementById('nav')).append(
    h('a', { href: '#/', dataset: { route: '/' } }, t('nav.cases')),
    h('a', { href: '#/wall', dataset: { route: '/wall' } }, t('nav.wall')),
    h('a', { href: '#/about', dataset: { route: '/about' } }, t('nav.about')),
    h('a', { href: '#/new', dataset: { route: '/new' }, class: 'btn btn-primary' }, t('nav.new')),
  );
  const lang = document.getElementById('lang');
  clear(lang).append(...available.map((l) => h('option', { value: l.code }, l.name)));
  lang.value = locale;
  lang.setAttribute('aria-label', t('lang.label'));
  const who = document.getElementById('whoami');
  who.textContent = nickname();
  who.title = t('who.edit');
}

async function render() {
  const path = location.hash.replace(/^#/, '') || '/';
  const my = ++token;
  const route = routes.find((r) => r.pattern.test(path));
  for (const link of document.querySelectorAll('#nav a[data-route]')) {
    link.classList.toggle('active', link.dataset.route === route?.nav);
  }
  if (!route) return main.replaceChildren(errorBox(new Error(t('errors.not_found'))));
  const m = path.match(route.pattern);
  const params = Object.fromEntries((route.params ?? []).map((k, i) => [k, m[i + 1]]));
  // Each view renders into its own container; only the latest navigation gets swapped in,
  // so a slow earlier view can never overwrite a newer one.
  const container = h('div');
  main.replaceChildren(loading());
  try {
    await route.view(container, params);
    if (my !== token) return;
    main.replaceChildren(...container.childNodes);
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

document.getElementById('lang').addEventListener('change', async (e) => {
  await setLocale(e.target.value);
  paintChrome();
  render();
});

window.addEventListener('hashchange', render);

(async () => {
  try {
    metaInfo = await api.meta();
    await initI18n(metaInfo.locales);
  } catch (e) {
    console.error(e);
  }
  paintChrome();
  render();
})();
