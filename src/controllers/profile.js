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

async function updateProfile(userId, body) {
  const { username, email } = body;

  if (!username || !username.trim()) {
    return { error: 'Username is required.', status: 400 };
  }
  if (!email || !email.trim()) {
    return { error: 'Email is required.', status: 400 };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: 'Invalid email format.', status: 400 };
  }

  const trimmedUsername = username.trim();
  const trimmedEmail = email.trim();

  const existing = await db.pool.query(
    `SELECT id, username, email FROM users WHERE (username = $1 OR email = $2) AND id != $3`,
    [trimmedUsername, trimmedEmail, userId]
  );

  for (const row of existing.rows) {
    if (row.username === trimmedUsername) {
      return { error: 'Username already taken.', status: 409 };
    }
    if (row.email === trimmedEmail) {
      return { error: 'Email already taken.', status: 409 };
    }
  }

  const result = await db.pool.query(
    `UPDATE users SET username = $1, email = $2 WHERE id = $3
     RETURNING id, username, email, role_id, created_at`,
    [trimmedUsername, trimmedEmail, userId]
  );

  return result.rows[0];
}

module.exports = { getProfile, updateProfile };
