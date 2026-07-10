const { Router } = require('express');
const observationsController = require('../controllers/observations');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.post('/', authenticate, async (req, res) => {
  const result = await observationsController.create(req.body, req.user.id);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  res.status(201).json(result);
});

module.exports = router;
