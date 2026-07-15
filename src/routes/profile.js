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

module.exports = router;
