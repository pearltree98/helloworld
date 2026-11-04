import { Router } from 'express';
import { validateCase, validateTicket } from '../domain/validate.js';
import { CATEGORY_KEYS } from '../domain/catalog.js';

const router = Router();
const repo = (req) => req.app.get('repo');

function caseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(404).json({ error: 'not_found' });
    return null;
  }
  return id;
}

router.get('/', (req, res) => {
  const { category, sort, q } = req.query;
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const items = repo(req).listCases({
    category: CATEGORY_KEYS.has(category) ? category : undefined,
    sort: typeof sort === 'string' ? sort : 'recent',
    q: typeof q === 'string' && q.trim() ? q.trim().slice(0, 60) : undefined,
    limit,
    offset,
  });
  res.json({ items, limit, offset });
});

router.post('/', (req, res) => {
  const data = validateCase(req.body ?? {});
  const created = repo(req).insertCase(data, req.visitor.id);
  res.status(201).json(created);
});

router.get('/:id', (req, res) => {
  const id = caseId(req, res);
  if (!id) return;
  const item = repo(req).getCase(id);
  if (!item) return res.status(404).json({ error: 'not_found' });
  const r = repo(req);
  res.json({
    ...item,
    learned: req.visitor.id ? r.hasLesson(id, req.visitor.id) : false,
    tickets: r.listTickets({ caseId: id }),
  });
});

router.post('/:id/lessons', (req, res) => {
  const id = caseId(req, res);
  if (!id) return;
  const r = repo(req);
  if (!r.getCase(id)) return res.status(404).json({ error: 'not_found' });
  const lesson_count = r.addLesson(id, req.visitor.id);
  res.json({ case_id: id, learned: true, lesson_count });
});

router.post('/:id/tickets', (req, res) => {
  const id = caseId(req, res);
  if (!id) return;
  const r = repo(req);
  if (!r.getCase(id)) return res.status(404).json({ error: 'not_found' });
  const data = validateTicket(req.body ?? {});
  const ticket = r.insertTicket(id, req.visitor.id, data);
  // 티켓을 붙이는 사람은 그 교훈을 이미 받은 사람이다.
  r.addLesson(id, req.visitor.id);
  res.status(201).json(ticket);
});

export default router;
