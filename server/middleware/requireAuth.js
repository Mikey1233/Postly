const { verifySession, COOKIE_NAME } = require('./authUtils');

function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token || !verifySession(token)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

module.exports = requireAuth;
