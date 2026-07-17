const db = require('../db');

async function createRequest(observationId, userId, data) {
  if (!data.type || !['EDIT', 'DELETE'].includes(data.type)) {
    return { error: 'Type must be EDIT or DELETE.', status: 400 };
  }

  const obs = await db.pool.query(
    'SELECT * FROM observations WHERE id = $1',
    [observationId]
  );

  if (obs.rows.length === 0) {
    return { error: 'Observation not found.', status: 404 };
  }

  const observation = obs.rows[0];

  if (observation.created_by !== userId) {
    return { error: 'Forbidden.', status: 403 };
  }

  if (!observation.is_public) {
    return { error: 'Only public observations can have requests.', status: 400 };
  }

  if (data.type === 'EDIT') {
    if (!data.proposed_title && !data.proposed_category && !data.proposed_description && !data.proposed_address) {
      return { error: 'At least one proposed field is required for EDIT requests.', status: 400 };
    }
  }

  const result = await db.pool.query(
    `INSERT INTO observation_requests (observation_id, requested_by, type, reason, proposed_title, proposed_category, proposed_description, proposed_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      observationId, userId, data.type, data.reason || null,
      data.proposed_title || null, data.proposed_category || null,
      data.proposed_description || null, data.proposed_address || null,
    ]
  );

  return result.rows[0];
}

async function getRequestsForObservation(observationId, userId) {
  const result = await db.pool.query(
    `SELECT * FROM observation_requests
     WHERE observation_id = $1 AND requested_by = $2
     ORDER BY created_at DESC`,
    [observationId, userId]
  );
  return result.rows;
}

module.exports = { createRequest, getRequestsForObservation };
