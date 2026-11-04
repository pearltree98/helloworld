import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { openDb } from '../server/db.js';
import { seedIfEmpty, SEED_CASES } from '../server/seed.js';

let server, base, repo;
const A = { 'X-Visitor-Id': 'visitor-aaaa-0001', 'X-Visitor-Name': encodeURIComponent('철수') };
const B = { 'X-Visitor-Id': 'visitor-bbbb-0002', 'X-Visitor-Name': encodeURIComponent('영희') };

const req = async (method, path, { body, headers = {} } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, headers: res.headers, body: await res.json().catch(() => null) };
};

const validCase = () => ({
  title: '테스트 사례', category: 'home', situation: '상황', hazard: '원천', exposure: '상태',
  avoidance: '행동', severity: 4, likelihood: 3, outcome: 'near_miss',
});

before(async () => {
  repo = openDb(':memory:');
  seedIfEmpty(repo);
  server = createApp(repo).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); repo.close(); });

test('meta exposes categories, outcomes and risk levels', async () => {
  const { status, body } = await req('GET', '/api/meta');
  assert.equal(status, 200);
  assert.ok(body.categories.some((c) => c.key === 'road'));
  assert.equal(body.risk_levels.length, 4);
});

test('seeded cases are listed with risk score and counts', async () => {
  const { status, body } = await req('GET', '/api/cases?sort=risk');
  assert.equal(status, 200);
  assert.equal(body.items.length, SEED_CASES.length);
  const top = body.items[0];
  assert.equal(top.risk_score, top.severity * top.likelihood);
  assert.ok(['low', 'moderate', 'high', 'critical'].includes(top.risk_level));
  for (let i = 1; i < body.items.length; i++) assert.ok(body.items[i - 1].risk_score >= body.items[i].risk_score);
});

test('filter by category and search', async () => {
  const home = await req('GET', '/api/cases?category=home');
  assert.ok(home.body.items.every((c) => c.category === 'home'));
  const q = await req('GET', `/api/cases?q=${encodeURIComponent('사다리')}`);
  assert.equal(q.body.items.length, 1);
});

test('creating a case validates input', async () => {
  const bad = await req('POST', '/api/cases', { body: { title: '', category: 'nope', severity: 9 }, headers: A });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error, 'validation');
  assert.ok(bad.body.errors.title && bad.body.errors.category && bad.body.errors.severity && bad.body.errors.avoidance);

  const badUrl = await req('POST', '/api/cases', { body: { ...validCase(), source_url: 'javascript:alert(1)' }, headers: A });
  assert.equal(badUrl.status, 400);
  assert.ok(badUrl.body.errors.source_url);
});

test('creating a case records the author and returns risk', async () => {
  const { status, body } = await req('POST', '/api/cases', { body: validCase(), headers: A });
  assert.equal(status, 201);
  assert.equal(body.author_name, '철수');
  assert.equal(body.risk_score, 12);
  assert.equal(body.risk_level, 'high');
  assert.equal(body.lesson_count, 0);
});

test('a write without a visitor id gets one issued', async () => {
  const res = await req('POST', '/api/cases', { body: validCase() });
  assert.equal(res.status, 201);
  assert.match(res.headers.get('x-visitor-id') ?? '', /^[0-9a-f-]{36}$/);
});

test('lessons are one per visitor per case', async () => {
  const c = (await req('POST', '/api/cases', { body: validCase(), headers: A })).body;
  const first = await req('POST', `/api/cases/${c.id}/lessons`, { headers: B });
  const again = await req('POST', `/api/cases/${c.id}/lessons`, { headers: B });
  assert.equal(first.body.lesson_count, 1);
  assert.equal(again.body.lesson_count, 1);
  const detail = await req('GET', `/api/cases/${c.id}`, { headers: B });
  assert.equal(detail.body.learned, true);
  const other = await req('GET', `/api/cases/${c.id}`, { headers: A });
  assert.equal(other.body.learned, false);
});

test('ticket lifecycle: pin, wall, take once, not own, one per case', async () => {
  const c = (await req('POST', '/api/cases', { body: validCase(), headers: A })).body;

  const badPin = await req('POST', `/api/cases/${c.id}/tickets`, { body: { message: '', pledge_krw: -5 }, headers: A });
  assert.equal(badPin.status, 400);

  const pin = await req('POST', `/api/cases/${c.id}/tickets`, { body: { message: '한 걸음 뒤로', pledge_krw: 2000 }, headers: A });
  assert.equal(pin.status, 201);
  assert.equal(pin.body.giver_name, '철수');
  assert.equal(pin.body.taker_id, null);

  // 붙인 사람은 그 교훈을 받은 것으로 기록된다
  assert.equal((await req('GET', `/api/cases/${c.id}`, { headers: A })).body.learned, true);

  const wall = await req('GET', '/api/tickets?status=wall');
  assert.ok(wall.body.items.some((t) => t.id === pin.body.id));

  const own = await req('POST', `/api/tickets/${pin.body.id}/take`, { headers: A });
  assert.equal(own.status, 409);
  assert.equal(own.body.error, 'own_ticket');

  const take = await req('POST', `/api/tickets/${pin.body.id}/take`, { headers: B });
  assert.equal(take.status, 200);
  assert.equal(take.body.taker_name, '영희');
  assert.ok(take.body.taken_at);

  // 받은 사람은 교훈도 받은 것으로 기록된다
  assert.equal((await req('GET', `/api/cases/${c.id}`, { headers: B })).body.learned, true);

  const twice = await req('POST', `/api/tickets/${pin.body.id}/take`, { headers: B });
  assert.equal(twice.status, 409);
  assert.equal(twice.body.error, 'already_taken');

  const pin2 = await req('POST', `/api/cases/${c.id}/tickets`, { body: { message: '두 번째' }, headers: A });
  const onePerCase = await req('POST', `/api/tickets/${pin2.body.id}/take`, { headers: B });
  assert.equal(onePerCase.status, 409);
  assert.equal(onePerCase.body.error, 'one_per_case');

  const missing = await req('POST', '/api/tickets/999999/take', { headers: B });
  assert.equal(missing.status, 404);
});

test('stats aggregate everything', async () => {
  const { body } = await req('GET', '/api/stats');
  assert.ok(body.cases > SEED_CASES.length);
  assert.ok(body.tickets_taken >= 1);
  assert.ok(body.pledged_krw >= 2000);
  assert.ok(Array.isArray(body.by_category));
});

test('unknown api route and bad json are handled', async () => {
  assert.equal((await req('GET', '/api/nothing')).status, 404);
  const res = await fetch(`${base}/api/cases`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops' });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, 'bad_json');
});

test('serves the frontend', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /미리봄/);
});
