const { verifyToken } = require('../services/authTokens');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: { message: 'You must be logged in.', code: 'NO_TOKEN' } });
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ error: { message: 'Your session has expired. Please log in again.', code: 'INVALID_TOKEN' } });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: { message: 'Admin access required.', code: 'FORBIDDEN' } });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
