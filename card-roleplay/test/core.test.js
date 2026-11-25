import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings, DEFAULT_SETTINGS } from '../src/core/settings.js';
import { activeLevel, summarize, formatSec, mean } from '../src/core/stats.js';
import { createOnsetDetector, levelFromRms } from '../src/core/onset.js';
import * as store from '../src/core/store.js';
import seed from '../src/data/seed.json' with { type: 'json' };
import { PERSONA_IDS } from '../src/data/personas.js';

test('settings: defaults match the spec (3 s reaction, 20 s answer, 5 per session, 50 recordings)', () => {
  const s = normalizeSettings(undefined);
  assert.equal(s.reactionLimitSec, 3);
  assert.equal(s.answerLimitSec, 20);
  assert.equal(s.sessionSize, 5);
  assert.equal(s.recordingCap, 50);
  assert.equal(s.rate, 1);
  assert.deepEqual(s, { ...DEFAULT_SETTINGS });
});

test('settings: values are clamped and snapped to their ranges', () => {
  const s = normalizeSettings({ rate: 2, reactionLimitSec: 2.7, answerLimitSec: 'x', sessionSize: -3, transcribe: 'no', voiceURI: 7 });
  assert.equal(s.rate, 1.1);
  assert.equal(s.reactionLimitSec, 2.5);
  assert.equal(s.answerLimitSec, 20);
  assert.equal(s.sessionSize, 1);
  assert.equal(s.transcribe, true);
  assert.equal(s.voiceURI, '');
});

test('stats: active level ignores the quiet half (pauses between words)', () => {
  assert.equal(activeLevel([]), null);
  assert.equal(activeLevel([10, 10, 60, 60]), 60);
  assert.equal(activeLevel([50, 0, 70]), 60);
});

test('stats: session summary', () => {
  const sum = summarize([
    { reactionMs: 1000, late: false, retry: false },
    { reactionMs: 4000, late: true, retry: true },
    { reactionMs: null, late: true, retry: true, skipped: true },
  ]);
  assert.deepEqual(sum, { count: 3, detected: 2, avgReactionMs: 2500, withinLimit: 1, retryCount: 2, skipped: 1 });
  assert.equal(formatSec(1234), '1.2초');
  assert.equal(formatSec(null), '—');
  assert.equal(mean([]), null);
});

test('onset: voice must stay above the line for the hold time; onset is the start of that run', () => {
  const d = createOnsetDetector({ threshold: 30, holdMs: 150 });
  assert.equal(d.push(50, 0), null); // a click…
  assert.equal(d.push(10, 50), null); // …that stops is not speech
  assert.equal(d.push(40, 100), null);
  assert.equal(d.push(40, 150), null);
  assert.equal(d.push(40, 200), null);
  assert.equal(d.push(40, 250), 100);
  assert.equal(d.push(40, 300), null, 'fires once');
});

test('onset: level scale is −60 dBFS → 0 and 0 dBFS → 100', () => {
  assert.equal(levelFromRms(0), 0);
  assert.equal(levelFromRms(1), 100);
  assert.equal(Math.round(levelFromRms(0.001)), 0);
  assert.equal(Math.round(levelFromRms(10 ** (-30 / 20))), 50);
});

test('seed bank: the 10 questions from the spec, with needsCheck as specified', () => {
  assert.equal(seed.length, 10);
  const expected = { q01: false, q02: true, q03: true, q04: true, q05: false, q06: false, q07: true, q08: true, q09: true, q10: true };
  for (const q of seed) {
    assert.equal(typeof q.question, 'string');
    assert.equal(typeof q.modelAnswer, 'string');
    assert.equal(q.needsCheck, expected[q.id], q.id);
    assert.ok(q.persona === null || PERSONA_IDS.includes(q.persona), q.id);
    if (q.needsCheck) assert.match(q.modelAnswer, /\[|기준|법/, `${q.id} should show what to check`);
  }
});

test('store: first load seeds the bank; data round-trips through storage', () => {
  const mem = new Map();
  store.setStorage({ getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) });
  assert.equal(store.loadBank().length, 10);
  store.saveBank([{ question: '새 질문' }]);
  assert.equal(store.loadBank()[0].question, '새 질문');
  store.upsertSession({ id: 's1', startedAt: 1, items: [] });
  store.upsertSession({ id: 's2', startedAt: 2, items: [] });
  store.upsertSession({ id: 's1', startedAt: 1, items: [{ x: 1 }] });
  assert.deepEqual(
    store.loadHistory().map((s) => s.id),
    ['s1', 's2'],
  );
  mem.set(store.KEYS.progress, '{broken');
  assert.deepEqual(store.loadProgress(), {}, 'corrupt data falls back instead of crashing');
});
