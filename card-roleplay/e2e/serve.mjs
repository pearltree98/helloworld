// Minimal static server for dist/ that also applies the "headers" rules in
// vercel.json, so end-to-end checks run under the same CSP as production.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

function headerRules(vercelJson) {
  if (!existsSync(vercelJson)) return [];
  const { headers = [] } = JSON.parse(readFileSync(vercelJson, 'utf8'));
  return headers.map(({ source, headers: list }) => {
    const pattern = source.split('(.*)').map((p) => p.replace(/[.+?^${}()|[\]\\*]/g, '\\$&')).join('.*');
    return { test: new RegExp(`^${pattern}$`), list };
  });
}

export function serve(dir, { vercelJson } = {}) {
  const rules = headerRules(vercelJson);
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = normalize(join(dir, path));
    if (!file.startsWith(normalize(dir + sep)) && file !== normalize(dir)) {
      res.writeHead(403).end();
      return;
    }
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      const body = await readFile(file);
      for (const rule of rules) {
        if (rule.test.test(path)) for (const { key, value } of rule.list) res.setHeader(key, value);
      }
      res.setHeader('Content-Type', TYPES[extname(file)] || 'application/octet-stream');
      res.end(body);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ url: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(r)) });
    });
  });
}
