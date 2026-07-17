const jwt = require('jsonwebtoken');
const db = require('../db');

const secret = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-production';

const ROLE_LEVELS = { USER: 1, MODERATOR: 2, ADMIN: 3, OWNER: 4 };

async function getUserRoleName(userId) {
  const result = await db.pool.query(
    'SELECT r.name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1',
    [userId]
  );
  return result.rows[0]?.name || 'USER';
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role_id: user.role_id, role_name: user.role_name },
    secret,
    { expiresIn: '24h' }
  );
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, secret);
    req.user.role_name = await getUserRoleName(req.user.id);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function authorize(minRoleName) {
  return async (req, res, next) => {
    const roleName = await getUserRoleName(req.user.id);
    if (ROLE_LEVELS[roleName] < ROLE_LEVELS[minRoleName]) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }
    next();
  };
}

module.exports = { signToken, authenticate, authorize };
