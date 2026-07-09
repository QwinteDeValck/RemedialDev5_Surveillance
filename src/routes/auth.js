const { Router } = require('express');
const authController = require('../controllers/auth');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.post('/login', async (req, res) => {
  const result = await authController.login(req.body);
  if (result.error) {
    return res.status(401).json({ error: result.error });
  }
  res.json(result);
});

router.get('/me', authenticate, (req, res) => {
  res.json(req.user);
});

module.exports = router;
