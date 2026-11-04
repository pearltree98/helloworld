import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { openDb } from '../server/db.js';
import { seedIfEmpty, SEED_CASES } from '../server/seed.js';

let server, base, repo;
const A = { 'X-Visitor-Id': 'visitor-aaaa-0001', 'X-Visitor-Name': encodeURIComponent('Alex') };
const B = { 'X-Visitor-Id': 'visitor-bbbb-0002', 'X-Visitor-Name': encodeURIComponent('Bo') };

const req = async (method, path, { body, headers = {} } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, headers: res.headers, body: await res.json().catch(() => null) };
};

const validCase = () => ({
  title: 'Test case', category: 'home', situation: 'What happened', hazard: 'Source', exposure: 'State',
  avoidance: 'Action', severity: 4, likelihood: 3, outcome: 'near_miss',
});

before(async () => {
  repo = openDb(':memory:');
  seedIfEmpty(repo);
  server = createApp(repo).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); repo.close(); });

test('meta is localized and carries currency and limits', async () => {
  const en = await req('GET', '/api/meta');
  assert.equal(en.status, 200);
  assert.equal(en.body.locale, 'en');
  assert.equal(en.body.categories.find((c) => c.key === 'road').label, 'Road & driving');
  assert.equal(en.body.risk_levels.length, 4);
  assert.equal(typeof en.body.currency, 'string');
  assert.equal(en.body.limits.title, 80);

  const ko = await req('GET', '/api/meta?lang=ko');
  assert.equal(ko.body.categories.find((c) => c.key === 'road').label, '도로·운전');
  const unknown = await req('GET', '/api/meta?lang=xx');
  assert.equal(unknown.body.locale, 'en');
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
  assert.ok(home.body.items.length >= 2);
  assert.ok(home.body.items.every((c) => c.category === 'home'));
  const q = await req('GET', '/api/cases?q=ladder');
  assert.equal(q.body.items.length, 1);
});

test('creating a case validates input with error codes', async () => {
  const bad = await req('POST', '/api/cases', { body: { title: '', category: 'nope', severity: 9 }, headers: A });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error, 'validation');
  assert.deepEqual(bad.body.errors.title, { code: 'required' });
  assert.deepEqual(bad.body.errors.category, { code: 'invalid_choice' });
  assert.deepEqual(bad.body.errors.severity, { code: 'out_of_range', min: 1, max: 5 });
  assert.deepEqual(bad.body.errors.avoidance, { code: 'required' });

  const long = await req('POST', '/api/cases', { body: { ...validCase(), title: 'x'.repeat(81) }, headers: A });
  assert.deepEqual(long.body.errors.title, { code: 'too_long', max: 80 });

  const badUrl = await req('POST', '/api/cases', { body: { ...validCase(), source_url: 'javascript:alert(1)' }, headers: A });
  assert.equal(badUrl.status, 400);
  assert.deepEqual(badUrl.body.errors.source_url, { code: 'invalid_url' });
});

test('creating a case records the author and returns risk', async () => {
  const { status, body } = await req('POST', '/api/cases', { body: validCase(), headers: A });
  assert.equal(status, 201);
  assert.equal(body.author_name, 'Alex');
  assert.equal(body.risk_score, 12);
  assert.equal(body.risk_level, 'high');
  assert.equal(body.lesson_count, 0);
});

test('a write without a visitor id gets one issued', async () => {
  const res = await req('POST', '/api/cases', { body: validCase() });
  assert.equal(res.status, 201);
  assert.match(res.headers.get('x-visitor-id') ?? '', /^[0-9a-f-]{36}$/);
  assert.equal(res.body.author_name, 'Anonymous');
});

test('lessons are one per visitor per case', async () => {
  const c = (await req('POST', '/api/cases', { body: validCase(), headers: A })).body;
  const first = await req('POST', `/api/cases/${c.id}/lessons`, { headers: B });
  const again = await req('POST', `/api/cases/${c.id}/lessons`, { headers: B });
  assert.equal(first.body.lesson_count, 1);
  assert.equal(again.body.lesson_count, 1);
  assert.equal((await req('GET', `/api/cases/${c.id}`, { headers: B })).body.learned, true);
  assert.equal((await req('GET', `/api/cases/${c.id}`, { headers: A })).body.learned, false);
});

test('ticket lifecycle: pin, wall, take once, not own, one per case', async () => {
  const c = (await req('POST', '/api/cases', { body: validCase(), headers: A })).body;

  const badPin = await req('POST', `/api/cases/${c.id}/tickets`, { body: { message: '', pledge_amount: -5 }, headers: A });
  assert.equal(badPin.status, 400);
  assert.deepEqual(badPin.body.errors.message, { code: 'required' });
  assert.equal(badPin.body.errors.pledge_amount.code, 'out_of_range');

  const pin = await req('POST', `/api/cases/${c.id}/tickets`, { body: { message: 'One step back', pledge_amount: 2 }, headers: A });
  assert.equal(pin.status, 201);
  assert.equal(pin.body.giver_name, 'Alex');
  assert.equal(pin.body.pledge_amount, 2);
  assert.equal(pin.body.taker_id, null);

  // pinning counts as taking the lesson
  assert.equal((await req('GET', `/api/cases/${c.id}`, { headers: A })).body.learned, true);

  const wall = await req('GET', '/api/tickets?status=wall');
  assert.ok(wall.body.items.some((t) => t.id === pin.body.id));

  const own = await req('POST', `/api/tickets/${pin.body.id}/take`, { headers: A });
  assert.equal(own.status, 409);
  assert.equal(own.body.error, 'own_ticket');

  const take = await req('POST', `/api/tickets/${pin.body.id}/take`, { headers: B });
  assert.equal(take.status, 200);
  assert.equal(take.body.taker_name, 'Bo');
  assert.ok(take.body.taken_at);

  // taking counts as taking the lesson too
  assert.equal((await req('GET', `/api/cases/${c.id}`, { headers: B })).body.learned, true);

  const twice = await req('POST', `/api/tickets/${pin.body.id}/take`, { headers: B });
  assert.equal(twice.status, 409);
  assert.equal(twice.body.error, 'already_taken');

  const pin2 = await req('POST', `/api/cases/${c.id}/tickets`, { body: { message: 'Second' }, headers: A });
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
  assert.ok(body.pledged_amount >= 2);
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
  assert.match(await res.text(), /Stepback/);
});
