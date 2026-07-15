const db = require('../db');

async function getProfile(userId) {
  const result = await db.pool.query(
    `SELECT u.id, u.username, u.email, u.role_id, r.name AS role_name, u.created_at
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return { error: 'User not found.', status: 404 };
  }

  return result.rows[0];
}

module.exports = { getProfile };
