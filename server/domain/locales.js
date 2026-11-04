/**
 * Locale files live in /locales/<code>.json and are the single source of truth for
 * UI strings, catalog labels and the About page. The server reads them for /api/meta;
 * the browser fetches the same files directly.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const LOCALES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'locales');
export const DEFAULT_LOCALE = 'en';

const files = readdirSync(LOCALES_DIR).filter((f) => f.endsWith('.json'));
const LOADED = new Map(
  files.map((f) => {
    const data = JSON.parse(readFileSync(join(LOCALES_DIR, f), 'utf8'));
    return [data.code, data];
  }),
);
if (!LOADED.has(DEFAULT_LOCALE)) throw new Error(`locales/${DEFAULT_LOCALE}.json is required`);

/** [{ code, name, dir }] sorted with the default first, then by code. */
export const LOCALES = [...LOADED.values()]
  .map(({ code, name, dir }) => ({ code, name, dir: dir === 'rtl' ? 'rtl' : 'ltr' }))
  .sort((a, b) => (a.code === DEFAULT_LOCALE ? -1 : b.code === DEFAULT_LOCALE ? 1 : a.code.localeCompare(b.code)));

export function pickLocale(v) {
  return typeof v === 'string' && LOADED.has(v) ? v : DEFAULT_LOCALE;
}

/** Catalog labels for one locale, falling back to English per key. */
export function catalogLabels(locale, group) {
  const base = LOADED.get(DEFAULT_LOCALE).catalog[group];
  const own = LOADED.get(pickLocale(locale)).catalog[group] ?? {};
  return { ...base, ...own };
}
