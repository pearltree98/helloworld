import { Router } from 'express';

const router = Router();
const repo = (req) => req.app.get('repo');

const TAKE_ERRORS = {
  not_found: [404, 'Ticket not found.'],
  already_taken: [409, 'Someone already took this ticket.'],
  own_ticket: [409, 'You cannot take a ticket you pinned yourself.'],
  one_per_case: [409, 'You can take only one ticket per case.'],
  failed: [500, 'Could not take the ticket.'],
};

/** The wall (tickets nobody has taken yet), tickets already taken, or everything. */
router.get('/', (req, res) => {
  const status = req.query.status;
  const onWall = status === 'wall' ? true : status === 'taken' ? false : undefined;
  res.json({ items: repo(req).listTickets({ onWall }) });
});

router.post('/:id/take', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ error: 'not_found', message: TAKE_ERRORS.not_found[1] });
  const result = repo(req).takeTicket(id, req.visitor.id);
  if (result.error) {
    const [status, message] = TAKE_ERRORS[result.error];
    return res.status(status).json({ error: result.error, message });
  }
  res.json(result.ticket);
});

export default router;
