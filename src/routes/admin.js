const { Router } = require('express');
const router = Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getDashboard } = require('../controllers/admin');

router.get('/dashboard', authenticate, authorize('MODERATOR'), async (req, res) => {
  try {
    const data = await getDashboard();
    res.json(data);
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard.' });
  }
});

module.exports = router;
