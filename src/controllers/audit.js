const db = require('../db');

async function logAction({ action, entityType, entityId, performedBy, details }) {
  await db.pool.query(
    'INSERT INTO audit_log (action, entity_type, entity_id, performed_by, details) VALUES ($1, $2, $3, $4, $5)',
    [action, entityType || null, entityId || null, performedBy, details ? JSON.stringify(details) : null]
  );
}

async function getAuditLog({ action, entityType, userId, limit, offset }) {
  let sql = `
    SELECT al.id, al.action, al.entity_type, al.entity_id, al.details, al.created_at,
           u.username AS performed_by_username
    FROM audit_log al
    JOIN users u ON u.id = al.performed_by
    WHERE 1=1
  `;
  const params = [];
  let idx = 1;

  if (action) {
    if (Array.isArray(action)) {
      const placeholders = action.map(() => `$${idx++}`).join(', ');
      sql += ` AND al.action IN (${placeholders})`;
      params.push(...action);
    } else {
      sql += ` AND al.action = $${idx++}`;
      params.push(action);
    }
  }

  if (entityType) {
    sql += ` AND al.entity_type = $${idx++}`;
    params.push(entityType);
  }

  if (userId) {
    sql += ` AND al.performed_by = $${idx++}`;
    params.push(userId);
  }

  const countResult = await db.pool.query(
    `SELECT COUNT(*) AS total FROM (${sql}) filtered`, params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  sql += ' ORDER BY al.created_at DESC';
  sql += ` LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(limit || 50, offset || 0);

  const result = await db.pool.query(sql, params);
  return { entries: result.rows, total };
}

module.exports = { logAction, getAuditLog };
