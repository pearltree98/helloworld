/**
 * Locale files (/locales/<code>.json) hold UI strings, catalog labels and the About page.
 * English is always loaded as the fallback; the active locale is loaded on demand.
 */
export const BRAND = 'Stepback';
const DEFAULT = 'en';
const KEY = 'stepback.locale';

const cache = new Map();
let fallback = null;
let active = null;

export let locale = DEFAULT;
export let dir = 'ltr';
/** [{ code, name, dir }] from the server. */
export let available = [{ code: DEFAULT, name: 'English', dir: 'ltr' }];

async function fetchLocale(code) {
  if (!cache.has(code)) {
    const res = await fetch(`/locales/${code}.json`);
    if (!res.ok) throw new Error(`locale ${code} unavailable`);
    cache.set(code, await res.json());
  }
  return cache.get(code);
}

function saved() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

/** Best match for the browser's languages among the available locales. */
function detect(codes) {
  const s = saved();
  if (s && codes.includes(s)) return s;
  for (const lang of navigator.languages ?? [navigator.language ?? DEFAULT]) {
    const lower = lang.toLowerCase();
    if (codes.includes(lower)) return lower;
    const short = lower.split('-')[0];
    if (codes.includes(short)) return short;
  }
  return DEFAULT;
}

export async function initI18n(locales) {
  if (Array.isArray(locales) && locales.length) available = locales;
  fallback = await fetchLocale(DEFAULT);
  await setLocale(detect(available.map((l) => l.code)), { persist: false });
}

export async function setLocale(code, { persist = true } = {}) {
  active = await fetchLocale(code);
  locale = code;
  dir = active.dir === 'rtl' ? 'rtl' : 'ltr';
  document.documentElement.lang = code;
  document.documentElement.dir = dir;
  if (persist) { try { localStorage.setItem(KEY, code); } catch { /* ignore */ } }
}

const lookup = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

/** t('detail.count.some', { n: 3 }) → "3 people have taken this lesson" */
export function t(path, vars = {}) {
  const raw = lookup(active?.ui, path) ?? lookup(fallback?.ui, path) ?? path;
  if (Array.isArray(raw)) return raw;
  return String(raw).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}

/** The structured About page for the active locale. */
export function aboutContent() {
  return active?.about ?? fallback?.about;
}

/** Server validation error ({ code, max? }) → localized sentence. */
export function tError(err) {
  if (!err) return '';
  if (typeof err === 'string') return t(`errors.${err}`);
  return t(`errors.${err.code}`, err);
}
