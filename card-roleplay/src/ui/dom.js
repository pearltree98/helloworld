// Tiny DOM builder. User text always goes in as text nodes, never as HTML.

const PROPS = new Set(['value', 'checked', 'disabled', 'selected', 'hidden', 'open']);
const SVG_NS = 'http://www.w3.org/2000/svg';

function apply(el, props) {
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null) continue;
    if (key === 'class') el.setAttribute('class', value);
    else if (key === 'text') el.textContent = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (PROPS.has(key)) el[key] = value;
    else if (value === false) continue;
    else el.setAttribute(key, value === true ? '' : String(value));
  }
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  apply(el, props);
  append(el, children);
  return el;
}

/** Like el.replaceChildren(), but skips null/false children the way h() does. */
export function fill(el, ...children) {
  el.replaceChildren();
  append(el, children);
  return el;
}

export function s(tag, props, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  apply(el, props);
  append(el, children);
  return el;
}

/** A top bar with a back link to home. */
export function topbar(title, { back = '#/', backLabel = '홈', right = null } = {}) {
  return h(
    'header',
    { class: 'topbar' },
    h('a', { class: 'topbar-back', href: back, 'aria-label': `${backLabel}으로` }, '‹ ', backLabel),
    h('h1', { class: 'topbar-title' }, title),
    h('div', { class: 'topbar-right' }, right),
  );
}

export function notice(text, tone = 'info') {
  return h('p', { class: `notice notice-${tone}`, role: tone === 'error' ? 'alert' : 'status' }, text);
}

export function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatDateTime(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
