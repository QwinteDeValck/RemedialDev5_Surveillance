const db = require('../db');

function validate({ title, category, address, is_public }) {
  const errors = [];
  if (!title || !title.trim()) {
    errors.push('Title is required.');
  }
  if (!category || !category.trim()) {
    errors.push('Category is required.');
  }
  if (!address || !address.trim()) {
    errors.push('Address is required.');
  }
  if (is_public !== undefined && typeof is_public !== 'boolean') {
    errors.push('is_public must be a boolean.');
  }
  return errors;
}

async function create(data, userId) {
  const errors = validate(data);
  if (errors.length > 0) {
    return { error: errors.join(' ') };
  }

  const result = await db.pool.query(
    `INSERT INTO observations (title, category, description, address, latitude, longitude, is_public, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.title.trim(),
      data.category.trim(),
      data.description || null,
      data.address.trim(),
      data.latitude || null,
      data.longitude || null,
      data.is_public || false,
      userId,
    ]
  );

  return result.rows[0];
}

async function getAll(userId) {
  const result = await db.pool.query(
    'SELECT * FROM observations WHERE created_by = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

async function getById(id, userId) {
  const result = await db.pool.query(
    'SELECT * FROM observations WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    return { error: 'Observation not found.', status: 404 };
  }

  const observation = result.rows[0];

  if (!observation.is_public && observation.created_by !== userId) {
    return { error: 'Forbidden.', status: 403 };
  }

  return observation;
}

module.exports = { create, getAll, getById };
