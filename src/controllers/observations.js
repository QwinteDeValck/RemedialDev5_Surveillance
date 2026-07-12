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

function validateUpdate(data) {
  const errors = [];
  if (data.title !== undefined && (!data.title || !data.title.trim())) {
    errors.push('Title cannot be empty.');
  }
  if (data.category !== undefined && (!data.category || !data.category.trim())) {
    errors.push('Category cannot be empty.');
  }
  if (data.address !== undefined && (!data.address || !data.address.trim())) {
    errors.push('Address cannot be empty.');
  }
  if (data.is_public !== undefined && typeof data.is_public !== 'boolean') {
    errors.push('is_public must be a boolean.');
  }
  return errors;
}

async function update(id, userId, data) {
  const existing = await db.pool.query('SELECT * FROM observations WHERE id = $1', [id]);

  if (existing.rows.length === 0) {
    return { error: 'Observation not found.', status: 404 };
  }

  const observation = existing.rows[0];

  if (observation.created_by !== userId) {
    return { error: 'Forbidden.', status: 403 };
  }

  if (observation.is_public) {
    return { error: 'Cannot edit a public observation.', status: 403 };
  }

  const errors = validateUpdate(data);
  if (errors.length > 0) {
    return { error: errors.join(' ') };
  }

  const title = data.title !== undefined ? data.title.trim() : observation.title;
  const category = data.category !== undefined ? data.category.trim() : observation.category;
  const description = data.description !== undefined ? data.description : observation.description;
  const address = data.address !== undefined ? data.address.trim() : observation.address;
  const is_public = data.is_public !== undefined ? data.is_public : observation.is_public;

  const result = await db.pool.query(
    `UPDATE observations
     SET title = $1, category = $2, description = $3, address = $4, is_public = $5
     WHERE id = $6
     RETURNING *`,
    [title, category, description, address, is_public, id]
  );

  return result.rows[0];
}

async function remove(id, userId) {
  const existing = await db.pool.query('SELECT * FROM observations WHERE id = $1', [id]);

  if (existing.rows.length === 0) {
    return { error: 'Observation not found.', status: 404 };
  }

  const observation = existing.rows[0];

  if (observation.created_by !== userId) {
    return { error: 'Forbidden.', status: 403 };
  }

  if (observation.is_public) {
    return { error: 'Cannot delete a public observation.', status: 403 };
  }

  await db.pool.query('DELETE FROM observations WHERE id = $1', [id]);
  return { message: 'Observation deleted.' };
}

module.exports = { create, getAll, getById, update, remove };
