// 성적표 계산. DOM에 의존하지 않는 순수 함수만 둔다(node:test로 검증).
import { STAGES, DIMENSION_TITLES, timeslotOf, weekdayOf, labelOf } from './catalog.js';

/** 이 건수보다 적으면 강점·약점 판단을 보류한다 */
export const MIN_SAMPLE = 5;

export const ENV_DIMENSIONS = ['industry', 'timeslot', 'weekday', 'role', 'reaction', 'pace', 'crowd', 'weather'];

export const isApplied = (v) => v.outcome === 'applied';
export const isPositive = (v) => v.outcome === 'applied' || v.outcome === 'revisit';

/** Wilson 점수 구간. 건수가 적을수록 구간이 넓어져, 2건 중 2건 같은 우연을 1등으로 올리지 않는다. */
export function wilson(k, n, z = 1.96) {
  if (!n) return { p: 0, lo: 0, hi: 1 };
  const p = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return { p, lo: Math.max(0, center - half), hi: Math.min(1, center + half) };
}

export const rate = (k, n) => (n ? k / n : null);

/** 방문 한 건에서 통계 차원 값을 꺼낸다(시간대·요일은 시각에서 계산) */
export function dimValue(v, dim) {
  if (dim === 'timeslot') return timeslotOf(v.createdAt);
  if (dim === 'weekday') return weekdayOf(v.createdAt);
  return v[dim] ?? null;
}

export const stageIndex = (v) => {
  const i = STAGES.findIndex((s) => s.key === v.stage);
  return i < 0 ? 0 : i;
};

// ── 기간 ─────────────────────────────────────────────

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** 기간 범위. week = 이번 주(월요일 시작), month = 이번 달, all = 전체 */
export function periodRange(period, now = new Date()) {
  const today = startOfDay(now);
  if (period === 'week') {
    const dow = (today.getDay() + 6) % 7; // 월=0
    const start = new Date(today);
    start.setDate(today.getDate() - dow);
    const prevStart = new Date(start);
    prevStart.setDate(start.getDate() - 7);
    return { start, prevStart, prevEnd: start, label: '이번 주', prevLabel: '지난주' };
  }
  if (period === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return { start, prevStart, prevEnd: start, label: '이번 달', prevLabel: '지난달' };
  }
  return { start: null, prevStart: null, prevEnd: null, label: '전체 기간', prevLabel: null };
}

export function splitByPeriod(visits, period, now = new Date()) {
  const r = periodRange(period, now);
  if (!r.start) return { current: visits, previous: null, range: r };
  const t = (v) => new Date(v.createdAt).getTime();
  return {
    current: visits.filter((v) => t(v) >= r.start.getTime()),
    previous: visits.filter((v) => t(v) >= r.prevStart.getTime() && t(v) < r.prevEnd.getTime()),
    range: r,
  };
}

// ── 집계 ─────────────────────────────────────────────

export function summary(visits) {
  const n = visits.length;
  const applied = visits.filter(isApplied).length;
  const revisit = visits.filter((v) => v.outcome === 'revisit').length;
  return {
    n,
    applied,
    revisit,
    rate: rate(applied, n),
    positiveRate: rate(applied + revisit, n),
  };
}

/** 단계별 통과율: 그 단계까지 간 방문 중 다음 단계로 넘어간 비율. 클로징은 신청으로 이어진 비율. */
export function stageFunnel(visits) {
  return STAGES.map((s, i) => {
    const reached = visits.filter((v) => stageIndex(v) >= i);
    const passed =
      i === STAGES.length - 1 ? reached.filter(isApplied) : reached.filter((v) => stageIndex(v) > i);
    return { key: s.key, label: s.label, n: reached.length, k: passed.length, rate: rate(passed.length, reached.length) };
  });
}

