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

module.exports = { create };
