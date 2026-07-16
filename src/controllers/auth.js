const db = require('../db');
const { verifyPassword } = require('./users');
const { signToken } = require('../middleware/auth');

async function login({ email, password }) {
  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const result = await db.pool.query(
    `SELECT u.id, u.username, u.email, u.password, u.role_id, u.deleted_at, r.name AS role_name
     FROM users u JOIN roles r ON r.id = u.role_id WHERE u.email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    return { error: 'Invalid email or password.' };
  }

  if (result.rows[0].deleted_at) {
    return { error: 'This account has been deleted.' };
  }

  const user = result.rows[0];

  if (!verifyPassword(password, user.password)) {
    return { error: 'Invalid email or password.' };
  }

  const token = signToken(user);

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role_id: user.role_id,
      role_name: user.role_name,
    },
  };
}

module.exports = { login };
