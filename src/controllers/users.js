const crypto = require('crypto');
const db = require('../db');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function validate({ username, email, password }) {
  const errors = [];
  if (!username || username.length < 3) {
    errors.push('Username must be at least 3 characters');
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Valid email is required');
  }
  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }
  return errors;
}

async function createUser({ username, email, password }) {
  const errors = validate({ username, email, password });
  if (errors.length > 0) {
    return { error: errors.join('; ') };
  }
  const hashed = hashPassword(password);
  try {
    const result = await db.pool.query(
      `INSERT INTO users (username, email, password) VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at`,
      [username, email, hashed]
    );
    return result.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      return { error: 'Username or email already exists' };
    }
    throw err;
  }
}

async function getUsers() {
  const result = await db.pool.query(
    'SELECT id, username, email, role_id, created_at FROM users ORDER BY created_at DESC'
  );
  return result.rows;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const verify = crypto.scryptSync(password, salt, 64).toString('hex');
  return hash === verify;
}

module.exports = { createUser, getUsers, hashPassword, verifyPassword };
