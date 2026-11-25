// End-to-end check of the built app (dist/) in headless Chromium, served with
// the production headers from vercel.json (including the CSP).
//
// The browser gets a fake microphone (a tone), a fake Korean TTS voice and a
// fake speech recognizer, so the whole flow runs without a real device:
// first-run mic screen → home → offline reload → practice (reaction time on
// screen, recording, result, summary) → history → question bank.
//
// Usage: npm run e2e            (builds first)
//        node e2e/run.mjs --screenshots   also refreshes public/screenshots/*.png
//
// Needs Playwright with Chromium (npm i -D playwright && npx playwright install chromium).
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const out = `${root}e2e/out`;
const wantScreenshots = process.argv.includes('--screenshots');
mkdirSync(out, { recursive: true });

function writeToneWav(path, seconds = 6, amplitude = 0.3) {
  const rate = 48000;
  const n = rate * seconds;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(amplitude * Math.sin((2 * Math.PI * 220 * i) / rate) * 32767), 44 + i * 2);
  writeFileSync(path, buf);
}

// Runs in the page before any app code.
function fakeSpeechApis() {
  window.__csp = [];
  document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  const voice = { name: '한국어', lang: 'ko-KR', voiceURI: 'fake-ko', default: true, localService: true };
  const synth = {
    speaking: false,
    pending: false,
    getVoices: () => [voice],
    addEventListener() {},
    removeEventListener() {},
    resume() {},
    cancel() {
      clearTimeout(this._t);
      clearInterval(this._b);
      this.speaking = false;
    },
    speak(u) {
      this.speaking = true;
      setTimeout(() => u.onstart?.({}), 30);
      this._b = setInterval(() => u.onboundary?.({ name: 'word' }), 200);
      this._t = setTimeout(() => {
        clearInterval(this._b);
        this.speaking = false;
        u.onend?.({});
      }, 900);
    },
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  window.SpeechSynthesisUtterance = function (text) {
    this.text = text;
  };
  class FakeRecognition {
    start() {
      this._t = setTimeout(() => {
        this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: '네 지금 카드' }], { isFinal: false })] });
        this._t2 = setTimeout(
          () => this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: '네 지금 카드 쓰시는 데 불편 없으시면 괜찮습니다' }], { isFinal: true })] }),
          400,
        );
      }, 700);
    }
    stop() {
      clearTimeout(this._t);
      clearTimeout(this._t2);
      setTimeout(() => this.onend?.(), 30);
    }
    abort() {
      clearTimeout(this._t);
      clearTimeout(this._t2);
    }
  }
  window.SpeechRecognition = window.webkitSpeechRecognition = FakeRecognition;
}

const steps = [];
async function step(name, fn) {
  const t = Date.now();
  await fn();
  steps.push(`✓ ${name} (${Date.now() - t} ms)`);
  console.log(steps.at(-1));
}

