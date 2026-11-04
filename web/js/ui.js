/** 작은 DOM 도우미. 프레임워크 없이도 뷰를 함수로 조립하기 위한 최소한의 것. */
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
  // SQLite datetime('now') 는 UTC, 'YYYY-MM-DD HH:MM:SS'
  const d = new Date(`${iso.replace(' ', 'T')}Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

export const fmtKrw = (n) => `${Number(n).toLocaleString('ko-KR')}원`;

export function labelOf(list, key) {
  return list.find((x) => x.key === key)?.label ?? key;
}

export function riskBadge(c) {
  return h('span', { class: `risk risk--${c.risk_level}`, title: `심각도 ${c.severity} × 가능성 ${c.likelihood}` },
    `위험도 ${c.risk_score} · ${c.risk_label}`);
}

export function loading(text = '불러오는 중…') {
  return h('p', { class: 'empty' }, text);
}

export function errorBox(e) {
  return h('p', { class: 'empty' }, e?.message ?? '문제가 생겼습니다.');
}

export function field({ label, name, hint, error, control }) {
  return h('div', { class: 'field' },
    h('label', { for: `f-${name}` }, label),
    control,
    hint ? h('p', { class: 'hint' }, hint) : null,
    error ? h('p', { class: 'err' }, error) : null,
  );
}
