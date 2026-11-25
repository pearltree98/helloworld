// Renders public/icons/icon.svg to the PNG icons the manifest and PWABuilder need.
// Usage: npm run icons   (needs Playwright with Chromium installed)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// CommonJS resolution so a globally installed Playwright (NODE_PATH) also works.
const { chromium } = createRequire(import.meta.url)('playwright');

const dir = fileURLToPath(new URL('../public/icons/', import.meta.url));
const svg = readFileSync(dir + 'icon.svg', 'utf8');

// Maskable: full-bleed background, artwork shrunk into the 80% safe zone.
const maskable = svg
  .replace('<rect width="512" height="512" rx="112" fill="#1d3fbf"/>', '<rect width="512" height="512" fill="#1d3fbf"/><g transform="translate(51.2 51.2) scale(0.8)">')
  .replace('</svg>', '</g></svg>');

const jobs = [
  { file: 'icon-192.png', size: 192, source: svg },
  { file: 'icon-512.png', size: 512, source: svg },
  { file: 'icon-maskable-512.png', size: 512, source: maskable },
  { file: 'apple-touch-icon.png', size: 180, source: maskable },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const { file, size, source } of jobs) {
  await page.setViewportSize({ width: size, height: size });
  const sized = source.replace('<svg ', `<svg width="${size}" height="${size}" `);
  await page.setContent(`<html><body style="margin:0;background:transparent">${sized}</body></html>`);
  await page.locator('svg').screenshot({ path: dir + file, omitBackground: true });
  console.log('wrote', file);
}
await browser.close();
