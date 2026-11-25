import * as store from './store.js';
import { loadDB } from './data.js';

const app = document.getElementById('app');
const NUM = ['①', '②', '③', '④', '⑤'];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let db = null;
let depth = 0; // 앱 안에서 쌓은 history 깊이 (뒤로 가기 판단용)
let teardown = null; // 화면별 정리 함수
let installPrompt = null;

/* ---------- 작은 도우미 ---------- */

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// __밑줄__ → <u>밑줄</u>
const rich = (s) => esc(s).replace(/__(.+?)__/g, '<u>$1</u>');
const plain = (s) => String(s ?? '').replace(/__(.+?)__/g, '$1');
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

const ICON = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  reset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/></svg>',
  check: '<svg viewBox="0 0 24 24" class="mk mk-ok" role="img" aria-label="정답"><path d="M4.5 12.5l5 5L19.5 7"/></svg>',
  x: '<svg viewBox="0 0 24 24" class="mk mk-ng" role="img" aria-label="내가 고른 오답"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>',
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5L12 4l8 6.5V20h-5.5v-5.5h-5V20H4z"/></svg>',
  note: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h11a1.5 1.5 0 0 1 1.5 1.5v15.5L12 17l-6.5 3.5V5A1.5 1.5 0 0 1 6 3.5z"/><path d="M9 9h6M9 12.5h4"/></svg>',
};

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 2200);
}

