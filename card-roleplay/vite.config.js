import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

/**
 * Emits dist/sw.js from src/sw-template.js with a precache list of every
 * built file and public asset, so the app opens offline after one visit.
 * The cache version is a hash of those files, so each deploy replaces the
 * previous cache.
 */
function serviceWorker() {
  return {
    name: 'card-roleplay:service-worker',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const hash = createHash('sha256');
      const urls = new Set(['./', 'index.html']);
      for (const [fileName, output] of Object.entries(bundle)) {
        if (fileName.endsWith('.map')) continue;
        urls.add(fileName);
        hash.update(fileName);
        hash.update(output.type === 'chunk' ? output.code : output.source);
      }
      const publicDir = join(root, 'public');
      for (const file of listFiles(publicDir)) {
        const rel = relative(publicDir, file).split(sep).join('/');
        if (rel.startsWith('.well-known/') || rel.startsWith('screenshots/')) continue;
        urls.add(rel);
        hash.update(rel);
        hash.update(readFileSync(file));
      }
      const version = hash.digest('hex').slice(0, 12);
      const template = readFileSync(join(root, 'src/sw-template.js'), 'utf8');
      const source = template
        .replace('__VERSION__', version)
        .replace("'__PRECACHE__'", JSON.stringify([...urls].sort()));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  plugins: [serviceWorker()],
  build: { target: 'es2020' },
});
