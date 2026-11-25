import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/followup.js';
import { createFollowupProvider } from '../src/providers/followup-provider.js';
import { createStaticProvider } from '../src/providers/question-provider.js';

function fakeRes() {
  return {
    code: 0,
    body: null,
    headers: {},
    status(c) {
      this.code = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
    setHeader(k, v) {
      this.headers[k] = v;
    },
  };
}

test('/api/followup is off unless FEATURE_AI_FOLLOWUP=on', () => {
  delete process.env.FEATURE_AI_FOLLOWUP;
  const res = fakeRes();
  handler({ method: 'POST' }, res);
  assert.equal(res.code, 404);
});

test('/api/followup is a placeholder even when switched on', () => {
  process.env.FEATURE_AI_FOLLOWUP = 'on';
  const post = fakeRes();
  handler({ method: 'POST' }, post);
  assert.equal(post.code, 501);
  const get = fakeRes();
  handler({ method: 'GET' }, get);
  assert.equal(get.code, 405);
  delete process.env.FEATURE_AI_FOLLOWUP;
});

test('follow-up provider does nothing while the flag is off', async () => {
  let called = false;
  const p = createFollowupProvider({ fetchImpl: () => (called = true) });
  assert.equal(p.enabled, false);
  assert.equal(await p.followup({ question: 'q', transcript: 't', personaId: 'busy' }), null);
  assert.equal(called, false);
});

test('follow-up provider returns the server text when enabled', async () => {
  const p = createFollowupProvider({
    enabled: true,
    fetchImpl: async () => ({ ok: true, json: async () => ({ followup: ' 그럼 연회비는요? ' }) }),
  });
  assert.equal(await p.followup({ question: 'q', transcript: '네', personaId: 'busy' }), '그럼 연회비는요?');
});

test('static question provider fulfils the provider interface', async () => {
  const bank = [
    { id: 'a', question: 'A' },
    { id: 'b', question: 'B' },
  ];
  const provider = createStaticProvider({ getBank: () => bank, getProgress: () => ({ b: { retry: true } }) });
  assert.equal(provider.kind, 'static');
  assert.equal((await provider.nextSession({ mode: 'normal', size: 1 })).length, 1);
  assert.deepEqual(
    (await provider.nextSession({ mode: 'retry' })).map((q) => q.id),
    ['b'],
  );
});
