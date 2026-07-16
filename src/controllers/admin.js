const db = require('../db');

async function getDashboard() {
  const stats = await db.pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users) AS total_users,
      (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) AS active_users,
      (SELECT COUNT(*) FROM users WHERE deleted_at IS NOT NULL) AS deleted_users,
      (SELECT COUNT(*) FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name IN ('MODERATOR', 'ADMIN', 'OWNER')) AS moderator_plus,
      (SELECT COUNT(*) FROM observations) AS total_observations,
      (SELECT COUNT(*) FROM observations WHERE is_public = true) AS public_observations,
      (SELECT COUNT(*) FROM observation_requests WHERE status = 'PENDING') AS pending_requests
  `);

  return stats.rows[0];
}

async function getUsers({ search, role, status }) {
  let sql = `
    SELECT u.id, u.username, u.email, u.role_id, r.name AS role_name, u.created_at, u.deleted_at
    FROM users u JOIN roles r ON r.id = u.role_id
    WHERE 1=1
  `;
  const params = [];
  let idx = 1;

  if (search) {
    sql += ` AND (u.username ILIKE $${idx} OR u.email ILIKE $${idx})`;
    params.push(`%${search}%`);
    idx++;
  }

  if (role) {
    sql += ` AND r.name = $${idx}`;
    params.push(role.toUpperCase());
    idx++;
  }

  if (status === 'active') {
    sql += ' AND u.deleted_at IS NULL';
  } else if (status === 'deleted') {
    sql += ' AND u.deleted_at IS NOT NULL';
  }

  sql += ' ORDER BY u.created_at DESC';

  const result = await db.pool.query(sql, params);
  return result.rows;
}

async function updateUserRole(userId, newRoleName, requesterId) {
  const userResult = await db.pool.query(
    'SELECT u.id, u.role_id, r.name AS role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1',
    [userId]
  );

  if (userResult.rows.length === 0) {
    return { error: 'User not found.', status: 404 };
  }

  const targetUser = userResult.rows[0];

  if (targetUser.role_name === 'OWNER') {
    return { error: 'Cannot change the Owner role.', status: 403 };
  }

  if (targetUser.id === requesterId) {
    return { error: 'Cannot change your own role.', status: 403 };
  }

  const requesterResult = await db.pool.query(
    'SELECT r.name AS role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1',
    [requesterId]
  );

  if (requesterResult.rows.length === 0) {
    return { error: 'Requester not found.', status: 404 };
  }

  const requesterRoleName = requesterResult.rows[0].role_name;

  const roleResult = await db.pool.query('SELECT id, name FROM roles WHERE name = $1', [newRoleName.toUpperCase()]);

  if (roleResult.rows.length === 0) {
    return { error: 'Invalid role.', status: 400 };
  }

  if (roleResult.rows[0].name === 'OWNER') {
    return { error: 'Cannot promote to Owner.', status: 403 };
  }

  if (requesterRoleName !== 'OWNER' && roleResult.rows[0].name !== 'MODERATOR') {
    return { error: 'You can only promote users to MODERATOR.', status: 403 };
  }

  await db.pool.query('UPDATE users SET role_id = $1 WHERE id = $2', [roleResult.rows[0].id, userId]);

  return { message: `User role updated to ${roleResult.rows[0].name}.` };
}

async function toggleUserStatus(userId, action, requesterId) {
  const userResult = await db.pool.query(
    'SELECT u.id, u.deleted_at, r.name AS role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1',
    [userId]
  );

  if (userResult.rows.length === 0) {
    return { error: 'User not found.', status: 404 };
  }

  const targetUser = userResult.rows[0];

  if (targetUser.role_name === 'OWNER') {
    return { error: 'Cannot deactivate the Owner.', status: 403 };
  }

  if (targetUser.id === requesterId) {
    return { error: 'Cannot change your own status.', status: 403 };
  }

  if (action === 'deactivate') {
    if (targetUser.deleted_at) {
      return { error: 'User is already deactivated.', status: 400 };
    }
    await db.pool.query('UPDATE users SET deleted_at = NOW() WHERE id = $1', [userId]);
    return { message: 'User deactivated.' };
  }

  if (action === 'activate') {
    if (!targetUser.deleted_at) {
      return { error: 'User is already active.', status: 400 };
    }
    await db.pool.query('UPDATE users SET deleted_at = NULL WHERE id = $1', [userId]);
    return { message: 'User activated.' };
  }

  return { error: 'Invalid action. Use "activate" or "deactivate".', status: 400 };
}

async function getObservations({ search, category, status }) {
  let sql = `
    SELECT o.id, o.title, o.category, o.description, o.address, o.latitude, o.longitude,
           o.is_public, o.status AS obs_status, o.created_by, o.created_at,
           u.username AS creator_username
    FROM observations o JOIN users u ON u.id = o.created_by
    WHERE 1=1
  `;
  const params = [];
  let idx = 1;

  if (search) {
    sql += ` AND (o.title ILIKE $${idx} OR o.description ILIKE $${idx} OR o.address ILIKE $${idx})`;
    params.push(`%${search}%`);
    idx++;
  }

  if (category) {
    sql += ` AND o.category ILIKE $${idx}`;
    params.push(category);
    idx++;
  }

  if (status) {
    sql += ` AND o.status = $${idx}`;
    params.push(status.toUpperCase());
    idx++;
  }

  sql += ' ORDER BY o.created_at DESC';

  const result = await db.pool.query(sql, params);
  return result.rows;
}

async function getRequests({ status, type }) {
  let sql = `
    SELECT rq.id, rq.observation_id, rq.requested_by, rq.type, rq.reason, rq.status AS req_status, rq.created_at,
           o.title AS observation_title, u.username AS requester_username
    FROM observation_requests rq
    JOIN observations o ON o.id = rq.observation_id
    JOIN users u ON u.id = rq.requested_by
    WHERE 1=1
  `;
  const params = [];
  let idx = 1;

  if (status) {
    sql += ` AND rq.status = $${idx}`;
    params.push(status.toUpperCase());
    idx++;
  }

  if (type) {
    sql += ` AND rq.type = $${idx}`;
    params.push(type.toUpperCase());
    idx++;
  }

  sql += ' ORDER BY rq.created_at DESC';

  const result = await db.pool.query(sql, params);
  return result.rows;
}

async function approveRequest(requestId) {
  const reqResult = await db.pool.query(
    'SELECT id, observation_id, type, status FROM observation_requests WHERE id = $1',
    [requestId]
  );

  if (reqResult.rows.length === 0) {
    return { error: 'Request not found.', status: 404 };
  }

  const request = reqResult.rows[0];

  if (request.status !== 'PENDING') {
    return { error: 'Request is already processed.', status: 400 };
  }

  await db.pool.query('UPDATE observation_requests SET status = $1 WHERE id = $2', ['APPROVED', requestId]);

  if (request.type === 'DELETE') {
    await db.pool.query('UPDATE observations SET is_public = false WHERE id = $1', [request.observation_id]);
  }

  return { message: 'Request approved.' };
}

async function rejectRequest(requestId) {
  const reqResult = await db.pool.query(
    'SELECT id, status FROM observation_requests WHERE id = $1',
    [requestId]
  );

  if (reqResult.rows.length === 0) {
    return { error: 'Request not found.', status: 404 };
  }

  if (reqResult.rows[0].status !== 'PENDING') {
    return { error: 'Request is already processed.', status: 400 };
  }

  await db.pool.query('UPDATE observation_requests SET status = $1 WHERE id = $2', ['REJECTED', requestId]);

  return { message: 'Request rejected.' };
}

module.exports = { getDashboard, getUsers, updateUserRole, toggleUserStatus, getObservations, getRequests, approveRequest, rejectRequest };
