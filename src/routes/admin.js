const { Router } = require('express');
const router = Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getDashboard, getUsers, updateUserRole, toggleUserStatus } = require('../controllers/admin');

router.get('/dashboard', authenticate, authorize('MODERATOR'), async (req, res) => {
  try {
    const data = await getDashboard();
    res.json(data);
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard.' });
  }
});

router.get('/users', authenticate, authorize('MODERATOR'), async (req, res) => {
  try {
    const { search, role, status } = req.query;
    const users = await getUsers({ search, role, status });
    res.json(users);
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to load users.' });
  }
});

router.put('/users/:id/role', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { role_name } = req.body;
    if (!role_name) {
      return res.status(400).json({ error: 'role_name is required.' });
    }
    const result = await updateUserRole(req.params.id, role_name, req.user.id);
    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('Admin update role error:', err);
    res.status(500).json({ error: 'Failed to update role.' });
  }
});

router.put('/users/:id/status', authenticate, authorize('MODERATOR'), async (req, res) => {
  try {
    const { action } = req.body;
    if (!action || !['activate', 'deactivate'].includes(action)) {
      return res.status(400).json({ error: 'action must be "activate" or "deactivate".' });
    }
    const result = await toggleUserStatus(req.params.id, action, req.user.id);
    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('Admin toggle status error:', err);
    res.status(500).json({ error: 'Failed to update user status.' });
  }
});

module.exports = router;
