import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { cleanNickname, isVisitorId, ValidationError, LIMITS } from './domain/validate.js';
import casesRouter from './routes/cases.js';
import ticketsRouter from './routes/tickets.js';
import statsRouter from './routes/stats.js';
import { CATEGORY_KEYS, OUTCOME_KEYS } from './domain/catalog.js';
import { RISK_LEVELS } from './domain/risk.js';
import { LOCALES, LOCALES_DIR, DEFAULT_LOCALE, pickLocale, catalogLabels } from './domain/locales.js';

const WEB_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'web');

export const CONTENT_LICENSE = { name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' };
export const CODE_LICENSE = { name: 'AGPL-3.0', url: 'https://www.gnu.org/licenses/agpl-3.0.html' };
/** AGPL §13: a network service must offer its users the source. Point this at the running fork. */
export const SOURCE_URL = process.env.SOURCE_URL ?? 'https://github.com/pearltree98/helloworld';

/**
 * Visitor identity (v1: no login; the browser mints an id and sends it as a header).
 *  X-Visitor-Id   : 8–64 chars of [A-Za-z0-9_-]
 *  X-Visitor-Name : URL-encoded display name (optional)
 * A write without an id gets one issued and returned in the response header.
 */
function visitor(repo) {
  return (req, res, next) => {
    const rawId = req.get('x-visitor-id');
    let nickname = 'Anonymous';
    try {
      nickname = cleanNickname(decodeURIComponent(req.get('x-visitor-name') ?? ''));
    } catch {
      nickname = 'Anonymous';
    }
    req.visitor = { id: isVisitorId(rawId) ? rawId : null, nickname };

    const writes = req.method !== 'GET' && req.method !== 'HEAD';
    if (writes) {
      if (!req.visitor.id) {
        req.visitor.id = randomUUID();
        res.set('X-Visitor-Id', req.visitor.id);
      }
      repo.ensureVisitor(req.visitor.id, req.visitor.nickname);
    }
    next();
  };
}

export function createApp(repo) {
  const app = express();
  app.disable('x-powered-by');
  app.set('repo', repo);
  app.use(express.json({ limit: '64kb' }));
  app.use(visitor(repo));

  app.get('/api/meta', (req, res) => {
    const locale = pickLocale(req.query.lang);
    const label = (group, key) => catalogLabels(locale, group)[key] ?? key;
    res.json({
      locale,
      locales: LOCALES,
      default_locale: DEFAULT_LOCALE,
      content_license: CONTENT_LICENSE,
      code_license: CODE_LICENSE,
      source_url: SOURCE_URL,
      limits: LIMITS,
      categories: CATEGORY_KEYS.map((key) => ({ key, label: label('categories', key) })),
      outcomes: OUTCOME_KEYS.map((key) => ({ key, label: label('outcomes', key) })),
      risk_levels: RISK_LEVELS.map(({ key, max }) => ({ key, max, label: label('risk_levels', key) })),
    });
  });
  app.get('/api/me', (req, res) => {
    const v = req.visitor.id ? repo.getVisitor(req.visitor.id) : null;
    res.json({ id: req.visitor.id, nickname: v?.nickname ?? req.visitor.nickname, registered: !!v });
  });
  app.post('/api/me', (req, res) => {
    const v = repo.ensureVisitor(req.visitor.id, cleanNickname(req.body?.nickname));
    res.json({ id: v.id, nickname: v.nickname, registered: true });
  });

  // Open data: the whole public dataset, reusable under the content licence.
  app.get('/api/export', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ license: CONTENT_LICENSE, exported_at: new Date().toISOString(), ...repo.exportAll() });
  });

  app.use('/api/cases', casesRouter);
  app.use('/api/tickets', ticketsRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found', message: 'Not found.' }));

  // Locale files are shared with the browser as-is.
  app.use('/locales', express.static(LOCALES_DIR, { maxAge: '1h' }));
  // Static frontend; a hash router means index.html is the only page.
  app.use(express.static(WEB_DIR, { extensions: ['html'] }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: 'validation', message: err.message, errors: err.errors });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'bad_json', message: 'Malformed JSON.' });
    }
    console.error(err);
    res.status(500).json({ error: 'internal', message: 'Something went wrong on the server.' });
  });

  return app;
}
