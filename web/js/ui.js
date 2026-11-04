/** Tiny DOM helpers so views can be plain functions without a framework. */
import { locale, t } from './i18n.js';

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

let toastTimer;
export function toast(message, ms = 2600) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

export function fmtDate(iso) {
  // SQLite datetime('now') is UTC, 'YYYY-MM-DD HH:MM:SS'
  const d = new Date(`${iso.replace(' ', 'T')}Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

export const fmtNum = (n) => Number(n).toLocaleString(locale);

export function fmtMoney(amount, currency) {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${fmtNum(amount)} ${currency}`;
  }
}

export function labelOf(list, key) {
  return list.find((x) => x.key === key)?.label ?? key;
}

export function riskBadge(c, riskLevels) {
  return h('span', { class: `risk risk--${c.risk_level}`, title: t('risk.title', { s: c.severity, l: c.likelihood }) },
    t('risk.badge', { score: c.risk_score, label: labelOf(riskLevels, c.risk_level) }));
}

export const loading = () => h('p', { class: 'empty' }, '…');
export const errorBox = (e) => h('p', { class: 'empty' }, e?.message ?? t('errors.generic'));
export const stat = (n, label) => h('div', { class: 'stat' }, h('b', {}, typeof n === 'number' ? fmtNum(n) : n), h('span', {}, label));

export function field({ label, name, hint, error, control }) {
  return h('div', { class: 'field' },
    h('label', { for: `f-${name}` }, label),
    control,
    hint ? h('p', { class: 'hint' }, hint) : null,
    error ? h('p', { class: 'err' }, error) : null,
  );
}