function confirmBox({ title, body, ok = '확인', danger = false }) {
  const root = document.getElementById('modal-root');
  const prevFocus = document.activeElement;
  return new Promise((resolve) => {
    root.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <h3 id="modal-title">${esc(title)}</h3>
          ${body ? `<p>${esc(body)}</p>` : ''}
          <div class="modal-actions">
            <button class="btn ghost" data-v="0">취소</button>
            <button class="btn ${danger ? 'danger' : 'primary'}" data-v="1">${esc(ok)}</button>
          </div>
        </div>
      </div>`;
    const done = (v) => {
      root.innerHTML = '';
      document.removeEventListener('keydown', onKey);
      prevFocus?.focus?.({ preventScroll: true });
      resolve(v);
    };
    const onKey = (e) => e.key === 'Escape' && done(false);
    root.querySelector('.modal-backdrop').addEventListener('click', (e) => {
      const btn = e.target.closest('.modal [data-v]');
      if (btn) done(btn.dataset.v === '1');
      else if (!e.target.closest('.modal')) done(false); // 바깥을 누르면 취소
    });
    document.addEventListener('keydown', onKey);
    root.querySelector('[data-v="1"]').focus();
  });
}

/* ---------- 라우팅 (해시 기반: 정적 호스팅·TWA 모두에서 동작) ---------- */

function parseHash() {
  const raw = location.hash.slice(1) || '/';
  const [path, qs = ''] = raw.split('?');
  const parts = path
    .split('/')
    .filter(Boolean)
    .map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    });
  return { parts, params: new URLSearchParams(qs) };
}

function go(hash) {
  depth += 1;
  history.pushState({ d: depth }, '', hash);
  route();
}

function swap(hash) {
  history.replaceState({ d: depth }, '', hash);
  route();
}

function goBack(fallback) {
  if (depth > 0) history.back();
  else swap(fallback);
}

window.addEventListener('popstate', (e) => {
  depth = e.state?.d ?? 0;
  route();
});

const scopePath = (key) =>
  key === 'review' ? 'review' : key.startsWith('era:') ? `era/${encodeURIComponent(key.slice(4))}` : `type/${encodeURIComponent(key.slice(5))}`;

function keyFrom(parts) {
  if (parts[0] === 'review') return 'review';
  if (parts[0] === 'era' && parts[1]) return `era:${parts[1]}`;
  if (parts[0] === 'type' && parts[1]) return `type:${parts[1]}`;
  return null;
}

function route() {
  teardown?.();
  teardown = null;
  app.onclick = null;
  if (!db) return;
  const { parts, params } = parseHash();
  if (parts[0] === 'q') return viewQuiz(keyFrom(parts.slice(1)), Number(params.get('n')) || 0);
  if (parts[0] === 'r') return viewResult(keyFrom(parts.slice(1)));
  if (parts[0] === 'wrong') return viewWrong();
  return viewHome(params.get('tab') === 'type' ? 'type' : 'era');
}

/* ---------- 범위(scope): 시대 / 유형 / 오답 다시 풀기 ---------- */

function resolve(key) {
  if (!key) return null;
  if (key === 'review') {
    const ids = (store.scope('review').ids || []).filter((id) => db.byId.has(id));
    return { key, kind: 'review', title: '오답 다시 풀기', questions: ids.map((id) => db.byId.get(id)), home: '#/wrong' };
  }
  if (key.startsWith('era:')) {
    const era = db.eras.find((e) => e.id === key.slice(4));
    return era && { key, kind: 'era', title: era.name, questions: era.questions, home: '#/' };
  }
  if (key.startsWith('type:')) {
    const t = db.types.find((x) => x.name === key.slice(5));
    return t && { key, kind: 'type', title: t.name, questions: t.questions, home: '#/?tab=type' };
  }
  return null;
}

function stats(key, questions) {
  const a = store.scope(key).a;
  let answered = 0;
  let correct = 0;
  for (const q of questions) {
    const r = a[q.id];
    if (!r) continue;
    answered += 1;
    if (r.ok) correct += 1;
  }
  return { total: questions.length, answered, correct, rate: pct(correct, answered) };
}

function wrongItems() {
  return Object.entries(store.wrong())
    .filter(([id]) => db.byId.has(id))
    .map(([id, w]) => ({ q: db.byId.get(id), ...w }))
    .sort((a, b) => a.q._order - b.q._order);
}

function openScope(key) {
  const sc = resolve(key);
  if (!sc || !sc.questions.length) return;
  const s = stats(key, sc.questions);
  go(`#/${s.answered === s.total ? 'r' : 'q'}/${scopePath(key)}`);
}

async function resetScope(key, label) {
  const ok = await confirmBox({
    title: `${label} 풀이 기록을 초기화할까요?`,
    body: '고른 답과 진행도가 지워집니다. 오답노트는 그대로 남습니다.',
    ok: '초기화',
    danger: true,
  });
  if (!ok) return false;
  store.resetScope(key);
  toast('초기화했어요');
  return true;
}

/** 오답 다시 풀기 시작. 진행 중인 세트가 있으면 이어서, 없으면 현재 오답으로 새로 만든다. */
function startReview(focusId) {
  const ids = wrongItems().map((x) => x.q.id);
  const rv = store.scope('review');
  const cur = (rv.ids || []).filter((id) => db.byId.has(id));
  const unfinished = cur.some((id) => !rv.a[id]);

  if (focusId) {
    const i = cur.indexOf(focusId);
    if (i >= 0 && !rv.a[focusId]) return go(`#/q/review?n=${i + 1}`);
    store.startReview(ids, Math.max(0, ids.indexOf(focusId)));
    return go(`#/q/review?n=${Math.max(0, ids.indexOf(focusId)) + 1}`);
  }
  if (cur.length && unfinished) return go('#/q/review');
  if (!ids.length) return toast('오답노트가 비어 있어요');
  store.startReview(ids, 0);
  go('#/q/review?n=1');
}

/* ---------- 공통 조각 ---------- */

function tabbar(active) {
  const n = wrongItems().length;
  return `
    <nav class="tabbar" aria-label="주요 메뉴">
      <a href="#/" data-act="nav" ${active === 'home' ? 'aria-current="page"' : ''}>${ICON.home}<span>홈</span></a>
      <a href="#/wrong" data-act="nav" ${active === 'wrong' ? 'aria-current="page"' : ''}>${ICON.note}<span>오답노트</span>${
        n ? `<i class="badge" aria-label="${n}문항">${n > 99 ? '99+' : n}</i>` : ''
      }</a>
    </nav>`;
}

function navClick(e, b) {
  e.preventDefault();
  swap(b.getAttribute('href'));
  window.scrollTo(0, 0);
}

/* ---------- 홈 ---------- */

function cardHTML({ key, title, sub, questions }) {
  const s = stats(key, questions);
  const empty = !s.total;
  let status;
  let goLabel = '';
  if (empty) status = '<span class="muted">준비 중</span>';
  else if (!s.answered) {
    status = '<span class="muted">풀이 기록이 없습니다</span>';
    goLabel = '풀기';
  } else if (s.answered < s.total) {
    status = `<span class="green">풀이 진행중 (${s.answered}/${s.total})</span>`;
    goLabel = '이어 풀기';
  } else {
    status = `<span class="green">풀이 완료 (${s.total}/${s.total})</span>`;
    goLabel = '결과';
  }
  const k = esc(key);
  return `
    <article class="card${empty ? ' is-empty' : ''}"${empty ? '' : ` data-act="open" data-key="${k}"`}>
      <h2>${esc(title)}</h2>
      ${
        empty
          ? ''
          : `<div class="card-actions">
              ${s.answered ? `<button class="ca ca-reset" data-act="reset" data-key="${k}" data-label="${esc(title)}">초기화</button>` : ''}
              <button class="ca ca-go" data-act="open" data-key="${k}">${goLabel}</button>
            </div>`
      }
      ${sub ? `<p class="sub">${esc(sub)}</p>` : ''}
      <div class="card-foot">
        <p class="status">${status}</p>
        <p class="nums">${empty ? '' : `<span>${s.total}문항</span>`}${s.answered ? `<span>정답률 <b>${s.rate}%</b></span>` : ''}</p>
      </div>
      <div class="meter" aria-hidden="true"><i style="width:${pct(s.answered, s.total)}%"></i></div>
    </article>`;
}

function eraBreakdown(questions) {
  const m = new Map();
  for (const q of questions) m.set(q._eraName, (m.get(q._eraName) || 0) + 1);
  return [...m].map(([n, c]) => `${n} ${c}`).join(' · ');
}

function viewHome(tab) {
  let answered = 0;
  let correct = 0;
  let total = 0;
  for (const e of db.eras) {
    const s = stats(`era:${e.id}`, e.questions);
    answered += s.answered;
    correct += s.correct;
    total += s.total;
  }

  const lastKey = store.last();
  const lastSc = resolve(lastKey);
  let cont = '';
  if (lastSc && lastSc.questions.length) {
    const s = stats(lastKey, lastSc.questions);
    if (s.answered < s.total) {
      cont = `
        <button class="continue" data-act="open" data-key="${esc(lastKey)}">
          <span class="continue-label">이어 풀기</span>
          <span class="continue-title">${esc(lastSc.title)}</span>
          <span class="continue-prog">${s.answered}/${s.total}</span>
        </button>`;
    }
  }

  const cards =
    tab === 'era'
      ? db.eras
          .map((e) => cardHTML({ key: `era:${e.id}`, title: e.name, sub: [e.books, e.period].filter(Boolean).join(' · '), questions: e.questions }))
          .join('')
      : db.types.map((t) => cardHTML({ key: `type:${t.name}`, title: t.name, sub: eraBreakdown(t.questions), questions: t.questions })).join('') ||
        '<p class="empty">아직 문항이 없습니다.</p>';

  const notes = [];
  if (db.problems.length) notes.push(`형식 오류로 빠진 문항 ${db.problems.length}개 (브라우저 콘솔에서 확인)`);
  if (db.loadErrors.length) notes.push(`불러오지 못한 데이터 파일 ${db.loadErrors.length}개 (인터넷 연결을 확인하세요)`);

  app.innerHTML = `
    <div class="screen home">
      <header class="home-top">
        <img src="icons/icon.svg" alt="" width="44" height="44">
        <div class="home-title">
          <h1>성경 역사 문제풀이</h1>
          <p>자료를 읽고, 누구인지 찾고, 옳은 것을 고른다</p>
        </div>
        <button class="install" data-act="install" ${installPrompt ? '' : 'hidden'}>앱 설치</button>
      </header>

      <section class="summary" aria-label="시대별 풀이 현황 합계">
        <div><b>${total}</b><span>전체 문항</span></div>
        <div><b>${answered}</b><span>푼 문항</span></div>
        <div><b>${answered ? `${pct(correct, answered)}%` : '–'}</b><span>정답률</span></div>
      </section>

      ${cont}

      <div class="seg" role="tablist" aria-label="보기 방식">
        <button role="tab" aria-selected="${tab === 'era'}" data-act="tab" data-tab="era">시대별</button>
        <button role="tab" aria-selected="${tab === 'type'}" data-act="tab" data-tab="type">유형별</button>
      </div>

      <div class="cards">${cards}</div>

      ${notes.map((n) => `<p class="data-note">${esc(n)}</p>`).join('')}

      <footer class="home-foot">
        <button data-act="reset-all">전체 기록 초기화</button>
      </footer>
    </div>
    ${tabbar('home')}`;

  app.onclick = async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'nav') return navClick(e, b);
    if (act === 'open') return openScope(b.dataset.key);
    if (act === 'tab') return swap(b.dataset.tab === 'type' ? '#/?tab=type' : '#/');
    if (act === 'reset') {
      if (await resetScope(b.dataset.key, b.dataset.label)) route();
      return;
    }
    if (act === 'install' && installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice.catch(() => {});
      installPrompt = null;
      b.hidden = true;
      return;
    }
    if (act === 'reset-all') {
      const ok = await confirmBox({
        title: '모든 기록을 초기화할까요?',
        body: '모든 시대·유형의 풀이 기록과 오답노트가 지워집니다. 되돌릴 수 없습니다.',
        ok: '전체 초기화',
        danger: true,
      });
      if (ok) {
        store.resetAll();
        toast('모든 기록을 지웠어요');
        route();
      }
    }
  };
}

