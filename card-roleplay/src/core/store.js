// localStorage persistence for settings, question bank, Leitner progress,
// session history and one-off flags. Recordings live in IndexedDB (recordings.js).
import seed from '../data/seed.json' with { type: 'json' };
import { normalizeSettings } from './settings.js';
import { normalizeBank } from './bank.js';

export const KEYS = Object.freeze({
  settings: 'cr.settings.v1',
  bank: 'cr.bank.v1',
  progress: 'cr.progress.v1',
  history: 'cr.history.v1',
  flags: 'cr.flags.v1',
});

export const HISTORY_CAP = 100;

let storage = globalThis.localStorage;

/** For tests: swap in any object with getItem/setItem/removeItem. */
export function setStorage(s) {
  storage = s;
}

function read(key, fallback) {
  try {
    const raw = storage?.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn('저장 실패', key, err);
    return false;
  }
}

export const seedBank = () => normalizeBank(structuredClone(seed));

export const loadSettings = () => normalizeSettings(read(KEYS.settings, {}));
export const saveSettings = (s) => write(KEYS.settings, normalizeSettings(s));

export function loadBank() {
  const stored = read(KEYS.bank, null);
  return Array.isArray(stored) ? normalizeBank(stored) : seedBank();
}
export const saveBank = (list) => write(KEYS.bank, normalizeBank(list));

export function loadProgress() {
  const p = read(KEYS.progress, {});
  return p && typeof p === 'object' && !Array.isArray(p) ? p : {};
}
export const saveProgress = (p) => write(KEYS.progress, p);

export function loadHistory() {
  const h = read(KEYS.history, []);
  return Array.isArray(h) ? h : [];
}
export const saveHistory = (list) => write(KEYS.history, list.slice(0, HISTORY_CAP));

/** Inserts or replaces one session, newest first. */
export function upsertSession(session) {
  const list = loadHistory().filter((s) => s.id !== session.id);
  list.unshift(session);
  return saveHistory(list);
}

export function loadFlags() {
  const f = read(KEYS.flags, {});
  return f && typeof f === 'object' ? f : {};
}
export const setFlag = (name, value) => write(KEYS.flags, { ...loadFlags(), [name]: value });
