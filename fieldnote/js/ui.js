// DOM 헬퍼, 아이콘, 포맷

/** h('div.card', {onclick}, ...children) — 작은 하이퍼스크립트 */
export function h(tag, props, ...children) {
  if (props == null || typeof props !== 'object' || props instanceof Node || Array.isArray(props)) {
    children.unshift(props);
    props = {};
  }
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name || 'div');
  if (classes.length) el.className = classes.join(' ');
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = [el.className, v].filter(Boolean).join(' ');
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'value') el.value = v;
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

const PATHS = {
  home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
  report: '<path d="M5 20V10M10 20V4M15 20v-7M20 20v-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  map: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  back: '<path d="M15 5 8 12l7 7"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  cloud: '<path d="M7 18a4.5 4.5 0 0 1-.4-9 6 6 0 0 1 11.4 1.5A3.8 3.8 0 0 1 17.5 18z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  shield: '<path d="M12 3 5 6v5.5c0 4.3 3 8 7 9.5 4-1.5 7-5.2 7-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.5L4 8.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14.3 4.5l1.7-2M20 20v-4.5h-4.5"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  alert: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5M12 17.5h.01"/>',
  locate: '<circle cx="12" cy="12" r="3.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/><circle cx="12" cy="12" r="7"/>',
};

export function icon(name, size = 22) {
  const span = document.createElement('span');
  span.className = 'icon';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${PATHS[name] ?? ''}</svg>`;
  return span;
}

// ── 포맷 ──
const WD = ['일', '월', '화', '수', '목', '금', '토'];

export function fmtDate(iso, { withTime = true, withYear = false } = {}) {
  const d = new Date(iso);
  const date = `${withYear ? `${d.getFullYear()}. ` : ''}${d.getMonth() + 1}. ${d.getDate()}.(${WD[d.getDay()]})`;
  if (!withTime) return date;
  return `${date} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function fmtRelativeDay(iso) {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const that = new Date(d);
  that.setHours(0, 0, 0, 0);
  const diff = Math.round((that - today) / 86400000);
  if (diff === 0) return '오늘';
  if (diff === -1) return '어제';
  if (diff === 1) return '내일';
  if (diff > 1 && diff < 7) return `${diff}일 후`;
  return fmtDate(iso, { withTime: false });
}

export const pct = (x) => (x == null ? '—' : `${Math.round(x * 100)}`);

export function isoLocalDate(d = new Date()) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

// ── 컴포넌트 ──

/** 단일/다중 선택 칩 */
export function chips(items, { value, multiple = false, onChange, name }) {
  const selected = new Set(multiple ? value ?? [] : value != null ? [value] : []);
  const wrap = h('div.chips', { role: multiple ? 'group' : 'radiogroup', 'aria-label': name });
  const render = () => {
    wrap.replaceChildren(
      ...items
        .filter((it) => !it.hidden || selected.has(it.key))
        .map((it) =>
          h(
            'button.chip',
            {
              type: 'button',
              class: selected.has(it.key) ? 'on' : '',
              role: multiple ? 'checkbox' : 'radio',
              'aria-checked': String(selected.has(it.key)),
              onclick: () => {
                if (multiple) selected.has(it.key) ? selected.delete(it.key) : selected.add(it.key);
                else if (selected.has(it.key)) selected.clear();
                else {
                  selected.clear();
                  selected.add(it.key);
                }
                render();
                onChange?.(multiple ? [...selected] : ([...selected][0] ?? null));
              },
            },
            it.label,
          ),
        ),
    );
  };
  render();
  return wrap;
}

/** 점수 막대 한 줄: 이름 · 막대 · 점수 · 건수 */
export function scoreRow({ label, rate, n, k, note, pending, base }) {
  const val = rate == null ? 0 : Math.round(rate * 100);
  const bar = h('div.bar', { title: `${label}: ${k}/${n}건 (${val}%)` }, h('div.bar-fill', { style: { width: `${val}%` } }));
  if (base != null) bar.append(h('div.bar-base', { style: { left: `${Math.round(base * 100)}%` }, title: `평균 ${Math.round(base * 100)}%` }));
  return h(
    'div.score-row',
    { class: pending ? 'pending' : '' },
    h('div.score-label', label, note ? h('span.score-note', note) : null),
    bar,
    h('div.score-val', h('strong', rate == null ? '—' : val), h('span.unit', rate == null ? '' : '점')),
    h('div.score-n', `${k}/${n}`),
  );
}

export function section(title, ...children) {
  const opts = typeof children[0] === 'object' && children[0] && !(children[0] instanceof Node) && !Array.isArray(children[0]) ? children.shift() : {};
  return h(
    'section.section',
    h('div.section-head', h('h2', title), opts.action ?? null),
    opts.desc ? h('p.section-desc', opts.desc) : null,
    ...children,
  );
}

export function empty(text, action) {
  return h('div.empty', h('p', text), action ?? null);
}

let toastTimer;
export function toast(text, kind = '') {
  let el = document.getElementById('toast');
  if (!el) {
    el = h('div.toast', { id: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(el);
  }
  el.className = `toast show ${kind}`;
  el.textContent = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/** 확인 시트 */
export function confirmSheet({ title, body, ok = '확인', danger = false }) {
  return new Promise((resolve) => {
    const close = (v) => {
      backdrop.remove();
      resolve(v);
    };
    const backdrop = h(
      'div.sheet-backdrop',
      { onclick: (e) => e.target === backdrop && close(false) },
      h(
        'div.sheet',
        { role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
        h('h3', title),
        body ? h('p', body) : null,
        h(
          'div.sheet-actions',
          h('button.btn.btn-ghost', { type: 'button', onclick: () => close(false) }, '취소'),
          h('button.btn', { type: 'button', class: danger ? 'btn-danger' : 'btn-primary', onclick: () => close(true) }, ok),
        ),
      ),
    );
    document.body.append(backdrop);
    backdrop.querySelector('.btn-primary, .btn-danger').focus();
  });
}

export function outcomeBadge(outcome, label) {
  return h(`span.badge.badge-${outcome}`, label);
}

export function download(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
