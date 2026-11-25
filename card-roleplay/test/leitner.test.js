import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEntry, applyOutcome, pickSession, retryCount, boxCounts, MAX_BOX } from '../src/core/leitner.js';

const qs = (n) => Array.from({ length: n }, (_, i) => ({ id: `q${i + 1}`, question: `질문 ${i + 1}` }));

// Deterministic "random" for repeatable order.
function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

test('new questions start in box 1, not marked for retry', () => {
  assert.deepEqual(getEntry({}, 'x'), { box: 1, retry: false, attempts: 0, lastSeen: 0, lastReactionMs: null });
});

test('a good answer moves the question up one box, capped at 3', () => {
  let e = getEntry({}, 'x');
  e = applyOutcome(e, { retry: false, reactionMs: 1200 }, 10);
  assert.equal(e.box, 2);
  assert.equal(e.lastReactionMs, 1200);
  e = applyOutcome(e, { retry: false }, 20);
  e = applyOutcome(e, { retry: false }, 30);
  assert.equal(e.box, MAX_BOX);
  assert.equal(e.attempts, 3);
  assert.equal(e.lastSeen, 30);
  assert.equal(e.lastReactionMs, 1200, 'keeps the last known reaction time when none is given');
});

test('다시 풀기 sends the question back to box 1 and marks it for retry', () => {
  const e = applyOutcome({ ...getEntry({}, 'x'), box: 3 }, { retry: true }, 5);
  assert.equal(e.box, 1);
  assert.equal(e.retry, true);
  const after = applyOutcome(e, { retry: false }, 6);
  assert.equal(after.retry, false, 'answering well clears the retry mark');
  assert.equal(after.box, 2);
});

test('getEntry clamps bad stored values', () => {
  assert.equal(getEntry({ x: { box: 9 } }, 'x').box, 3);
  assert.equal(getEntry({ x: { box: 0 } }, 'x').box, 1);
  assert.equal(getEntry({ x: { box: 'a' } }, 'x').box, 1);
});

test('sessions take box 1 first, then the least recently seen', () => {
  const questions = qs(6);
  const progress = {
    q1: { box: 3, lastSeen: 1 },
    q2: { box: 2, lastSeen: 1 },
    q3: { box: 1, lastSeen: 50 },
    q4: { box: 1, lastSeen: 10 },
    q5: { box: 2, lastSeen: 0 },
    q6: { box: 1, lastSeen: 30 },
  };
  const picked = pickSession(questions, progress, { size: 4, random: seeded(3) }).map((q) => q.id);
  assert.equal(picked.length, 4);
  assert.deepEqual([...picked].sort(), ['q3', 'q4', 'q5', 'q6']);
});

test('session size is respected and never empty when questions exist', () => {
  assert.equal(pickSession(qs(10), {}, { size: 5, random: seeded() }).length, 5);
  assert.equal(pickSession(qs(3), {}, { size: 5, random: seeded() }).length, 3);
  assert.equal(pickSession(qs(3), {}, { size: 0, random: seeded() }).length, 1);
});

test('retry mode returns every question marked 다시 풀기 and nothing else', () => {
  const progress = { q2: { box: 1, retry: true }, q5: { box: 1, retry: true }, q1: { box: 1 } };
  const picked = pickSession(qs(6), progress, { mode: 'retry', size: 1, random: seeded() }).map((q) => q.id);
  assert.deepEqual(picked.sort(), ['q2', 'q5']);
  assert.equal(retryCount(qs(6), progress), 2);
});

test('box counts cover every question', () => {
  assert.deepEqual(boxCounts(qs(4), { q1: { box: 2 }, q2: { box: 3 } }), { 1: 2, 2: 1, 3: 1 });
});
