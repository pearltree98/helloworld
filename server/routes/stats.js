import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json(req.app.get('repo').stats());
});

export default router;