/* ---------- 문제 풀이 ---------- */

function optionHTML(q, o, k, rec) {
  if (!rec) {
    return `
      <li class="opt">
        <button class="opt-btn" data-act="pick" data-k="${k}">
          <span class="n">${NUM[k]}</span><span class="opt-text">${esc(o.text)}</span>
        </button>
      </li>`;
  }
  const isAns = k === q.answer;
  const isMine = rec.c === k;
  const mark = isAns ? ICON.check : isMine ? ICON.x : '';
  const cls = ['opt', 'graded', isAns && 'is-answer', isMine && 'is-mine', isMine && !isAns && 'is-wrong'].filter(Boolean).join(' ');
  return `
    <li class="${cls}">
      <div class="opt-row">
        <span class="mark">${mark}</span>
        <p class="opt-text"><span class="n">${NUM[k]}</span> ${esc(o.text)}${isMine ? '<span class="mine">내 답</span>' : ''}</p>
      </div>
      <div class="opt-exp">
        ${o.keyword ? `<p class="tag-row"><span class="pill">선지 분석</span><span class="kw">${esc(o.keyword)}</span></p>` : ''}
        ${o.explain ? `<p class="opt-explain">${rich(o.explain)}</p>` : ''}
      </div>
    </li>`;
}

function questionHTML(sc, q, i, rec) {
  const showEra = sc.kind !== 'era';
  return `
    <article class="q" aria-labelledby="q-prompt">
      <div class="q-head">
        <span class="q-num">${i + 1}.</span>
        <h2 class="q-prompt" id="q-prompt" tabindex="-1">${rich(q.prompt)}</h2>
      </div>
      <p class="q-meta">
        <span class="chip">${esc(q.type)}</span>
        ${showEra ? `<span class="chip">${esc(q._eraName)}</span>` : ''}
      </p>
      ${q.passage ? `<div class="passage"><span class="passage-label">자료</span><p>${rich(q.passage)}</p></div>` : ''}
      ${
        rec
          ? `<section class="exp" id="exp" aria-live="polite">
              <p class="verdict ${rec.ok ? 'ok' : 'ng'}">${rec.ok ? '정답입니다' : `오답입니다 · 정답은 ${NUM[q.answer]}`}</p>
              ${q.explanation ? `<p class="exp-text">${rich(q.explanation)}</p>` : ''}
              ${
                q.refs?.length
                  ? `<p class="refs">${q.refs.map((r) => `<span class="ref">#${esc(r)}</span>`).join('')}</p>`
                  : ''
              }
            </section>`
          : ''
      }
      <ol class="opts" aria-label="선택지">
        ${q.options.map((o, k) => optionHTML(q, o, k, rec)).join('')}
      </ol>
    </article>`;
}