writeToneWav(`${out}/tone.wav`);
const server = await serve(`${root}dist`, { vercelJson: `${root}vercel.json` });
const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${out}/tone.wav`],
});
const context = await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: wantScreenshots ? 2 : 1, locale: 'ko-KR' });
await context.grantPermissions(['microphone']);
await context.addInitScript(fakeSpeechApis);
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && pageErrors.push(m.text()));
page.on('dialog', (d) => d.accept());

try {
  await step('first run shows the microphone screen, then home', async () => {
    await page.goto(`${server.url}/`);
    await page.waitForURL(/#\/permission$/);
    await page.getByRole('button', { name: '마이크 허용하기' }).click();
    await page.waitForSelector('.home-head');
    assert.equal(await page.textContent('h1'), '카드 응대 연습');
  });

  await step('service worker takes control and home opens offline', async () => {
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller != null);
    await context.setOffline(true);
    await page.reload();
    await page.waitForSelector('.home-head');
    await context.setOffline(false);
  });

  await step('manifest is valid for install (PWABuilder)', async () => {
    const manifest = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).json());
    assert.equal(manifest.display, 'standalone');
    assert.ok(manifest.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable'));
    assert.ok(manifest.icons.some((i) => i.sizes === '192x192'));
    for (const icon of manifest.icons) {
      const status = await page.evaluate(async (src) => (await fetch(src)).status, icon.src);
      assert.equal(status, 200, icon.src);
    }
  });

  // The fake mic is a steady tone (level ≈ 47): keep it under the speech-start line so the
  // reaction time comes from the fake recognizer (0.7 s), and above the too-quiet line.
  await page.evaluate(() => localStorage.setItem('cr.settings.v1', JSON.stringify({ sessionSize: 2, speechLevel: 60, quietLevel: 40 })));

  await step('practice: question is read with lip sync, reaction time appears on screen', async () => {
    await page.goto(`${server.url}/#/practice`);
    await page.getByRole('button', { name: /응대 시작/ }).click();
    await page.waitForSelector('svg.avatar[data-talking="true"]');
    const mouths = new Set();
    for (let i = 0; i < 12; i++) {
      mouths.add(await page.getAttribute('svg.avatar', 'data-mouth'));
      await page.waitForTimeout(50);
    }
    assert.ok(mouths.size >= 2, `mouth should move, saw ${[...mouths]}`);
    await page.waitForSelector('main[data-phase="answering"]');
    assert.match(await page.textContent('.reaction-out'), /^반응 0\.[6-9]초/);
    if (wantScreenshots) {
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${root}public/screenshots/practice.png` });
    }
  });

  await step('result: metrics, transcript, playable recording, model answer badge', async () => {
    await page.waitForTimeout(1300);
    await page.getByRole('button', { name: '답변 끝' }).click();
    await page.waitForSelector('main[data-phase="result"]');
    const metrics = await page.$$eval('.metric', (els) => els.map((e) => e.textContent));
    assert.equal(metrics.length, 4);
    assert.match(await page.$eval('.card p.transcript', (e) => e.textContent), /불편 없으시면/);
    await page.waitForFunction(() => Number.isFinite(document.querySelector('audio')?.duration) && document.querySelector('audio').duration > 0.5);
    await page.getByRole('button', { name: '모범답안 초안 보기' }).click();
    await page.locator('label.check', { hasText: '첫 문장 또렷함' }).click();
    await page.getByRole('button', { name: '다음 문제' }).click();
  });

  await step('second question, then the session summary', async () => {
    await page.waitForSelector('main[data-phase="answering"]');
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: '답변 끝' }).click();
    await page.waitForSelector('main[data-phase="result"]');
    await page.getByRole('button', { name: '다시 풀기에 넣기' }).click();
    await page.getByRole('button', { name: '세션 요약 보기' }).click();
    await page.waitForSelector('main[data-phase="summary"]');
    assert.equal(await page.locator('.summary-list li').count(), 2);
    assert.match(await page.textContent('.practice-body'), /다시 풀기1개/);
    assert.match(await page.textContent('.practice-body'), /오답만 풀기 \(1문항\)/);
  });

  await step('history keeps the session and plays a recording from IndexedDB', async () => {
    await page.goto(`${server.url}/#/history`);
    await page.locator('details.session summary').first().click();
    assert.equal(await page.locator('details.session .attempt').count(), 2);
    await page.getByRole('button', { name: '▶ 녹음 듣기' }).first().click();
    await page.waitForFunction(() => Number.isFinite(document.querySelector('details audio')?.duration));
  });

  await step('question bank: add a question', async () => {
    await page.goto(`${server.url}/#/bank/new`);
    await page.fill('textarea >> nth=0', '포인트는 어디서 써요?');
    await page.fill('textarea >> nth=1', '[확인 필요: 포인트 사용처]');
    await page.getByRole('button', { name: '저장' }).click();
    await page.waitForURL(/#\/bank$/);
    await page.waitForSelector('.qitem');
    assert.equal(await page.locator('.qitem').count(), 11);
  });

  if (wantScreenshots) {
    await page.evaluate(() => localStorage.setItem('cr.settings.v1', JSON.stringify({ speechLevel: 60, quietLevel: 40 })));
    await page.goto(`${server.url}/#/`);
    await page.waitForSelector('.home-head');
    await page.screenshot({ path: `${root}public/screenshots/home.png` });
  }

  await step('no page errors and no CSP violations', async () => {
    const csp = await page.evaluate(() => window.__csp);
    assert.deepEqual(csp, []);
    assert.deepEqual(pageErrors, []);
  });

  console.log(`\nE2E 통과: ${steps.length}단계`);
} catch (err) {
  await page.screenshot({ path: `${out}/failure.png`, fullPage: true }).catch(() => {});
  console.error(`\nE2E 실패 (스크린샷: e2e/out/failure.png)\n`, err);
  process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