function tally(entries) {
  // entries: [key, success:boolean]
  const map = new Map();
  for (const [key, ok] of entries) {
    if (key == null || key === '') continue;
    const cur = map.get(key) ?? { key, n: 0, k: 0 };
    cur.n += 1;
    if (ok) cur.k += 1;
    map.set(key, cur);
  }
  return [...map.values()].map((x) => ({ ...x, rate: rate(x.k, x.n), ...ci(x.k, x.n) }));
}

function ci(k, n) {
  const w = wilson(k, n);
  return { lo: w.lo, hi: w.hi };
}

/** 거절 사유별 극복률 */
export function objectionScores(visits) {
  return tally(visits.flatMap((v) => (v.objections ?? []).map((o) => [o.type, Boolean(o.overcome)])));
}

/** 대처 기법별 극복률 */
export function techniqueScores(visits) {
  return tally(visits.flatMap((v) => (v.objections ?? []).map((o) => [o.technique, Boolean(o.overcome)])));
}

/** 거절 사유 × 대처 기법: 이 사유에는 어떤 대처가 먹혔나 */
export function objectionTechniqueMatrix(visits) {
  return tally(
    visits.flatMap((v) =>
      (v.objections ?? []).filter((o) => o.type && o.technique).map((o) => [`${o.type}|${o.technique}`, Boolean(o.overcome)]),
    ),
  ).map((x) => {
    const [type, technique] = x.key.split('|');
    return { ...x, type, technique };
  });
}

/** 환경 차원 값별 신청률 */
export function dimensionScores(visits, dim) {
  return tally(visits.map((v) => [dimValue(v, dim) == null ? null : String(dimValue(v, dim)), isApplied(v)]));
}

// ── 강점·약점 ─────────────────────────────────────────

/**
 * 같은 묶음의 평균과 비교해 눈에 띄게 높은(강점) / 낮은(약점) 항목을 찾는다.
 * 순위는 표본 크기를 반영한 z값으로 매기고, 신뢰구간이 평균을 벗어나면 "뚜렷함", 아니면 "경향"으로 표시한다.
 */
export function strengthsWeaknesses(visits, catalog, { top = 3, minSample = MIN_SAMPLE } = {}) {
  const items = [];
  const pending = [];

  const push = (group, dim, scores, base, metric) => {
    for (const s of scores) {
      const item = {
        group,
        dim,
        key: s.key,
        label: labelOf(catalog, dim, s.key),
        dimTitle: DIMENSION_TITLES[dim],
        metric,
        n: s.n,
        k: s.k,
        rate: s.rate,
        lo: s.lo,
        hi: s.hi,
        base,
        delta: s.rate - base,
      };
      if (s.n < minSample) pending.push(item);
      else items.push(item);
    }
  };

  const all = summary(visits);
  if (all.n) {
    // 첫 반응은 결과에 가까워 "호의적이면 잘 된다" 같은 당연한 말만 나오므로 강점·약점 후보에서 뺀다(표에는 보인다)
    for (const dim of ENV_DIMENSIONS.filter((d) => d !== 'reaction')) push('env', dim, dimensionScores(visits, dim), all.rate, '신청률');
  }
  const objs = objectionScores(visits);
  const objN = objs.reduce((a, x) => a + x.n, 0);
  const objK = objs.reduce((a, x) => a + x.k, 0);
  if (objN) {
    const base = objK / objN;
    push('skill', 'objection', objs, base, '극복률');
    push('skill', 'technique', techniqueScores(visits), base, '극복률');
  }

  const z = (it) => {
    const b = Math.min(Math.max(it.base, 0.02), 0.98);
    return (it.rate - b) / Math.sqrt((b * (1 - b)) / it.n);
  };
  for (const it of items) it.z = z(it);

  const strengths = items
    .filter((it) => it.delta > 0)
    .sort((a, b) => b.z - a.z)
    .slice(0, top)
    .map((it) => ({ ...it, confident: it.lo > it.base }));
  const weaknesses = items
    .filter((it) => it.delta < 0)
    .sort((a, b) => a.z - b.z)
    .slice(0, top)
    .map((it) => ({ ...it, confident: it.hi < it.base }));

  return { strengths, weaknesses, pendingCount: pending.length, judgedCount: items.length };
}

