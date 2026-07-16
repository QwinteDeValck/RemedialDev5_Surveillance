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

module.exports = { getDashboard };
