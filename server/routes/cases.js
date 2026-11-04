import { Router } from 'express';
import { validateCase, validateTicket } from '../domain/validate.js';
import { CATEGORY_KEYS } from '../domain/catalog.js';

const router = Router();
const repo = (req) => req.app.get('repo');
const notFound = (res) => res.status(404).json({ error: 'not_found', message: 'Case not found.' });

function caseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    notFound(res);
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
  res.status(201).json(repo(req).insertCase(data, req.visitor.id));
});

router.get('/:id', (req, res) => {
  const id = caseId(req, res);
  if (!id) return;
  const r = repo(req);
  const item = r.getCase(id);
  if (!item) return notFound(res);
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
  if (!r.getCase(id)) return notFound(res);
  res.json({ case_id: id, learned: true, lesson_count: r.addLesson(id, req.visitor.id) });
});

router.post('/:id/tickets', (req, res) => {
  const id = caseId(req, res);
  if (!id) return;
  const r = repo(req);
  if (!r.getCase(id)) return notFound(res);
  const data = validateTicket(req.body ?? {});
  const ticket = r.insertTicket(id, req.visitor.id, data);
  // Whoever pins a ticket has, by definition, taken the lesson.
  r.addLesson(id, req.visitor.id);
  res.status(201).json(ticket);
});

export default router;