function viewQuiz(key, n) {
  const sc = resolve(key);
  if (!sc) return swap('#/');
  const qs = sc.questions;

  if (!qs.length) {
    app.innerHTML = `
      <div class="screen">
        <header class="bar">
          <button class="icon-btn" data-act="back" aria-label="뒤로">${ICON.back}</button>
          <div class="bar-title"><h1>${esc(sc.title)}</h1></div>
          <span class="icon-btn" aria-hidden="true"></span>
        </header>
        <p class="empty">${key === 'review' ? '다시 풀 오답이 없습니다.' : '아직 문항이 없습니다.'}</p>
      </div>`;
    app.onclick = (e) => e.target.closest('[data-act="back"]') && goBack(sc.home);
    return;
  }

  const saved = store.scope(key);
  const firstOpen = qs.findIndex((q) => !saved.a[q.id]);
  let idx = clamp((n ? n - 1 : saved.pos ?? (firstOpen < 0 ? 0 : firstOpen)) || 0, 0, qs.length - 1);

  app.innerHTML = `
    <div class="screen quiz">
      <header class="bar">
        <button class="icon-btn" data-act="back" aria-label="뒤로">${ICON.back}</button>
        <div class="bar-title"><h1>${esc(sc.title)}</h1><p id="bar-sub"></p></div>
        <button class="icon-btn" data-act="reset" aria-label="이 범위 기록 초기화">${ICON.reset}</button>
      </header>
      <nav class="qtabs" aria-label="문항 번호"><div class="qtabs-inner" id="qtabs"></div></nav>
      <main id="qmain"></main>
      <div class="qnav">
        <button class="btn ghost" data-act="prev">이전</button>
        <span class="qnav-count" id="qcount"></span>
        <button class="btn primary" data-act="next">다음</button>
      </div>
    </div>`;

  const tabsEl = app.querySelector('#qtabs');
  const mainEl = app.querySelector('#qmain');
  const subEl = app.querySelector('#bar-sub');
  const countEl = app.querySelector('#qcount');
  const prevBtn = app.querySelector('[data-act="prev"]');
  const nextBtn = app.querySelector('[data-act="next"]');

  function paintTabs() {
    const a = store.scope(key).a;
    tabsEl.innerHTML = qs
      .map((q, i) => {
        const r = a[q.id];
        const st = r ? (r.ok ? ' ok' : ' ng') : '';
        const label = `${i + 1}번${r ? (r.ok ? ' 정답' : ' 오답') : ''}`;
        return `<button class="qtab${st}" data-act="goto" data-i="${i}" aria-label="${label}"${i === idx ? ' aria-current="true"' : ''}>${i + 1}</button>`;
      })
      .join('');
    const cur = tabsEl.children[idx];
    if (cur) {
      const nav = tabsEl.parentElement;
      nav.scrollTo({ left: cur.offsetLeft - nav.clientWidth / 2 + cur.offsetWidth / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    const s = stats(key, qs);
    subEl.textContent = `${s.answered}/${s.total} 풀이${s.answered ? ` · 정답 ${s.correct}` : ''}`;
  }

  function paintQuestion() {
    const q = qs[idx];
    mainEl.innerHTML = questionHTML(sc, q, idx, store.scope(key).a[q.id]);
  }

  function show(i, { focus = true } = {}) {
    idx = clamp(i, 0, qs.length - 1);
    store.setPos(key, idx);
    history.replaceState({ d: depth }, '', `#/q/${scopePath(key)}?n=${idx + 1}`);
    paintQuestion();
    paintTabs();
    prevBtn.disabled = idx === 0;
    nextBtn.textContent = idx === qs.length - 1 ? '결과 보기' : '다음';
    countEl.textContent = `${idx + 1} / ${qs.length}`;
    window.scrollTo(0, 0);
    if (focus) mainEl.querySelector('#q-prompt')?.focus({ preventScroll: true });
  }

  function pick(k) {
    const q = qs[idx];
    if (store.scope(key).a[q.id]) return; // 이미 채점됨: 다시 고를 수 없음
    const rec = store.answer(key, q, k);
    paintQuestion();
    paintTabs();
    if (key === 'review' && rec.ok) toast('맞혔어요 · 오답노트에서 뺐어요');
    requestAnimationFrame(() =>
      mainEl.querySelector('#exp')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }),
    );
  }

  function next() {
    if (idx < qs.length - 1) show(idx + 1);
    else go(`#/r/${scopePath(key)}`);
  }

  app.onclick = async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'pick') return pick(Number(b.dataset.k));
    if (act === 'goto') return show(Number(b.dataset.i));
    if (act === 'prev') return show(idx - 1);
    if (act === 'next') return next();
    if (act === 'back') return goBack(sc.home);
    if (act === 'reset') {
      if (key === 'review') {
        const ids = wrongItems().map((x) => x.q.id);
        const ok = await confirmBox({
          title: '오답 다시 풀기를 처음부터 할까요?',
          body: `지금 오답노트에 있는 ${ids.length}문항으로 새로 시작합니다.`,
          ok: '새로 시작',
        });
        if (!ok) return;
        store.startReview(ids, 0);
        return swap('#/q/review?n=1');
      }
      if (await resetScope(key, sc.title)) swap(`#/q/${scopePath(key)}?n=1`);
    }
  };

  // 키보드: ←/→ 이동, 1~5 선택
  const onKey = (e) => {
    if (document.getElementById('modal-root').childElementCount) return;
    if (e.target.closest?.('input, textarea')) return;
    if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft' && idx > 0) show(idx - 1);
    else if (/^[1-5]$/.test(e.key)) pick(Number(e.key) - 1);
  };

  // 스와이프: 좌우로 밀어 이전/다음
  let sx = 0;
  let sy = 0;
  let st = 0;
  const onStart = (e) => {
    const t = e.touches[0];
    sx = t.clientX;
    sy = t.clientY;
    st = Date.now();
  };
  const onEnd = (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    if (Date.now() - st > 600 || Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
    if (window.getSelection()?.toString()) return;
    if (dx < 0) next();
    else if (idx > 0) show(idx - 1);
  };

  document.addEventListener('keydown', onKey);
  mainEl.addEventListener('touchstart', onStart, { passive: true });
  mainEl.addEventListener('touchend', onEnd, { passive: true });
  teardown = () => document.removeEventListener('keydown', onKey);

  show(idx, { focus: false });
}

