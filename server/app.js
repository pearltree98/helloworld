import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { cleanNickname, isVisitorId, ValidationError } from './domain/validate.js';
import casesRouter from './routes/cases.js';
import ticketsRouter from './routes/tickets.js';
import statsRouter from './routes/stats.js';
import { CATEGORIES, OUTCOMES } from './domain/catalog.js';
import { RISK_LEVELS } from './domain/risk.js';

const WEB_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'web');

/**
 * 방문자 식별 (v1: 로그인 없이 브라우저가 만든 id를 헤더로 보낸다)
 *  X-Visitor-Id   : 8~64자의 [A-Za-z0-9_-]
 *  X-Visitor-Name : URL 인코딩된 별명 (선택)
 * 쓰기 요청인데 id가 없으면 새로 발급해 응답 헤더로 돌려준다.
 */
function visitor(repo) {
  return (req, res, next) => {
    const rawId = req.get('x-visitor-id');
    const id = isVisitorId(rawId) ? rawId : null;
    let nickname = '익명';
    try {
      nickname = cleanNickname(decodeURIComponent(req.get('x-visitor-name') ?? ''));
    } catch {
      nickname = '익명';
    }
    req.visitor = { id, nickname };

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

  app.get('/api/meta', (_req, res) => {
    res.json({ categories: CATEGORIES, outcomes: OUTCOMES, risk_levels: RISK_LEVELS });
  });
  app.get('/api/me', (req, res) => {
    const v = req.visitor.id ? repo.getVisitor(req.visitor.id) : null;
    res.json({ id: req.visitor.id, nickname: v?.nickname ?? req.visitor.nickname, registered: !!v });
  });
  app.post('/api/me', (req, res) => {
    const v = repo.ensureVisitor(req.visitor.id, cleanNickname(req.body?.nickname));
    res.json({ id: v.id, nickname: v.nickname, registered: true });
  });

  app.use('/api/cases', casesRouter);
  app.use('/api/tickets', ticketsRouter);
  app.use('/api/stats', statsRouter);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));

  // 정적 프론트엔드 + 해시 라우터이므로 index.html 하나로 충분
  app.use(express.static(WEB_DIR, { extensions: ['html'] }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: 'validation', message: err.message, errors: err.errors });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'bad_json', message: 'JSON 형식이 올바르지 않습니다.' });
    }
    console.error(err);
    res.status(500).json({ error: 'internal', message: '서버 오류가 발생했습니다.' });
  });

  return app;
}
