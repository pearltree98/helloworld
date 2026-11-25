// 풀이 기록 (localStorage 한 키에 JSON으로 저장)
//
// scopes[key]  key = "era:<시대id>" | "type:<유형>" | "review"
//   a:   { [문항id]: { c: 고른 선지(0~4), ok: 정답 여부, t: 시각 } }
//   pos: 마지막으로 보던 문항 위치
//   ids: (review만) 오답 다시 풀기를 시작할 때의 문항 목록
// wrong[문항id] = { n: 틀린 횟수, t: 마지막으로 틀린 시각 }  → 오답노트
// last = 마지막으로 푼 scope key (홈의 '이어 풀기')

const KEY = 'bible-quiz.v1';
const fresh = () => ({ v: 1, scopes: {}, wrong: {}, last: null });

let state = load();

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (!s || s.v !== 1) return fresh();
    return { ...fresh(), ...s, scopes: s.scopes || {}, wrong: s.wrong || {} };
  } catch {
    return fresh();
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('풀이 기록을 저장하지 못했습니다', err);
  }
}

const EMPTY = Object.freeze({ a: Object.freeze({}), pos: null });

export function scope(key) {
  return state.scopes[key] || EMPTY;
}

function ensure(key) {
  if (!state.scopes[key]) state.scopes[key] = { a: {}, pos: null };
  return state.scopes[key];
}

/** 채점 후 기록. 이미 푼 문항이면 기존 기록을 그대로 돌려준다(다시 고를 수 없음). */
export function answer(key, q, choice) {
  const sc = ensure(key);
  if (sc.a[q.id]) return sc.a[q.id];

  const ok = choice === q.answer;
  sc.a[q.id] = { c: choice, ok, t: Date.now() };

  if (!ok) {
    const w = state.wrong[q.id] || { n: 0 };
    state.wrong[q.id] = { n: w.n + 1, t: Date.now() };
  } else if (key === 'review') {
    delete state.wrong[q.id];
  }

  state.last = key;
  save();
  return sc.a[q.id];
}

export function setPos(key, pos) {
  const sc = ensure(key);
  if (sc.pos === pos) return;
  sc.pos = pos;
  save();
}

export function resetScope(key) {
  delete state.scopes[key];
  if (state.last === key) state.last = null;
  save();
}

export function startReview(ids, pos = 0) {
  state.scopes.review = { ids: [...ids], a: {}, pos };
  save();
}

export function wrong() {
  return state.wrong;
}

export function clearWrong() {
  state.wrong = {};
  delete state.scopes.review;
  if (state.last === 'review') state.last = null;
  save();
}

export function last() {
  return state.last;
}

export function resetAll() {
  state = fresh();
  save();
}