/* ---------- 결과 ---------- */

function viewResult(key) {
  const sc = resolve(key);
  if (!sc || !sc.questions.length) return swap('#/');
  const qs = sc.questions;
  const a = store.scope(key).a;
  const s = stats(key, qs);
  const wrongIds = qs.filter((q) => a[q.id] && !a[q.id].ok).map((q) => q.id);
  const left = s.total - s.answered;

  app.innerHTML = `
    <div class="screen">
      <header class="bar">
        <button class="icon-btn" data-act="back" aria-label="뒤로">${ICON.back}</button>
        <div class="bar-title"><h1>${esc(sc.title)} 결과</h1></div>
        <span class="icon-btn" aria-hidden="true"></span>
      </header>

      <section class="result-hero">
        <p class="score"><b>${s.correct}</b><small> / ${s.total}</small></p>
        <p class="score-sub">정답률 ${s.answered ? `${s.rate}%` : '–'}${left ? ` · 안 푼 문항 ${left}개` : ''}</p>
      </section>

      <div class="omr" role="list" aria-label="문항별 결과">
        ${qs
          .map((q, i) => {
            const r = a[q.id];
            const cls = r ? (r.ok ? 'ok' : 'ng') : 'none';
            const sym = r ? (r.ok ? '✓' : '✗') : '–';
            return `<button role="listitem" class="omr-cell ${cls}" data-act="goto" data-i="${i}" aria-label="${i + 1}번 ${r ? (r.ok ? '정답' : '오답') : '안 풂'}"><span>${i + 1}</span><i>${sym}</i></button>`;
          })
          .join('')}
      </div>

      <div class="result-actions">
        ${wrongIds.length ? `<button class="btn primary block" data-act="retry-wrong">틀린 문제만 다시 풀기 (${wrongIds.length})</button>` : ''}
        ${left ? `<button class="btn ghost block" data-act="continue">안 푼 문제 이어 풀기</button>` : ''}
        ${key === 'review' ? '' : `<button class="btn ghost block" data-act="restart">처음부터 다시 풀기</button>`}
        <button class="btn ghost block" data-act="home">${key === 'review' ? '오답노트로' : '홈으로'}</button>
      </div>
    </div>`;

  app.onclick = async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'back') return goBack(`#/q/${scopePath(key)}`);
    if (act === 'goto') return go(`#/q/${scopePath(key)}?n=${Number(b.dataset.i) + 1}`);
    if (act === 'continue') {
      const i = qs.findIndex((q) => !a[q.id]);
      return go(`#/q/${scopePath(key)}?n=${i + 1}`);
    }
    if (act === 'retry-wrong') {
      store.startReview(wrongIds, 0);
      return go('#/q/review?n=1');
    }
    if (act === 'restart') {
      if (await resetScope(key, sc.title)) swap(`#/q/${scopePath(key)}?n=1`);
      return;
    }
    if (act === 'home') return swap(sc.home);
  };
}

