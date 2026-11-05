/**
 * Renders content.json into shareable 1080×1080 PNG cards in tools/cards/out/.
 *   node tools/cards/render.mjs [content.json]
 *   node tools/cards/render.mjs tools/cards/riders.json   # rider set
 * Needs Playwright with Chromium and a Korean font (e.g. Noto Sans KR) installed on the machine.
 */
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const { chromium } = await import('playwright').catch(() => import('/opt/node-tools/node_modules/playwright/index.js'));
const contentPath = process.argv[2] ?? join(dir, 'content.json');
const items = JSON.parse(readFileSync(contentPath, 'utf8'));
const html = readFileSync(join(dir, 'card.html'), 'utf8');
mkdirSync(join(dir, 'out'), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });
await page.setContent(html);
for (const it of items) {
  await page.evaluate((it) => {
    document.getElementById('cat').textContent = it.cat;
    document.getElementById('title').textContent = it.title;
    document.getElementById('hazard').textContent = it.hazard;
    document.getElementById('avoid').textContent = it.avoid;
    document.getElementById('n').textContent = `${String(it.n).padStart(2, '0')} / ${items.length}`;
  }, it);
  await page.evaluate(() => document.fonts.ready);
  if (await page.evaluate(() => document.querySelector('.card').scrollHeight > 1080)) console.warn('overflow on card', it.n);
  await page.screenshot({ path: join(dir, 'out', `${String(it.n).padStart(2, '0')}.png`) });
}
await browser.close();
console.log(`rendered ${items.length} cards to ${join(dir, 'out')}`);
