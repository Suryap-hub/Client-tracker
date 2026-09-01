const jwt = require('jsonwebtoken');

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const err = new Error('JWT_SECRET is not configured on the server.');
    err.status = 500;
    err.code = 'MISSING_JWT_SECRET';
    throw err;
  }
  return secret;
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email },
    getSecret(),
    { expiresIn: '12h' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, getSecret());
}

module.exports = { signToken, verifyToken };
