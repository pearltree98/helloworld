import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeQuestion, normalizeBank, parseImport, mergeBanks, exportBank, normalizeTags, splitCheckMarkers } from '../src/core/bank.js';

let n = 0;
const makeId = () => `gen-${++n}`;

test('normalizeQuestion keeps known fields and drops the rest', () => {
  const q = normalizeQuestion({ id: 'a', question: '  연회비 얼마예요? ', modelAnswer: ' 답 ', needsCheck: true, persona: 'owner', tags: ['조건', ' 조건 ', ''], extra: 1 }, makeId);
  assert.deepEqual(q, { id: 'a', question: '연회비 얼마예요?', modelAnswer: '답', needsCheck: true, persona: 'owner', tags: ['조건'] });
});

test('unknown persona becomes random; needsCheck must be literally true', () => {
  const q = normalizeQuestion({ question: 'x', persona: 'ceo', needsCheck: 'yes' }, makeId);
  assert.equal(q.persona, null);
  assert.equal(q.needsCheck, false);
  assert.match(q.id, /^gen-/);
});

test('entries without question text are dropped', () => {
  assert.equal(normalizeQuestion({ question: '   ' }), null);
  assert.equal(normalizeQuestion(null), null);
  assert.equal(normalizeBank([{ question: '' }, { question: 'a' }, 5], makeId).length, 1);
});

test('duplicate ids are renamed so every question stays addressable', () => {
  const bank = normalizeBank([{ id: 'x', question: 'a' }, { id: 'x', question: 'b' }], makeId);
  assert.equal(new Set(bank.map((q) => q.id)).size, 2);
});

test('tags accept a comma string and are de-duplicated', () => {
  assert.deepEqual(normalizeTags('조건, 연회비,조건,'), ['조건', '연회비']);
});

test('export → import round-trips', () => {
  const bank = normalizeBank([{ id: 'a', question: 'q', modelAnswer: 'm', needsCheck: true, persona: 'busy', tags: ['t'] }]);
  const file = JSON.stringify(exportBank(bank, new Date('2026-11-25T00:00:00Z')));
  assert.deepEqual(parseImport(file), { questions: bank, skipped: 0 });
});

test('import accepts a bare array and counts skipped entries', () => {
  const { questions, skipped } = parseImport(JSON.stringify([{ question: 'a' }, { nope: 1 }]));
  assert.equal(questions.length, 1);
  assert.equal(skipped, 1);
});

test('import rejects junk with a Korean message', () => {
  assert.throws(() => parseImport('not json'), /JSON 형식이 아닙니다/);
  assert.throws(() => parseImport('{"x":1}'), /questions 목록/);
  assert.throws(() => parseImport('[]'), /가져올 질문이 없습니다/);
});

test('merge replaces same ids and appends new ones', () => {
  const merged = mergeBanks(
    [
      { id: 'a', question: '1' },
      { id: 'b', question: '2' },
    ],
    [
      { id: 'b', question: '2-new' },
      { id: 'c', question: '3' },
    ],
  );
  assert.deepEqual(
    merged.map((q) => `${q.id}:${q.question}`),
    ['a:1', 'b:2-new', 'c:3'],
  );
});

test('[확인 필요] markers are split out for highlighting', () => {
  assert.deepEqual(splitCheckMarkers('연회비가 [확인 필요]원입니다.'), [
    { text: '연회비가 ', marker: false },
    { text: '[확인 필요]', marker: true },
    { text: '원입니다.', marker: false },
  ]);
});