// ── 한 줄 코멘트(규칙 기반) ─────────────────────────────

const pct = (x) => (x == null ? '—' : `${Math.round(x * 100)}%`);

export function describeItem(it) {
  const diff = Math.round(Math.abs(it.delta) * 100);
  const dir = it.delta > 0 ? '높음' : '낮음';
  const baseName = it.group === 'env' ? '전체 평균' : '평균 극복률';
  const tail = it.confident ? '' : ' · 아직은 경향';
  return `${it.dimTitle} ‘${it.label}’ ${it.metric} ${pct(it.rate)} (${it.n}건) — ${baseName} ${pct(it.base)}보다 ${diff}%p ${dir}${tail}`;
}

/** 단계 중 가장 많이 끊기는 곳 */
export function weakestStage(funnel, minSample = MIN_SAMPLE) {
  const candidates = funnel.filter((s) => s.n >= minSample && s.rate != null);
  if (!candidates.length) return null;
  return candidates.reduce((a, b) => (b.rate < a.rate ? b : a));
}

/** 이 거절 사유에 가장 잘 먹힌 대처(표본 3건 이상) */
export function bestTechniqueFor(matrix, type, minSample = 3) {
  const rows = matrix.filter((m) => m.type === type && m.n >= minSample);
  if (!rows.length) return null;
  const best = rows.reduce((a, b) => (b.lo > a.lo ? b : a));
  return best.k > 0 ? best : null; // 한 번도 안 통했다면 "잘 통한 대처"가 아니다
}

export function buildComments(visits, catalog) {
  const out = [];
  if (visits.length < MIN_SAMPLE) {
    out.push(`기록이 ${visits.length}건이라 아직 판단하기 이릅니다. ${MIN_SAMPLE}건 이상 쌓이면 강점과 약점을 보여 드립니다.`);
    return out;
  }
  const funnel = stageFunnel(visits);
  const ws = weakestStage(funnel);
  if (ws) {
    const i = STAGES.findIndex((s) => s.key === ws.key);
    const next = i === STAGES.length - 1 ? '신청' : STAGES[i + 1].label;
    out.push(`가장 많이 끊기는 구간은 ‘${ws.label} → ${next}’입니다. 이 단계까지 간 ${ws.n}건 중 ${ws.k}건만 넘어갔습니다(${pct(ws.rate)}).`);
  }
  const sw = strengthsWeaknesses(visits, catalog, { top: 1 });
  if (sw.weaknesses[0]) {
    const w = sw.weaknesses[0];
    let line = `약점: ${describeItem(w)}.`;
    if (w.dim === 'objection') {
      const best = bestTechniqueFor(objectionTechniqueMatrix(visits), w.key);
      if (best) line += ` 이 사유에는 ‘${labelOf(catalog, 'technique', best.technique)}’가 ${best.n}건 중 ${best.k}건 통했습니다.`;
    }
    out.push(line);
  }
  if (sw.strengths[0]) out.push(`강점: ${describeItem(sw.strengths[0])}.`);
  return out;
}

/** 성적표 화면에 필요한 모든 값 */
export function buildReport(visits, catalog, period = 'month', now = new Date()) {
  const { current, previous, range } = splitByPeriod(visits, period, now);
  const cur = summary(current);
  const prev = previous ? summary(previous) : null;
  return {
    range,
    summary: cur,
    previous: prev,
    change: prev && prev.n && cur.n ? cur.rate - prev.rate : null,
    funnel: stageFunnel(current),
    objections: objectionScores(current),
    techniques: techniqueScores(current),
    matrix: objectionTechniqueMatrix(current),
    env: Object.fromEntries(ENV_DIMENSIONS.map((d) => [d, dimensionScores(current, d)])),
    sw: strengthsWeaknesses(current, catalog),
    comments: buildComments(current, catalog),
  };
}
