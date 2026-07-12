const { Router } = require('express');
const observationsController = require('../controllers/observations');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.get('/public', authenticate, async (req, res) => {
  const observations = await observationsController.getPublic();
  res.json(observations);
});

router.get('/', authenticate, async (req, res) => {
  const observations = await observationsController.getAll(req.user.id);
  res.json(observations);
});

router.get('/:id', authenticate, async (req, res) => {
  const result = await observationsController.getById(req.params.id, req.user.id);
  if (result.error) {
    return res.status(result.status || 400).json({ error: result.error });
  }
  res.json(result);
});

router.put('/:id', authenticate, async (req, res) => {
  const result = await observationsController.update(req.params.id, req.user.id, req.body);
  if (result.error) {
    return res.status(result.status || 400).json({ error: result.error });
  }
  res.json(result);
});

router.delete('/:id', authenticate, async (req, res) => {
  const result = await observationsController.remove(req.params.id, req.user.id);
  if (result.error) {
    return res.status(result.status || 400).json({ error: result.error });
  }
  res.json(result);
});

router.post('/', authenticate, async (req, res) => {
  const result = await observationsController.create(req.body, req.user.id);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  res.status(201).json(result);
});

module.exports = router;
