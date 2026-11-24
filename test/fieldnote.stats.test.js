import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  wilson, summary, stageFunnel, objectionScores, techniqueScores, dimensionScores,
  strengthsWeaknesses, splitByPeriod, buildReport, weakestStage, bestTechniqueFor, objectionTechniqueMatrix, MIN_SAMPLE,
} from '../fieldnote/js/stats.js';
import { mergeCatalog, timeslotOf } from '../fieldnote/js/catalog.js';

const catalog = mergeCatalog();
let seq = 0;
const visit = (o = {}) => ({
  id: `v${++seq}`,
  createdAt: '2026-11-18T10:30:00',
  industry: 'office',
  stage: 'explain',
  outcome: 'rejected',
  objections: [],
  ...o,
});
const times = (n, o) => Array.from({ length: n }, () => visit(o));

test('wilson interval narrows with more samples and stays in [0,1]', () => {
  const small = wilson(2, 2);
  const big = wilson(200, 200);
  assert.equal(small.p, 1);
  assert.ok(small.lo < 0.5, 'two out of two is not proof');
  assert.ok(big.lo > 0.95);
  assert.deepEqual(wilson(0, 0), { p: 0, lo: 0, hi: 1 });
  const w = wilson(3, 10);
  assert.ok(w.lo >= 0 && w.lo < 0.3 && w.hi > 0.3 && w.hi <= 1);
});

test('summary counts applications and revisits', () => {
  const s = summary([visit({ outcome: 'applied' }), visit({ outcome: 'revisit' }), visit(), visit()]);
  assert.equal(s.n, 4);
  assert.equal(s.applied, 1);
  assert.equal(s.rate, 0.25);
  assert.equal(s.positiveRate, 0.5);
  assert.equal(summary([]).rate, null);
});

test('stage funnel: pass rate is share of visits that reached the next stage', () => {
  const visits = [
    visit({ stage: 'approach' }),
    visit({ stage: 'interest' }),
    visit({ stage: 'explain' }),
    visit({ stage: 'close', outcome: 'applied' }),
    visit({ stage: 'close' }),
  ];
  const f = stageFunnel(visits);
  assert.deepEqual(f.map((s) => s.n), [5, 4, 3, 2, 2]);
  assert.deepEqual(f.map((s) => s.k), [4, 3, 2, 2, 1]);
  assert.equal(f[4].rate, 0.5, 'closing pass = applied');
  assert.equal(weakestStage(f, 1).key, 'close');
});

test('objection and technique scores tally overcome flags', () => {
  const visits = [
    visit({ objections: [{ type: 'annual_fee', technique: 'fee_offset', overcome: true }] }),
    visit({ objections: [{ type: 'annual_fee', technique: 'empathy', overcome: false }, { type: 'no_time', technique: 'short', overcome: true }] }),
  ];
  const o = Object.fromEntries(objectionScores(visits).map((x) => [x.key, x]));
  assert.equal(o.annual_fee.n, 2);
  assert.equal(o.annual_fee.k, 1);
  assert.equal(o.no_time.rate, 1);
  const t = Object.fromEntries(techniqueScores(visits).map((x) => [x.key, x]));
  assert.equal(t.fee_offset.rate, 1);
  assert.equal(t.empathy.rate, 0);
});

test('dimension scores derive time slot from the visit time', () => {
  assert.equal(timeslotOf('2026-11-18T08:10:00'), 'early');
  assert.equal(timeslotOf('2026-11-18T12:40:00'), 'lunch');
  const visits = [
    visit({ createdAt: '2026-11-18T12:40:00', outcome: 'applied' }),
    visit({ createdAt: '2026-11-18T13:10:00' }),
    visit({ createdAt: '2026-11-18T15:00:00' }),
  ];
  const s = Object.fromEntries(dimensionScores(visits, 'timeslot').map((x) => [x.key, x]));
  assert.equal(s.lunch.n, 2);
  assert.equal(s.lunch.k, 1);
  assert.equal(s.afternoon.rate, 0);
});

test('strengths and weaknesses: small samples are held back, big gaps are confident', () => {
  const visits = [
    ...times(20, { industry: 'factory', outcome: 'applied' }),
    ...times(5, { industry: 'factory' }),
    ...times(25, { industry: 'hospital' }),
    ...times(2, { industry: 'school', outcome: 'applied' }), // 2/2 = 100% but too few
  ];
  const sw = strengthsWeaknesses(visits, catalog);
  const strongKeys = sw.strengths.map((s) => `${s.dim}:${s.key}`);
  assert.ok(strongKeys.includes('industry:factory'));
  assert.ok(!strongKeys.includes('industry:school'), `${MIN_SAMPLE} or more needed`);
  const factory = sw.strengths.find((s) => s.key === 'factory');
  assert.equal(factory.confident, true);
  const hospital = sw.weaknesses.find((s) => s.key === 'hospital');
  assert.ok(hospital);
  assert.equal(hospital.rate, 0);
  assert.ok(sw.pendingCount >= 1);
});

test('best technique for an objection uses the lower bound, not the raw rate', () => {
  const visits = [
    ...times(3, { objections: [{ type: 'annual_fee', technique: 'numbers', overcome: true }] }),
    ...times(12, { objections: [{ type: 'annual_fee', technique: 'fee_offset', overcome: true }] }),
    ...times(2, { objections: [{ type: 'annual_fee', technique: 'fee_offset', overcome: false }] }),
  ];
  const best = bestTechniqueFor(objectionTechniqueMatrix(visits), 'annual_fee');
  assert.equal(best.technique, 'fee_offset');
  const never = times(4, { objections: [{ type: 'credit_check', technique: 'numbers', overcome: false }] });
  assert.equal(bestTechniqueFor(objectionTechniqueMatrix(never), 'credit_check'), null);
});

test('period split: this week vs last week (Monday start)', () => {
  const now = new Date('2026-11-25T15:00:00'); // Wednesday
  const visits = [
    visit({ createdAt: '2026-11-24T10:00:00' }), // this week (Tue)
    visit({ createdAt: '2026-11-23T10:00:00' }), // this week (Mon)
    visit({ createdAt: '2026-11-22T10:00:00' }), // last week (Sun)
    visit({ createdAt: '2026-11-10T10:00:00' }), // older
  ];
  const { current, previous } = splitByPeriod(visits, 'week', now);
  assert.equal(current.length, 2);
  assert.equal(previous.length, 1);
  assert.equal(splitByPeriod(visits, 'all', now).current.length, 4);
});

test('report compares with the previous month and writes comments', () => {
  const now = new Date('2026-11-25T15:00:00');
  const visits = [
    ...times(10, { createdAt: '2026-11-05T10:00:00', outcome: 'applied', stage: 'close' }),
    ...times(10, { createdAt: '2026-11-06T10:00:00', stage: 'interest' }),
    ...times(10, { createdAt: '2026-10-06T10:00:00', stage: 'interest' }),
  ];
  const r = buildReport(visits, catalog, 'month', now);
  assert.equal(r.summary.n, 20);
  assert.equal(r.previous.n, 10);
  assert.equal(r.change, 0.5);
  assert.ok(r.comments.length >= 1);
  assert.match(r.comments[0], /끊기는 구간/);

  const few = buildReport(times(2, {}), catalog, 'all', now);
  assert.match(few.comments[0], /판단하기/);
});
