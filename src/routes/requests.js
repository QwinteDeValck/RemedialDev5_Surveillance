const { Router } = require('express');
const requestsController = require('../controllers/requests');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.get('/:id/requests', authenticate, async (req, res) => {
  const requests = await requestsController.getRequestsForObservation(req.params.id, req.user.id);
  res.json(requests);
});

router.post('/:id/request', authenticate, async (req, res) => {
  const result = await requestsController.createRequest(req.params.id, req.user.id, req.body);
  if (result.error) {
    return res.status(result.status || 400).json({ error: result.error });
  }
  res.status(201).json(result);
});

module.exports = router;
