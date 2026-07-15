const { Router } = require('express');
const profileController = require('../controllers/profile');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.get('/', authenticate, async (req, res) => {
  const result = await profileController.getProfile(req.user.id);
  if (result.error) {
    return res.status(result.status || 404).json({ error: result.error });
  }
  res.json(result);
});

router.put('/', authenticate, async (req, res) => {
  const result = await profileController.updateProfile(req.user.id, req.body);
  if (result.error) {
    return res.status(result.status || 400).json({ error: result.error });
  }
  res.json(result);
});

router.put('/password', authenticate, async (req, res) => {
  const result = await profileController.updatePassword(req.user.id, req.body);
  if (result.error) {
    return res.status(result.status || 400).json({ error: result.error });
  }
  res.json(result);
});

module.exports = router;
