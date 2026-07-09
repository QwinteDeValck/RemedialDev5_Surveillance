const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-production';

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role_id: user.role_id },
    secret,
    { expiresIn: '24h' }
  );
}

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, secret);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = { signToken, authenticate };