/* ---------- 오답노트 ---------- */

function viewWrong() {
  const items = wrongItems();
  const groups = new Map();
  for (const it of items) {
    if (!groups.has(it.q._eraName)) groups.set(it.q._eraName, []);
    groups.get(it.q._eraName).push(it);
  }
  const fmt = (t) => {
    const d = new Date(t);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const rv = store.scope('review');
  const curIds = (rv.ids || []).filter((id) => db.byId.has(id));
  const unfinished = curIds.length && curIds.some((id) => !rv.a[id]);

  app.innerHTML = `
    <div class="screen wrong">
      <header class="page-top">
        <h1>오답노트</h1>
        <p>틀린 문항이 모입니다. '오답 다시 풀기'에서 맞히면 목록에서 빠집니다.</p>
      </header>
      ${
        items.length
          ? `<div class="wrong-actions">
               <button class="btn primary block" data-act="review">${unfinished ? '오답 다시 풀기 이어서' : `오답 다시 풀기 (${items.length})`}</button>
             </div>
             ${[...groups]
               .map(
                 ([era, list]) => `
               <section class="wn-group">
                 <h2>${esc(era)} <span>${list.length}</span></h2>
                 ${list
                   .map(
                     ({ q, n, t }) => `
                   <button class="wn-item" data-act="review-one" data-id="${esc(q.id)}">
                     <span class="wn-meta"><span class="chip">${esc(q.type)}</span><span>${n}회 틀림 · ${fmt(t)}</span></span>
                     <span class="wn-text">${esc(plain(q.passage || q.prompt))}</span>
                   </button>`,
                   )
                   .join('')}
               </section>`,
               )
               .join('')}
             <footer class="home-foot"><button data-act="clear">오답노트 비우기</button></footer>`
          : `<div class="empty">
               <p><b>틀린 문항이 없습니다.</b></p>
               <p>문제를 풀다 틀리면 여기에 모입니다.</p>
             </div>`
      }
    </div>
    ${tabbar('wrong')}`;

  app.onclick = async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'nav') return navClick(e, b);
    if (act === 'review') return startReview();
    if (act === 'review-one') return startReview(b.dataset.id);
    if (act === 'clear') {
      const ok = await confirmBox({ title: '오답노트를 비울까요?', body: '틀린 문항 목록이 모두 지워집니다.', ok: '비우기', danger: true });
      if (ok) {
        store.clearWrong();
        route();
      }
    }
  };
}

/* ---------- 시작 ---------- */

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  const b = document.querySelector('[data-act="install"]');
  if (b) b.hidden = false;
});

async function boot() {
  depth = history.state?.d ?? 0;
  history.replaceState({ d: depth }, '', location.hash || '#/');
  try {
    db = await loadDB();
  } catch (err) {
    app.innerHTML = `
      <div class="empty boot-error">
        <p><b>문항을 불러오지 못했습니다.</b></p>
        <p>${esc(err.message)}</p>
        <button class="btn primary" onclick="location.reload()">다시 시도</button>
      </div>`;
    return;
  }
  route();
}

boot();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('서비스 워커 등록 실패', err));
  });
}
