const { Router } = require('express');
const router = Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getDashboard, getUsers, updateUserRole, toggleUserStatus, getObservations, getRequests, approveRequest, rejectRequest } = require('../controllers/admin');
const { getAuditLog } = require('../controllers/audit');

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

router.put('/users/:id/status', authenticate, authorize('ADMIN'), async (req, res) => {
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

router.get('/observations', authenticate, authorize('MODERATOR'), async (req, res) => {
  try {
    const { search, category, status } = req.query;
    const observations = await getObservations({ search, category, status });
    res.json(observations);
  } catch (err) {
    console.error('Admin observations error:', err);
    res.status(500).json({ error: 'Failed to load observations.' });
  }
});

router.get('/requests', authenticate, authorize('MODERATOR'), async (req, res) => {
  try {
    const { status, type } = req.query;
    const requests = await getRequests({ status, type });
    res.json(requests);
  } catch (err) {
    console.error('Admin requests error:', err);
    res.status(500).json({ error: 'Failed to load requests.' });
  }
});

router.put('/requests/:id/approve', authenticate, authorize('MODERATOR'), async (req, res) => {
  try {
    const result = await approveRequest(req.params.id, req.user.id);
    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('Admin approve request error:', err);
    res.status(500).json({ error: 'Failed to approve request.' });
  }
});

router.put('/requests/:id/reject', authenticate, authorize('MODERATOR'), async (req, res) => {
  try {
    const result = await rejectRequest(req.params.id, req.user.id);
    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('Admin reject request error:', err);
    res.status(500).json({ error: 'Failed to reject request.' });
  }
});

router.get('/audit', authenticate, async (req, res) => {
  try {
    const { scope = 'observations', action, entity_type, user_id, limit, offset } = req.query;
    const roleName = req.user.role_name;
    const isAdmin = roleName === 'ADMIN' || roleName === 'OWNER';

    if (scope === 'administration' && !isAdmin) {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    if (scope === 'observations' && !isAdmin && roleName !== 'MODERATOR') {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }

    const observationActions = ['REQUEST_APPROVE', 'REQUEST_REJECT'];
    const adminActions = ['ROLE_PROMOTION', 'ROLE_DEMOTION', 'USER_ACTIVATE', 'USER_DEACTIVATE'];

    let effectiveAction = action;
    if (!action) {
      if (scope === 'observations') {
        effectiveAction = observationActions;
      } else if (scope === 'administration') {
        effectiveAction = [...observationActions, ...adminActions];
      }
    }

    const data = await getAuditLog({
      action: effectiveAction,
      entityType: entity_type || null,
      userId: user_id || null,
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
    });

    res.json(data);
  } catch (err) {
    console.error('Admin audit log error:', err);
    res.status(500).json({ error: 'Failed to load audit log.' });
  }
});

module.exports = router;
