import { Router } from 'express';

const router = Router();
const repo = (req) => req.app.get('repo');

const TAKE_ERRORS = {
  not_found: [404, '티켓을 찾을 수 없습니다.'],
  already_taken: [409, '이미 누군가 가져간 티켓입니다.'],
  own_ticket: [409, '내가 붙인 티켓은 내가 가져갈 수 없습니다.'],
  one_per_case: [409, '같은 사례의 티켓은 한 장만 가져갈 수 있습니다.'],
  failed: [500, '티켓을 가져오지 못했습니다.'],
};

/** 벽 (아직 아무도 가져가지 않은 티켓) 또는 전체 */
router.get('/', (req, res) => {
  const status = req.query.status;
  const onWall = status === 'wall' ? true : status === 'taken' ? false : undefined;
  res.json({ items: repo(req).listTickets({ onWall }) });
});

router.post('/:id/take', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ error: 'not_found' });
  const result = repo(req).takeTicket(id, req.visitor.id);
  if (result.error) {
    const [status, message] = TAKE_ERRORS[result.error];
    return res.status(status).json({ error: result.error, message });
  }
  res.json(result.ticket);
});

export default router;
