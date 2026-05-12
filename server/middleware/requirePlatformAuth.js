const { decrypt } = require('./tokenCrypto');
const db = require('../db');

// Lazy-load to avoid circular deps at startup
const platformServices = {
  linkedin: () => require('../services/platforms/linkedin'),
  x:        () => require('../services/platforms/twitter'),
  facebook: () => require('../services/platforms/facebook'),
  reddit:   () => require('../services/platforms/reddit'),
};

function requirePlatformAuth(platform) {
  return async (req, res, next) => {
    try {
      let conn = await db.platformConnections.getByPlatform(platform);
      if (!conn) return res.status(401).json({ error: `${platform} not connected` });

      const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : null;
      const bufferMs  = 5 * 60 * 1000;

      if (expiresAt && expiresAt.getTime() - Date.now() < bufferMs) {
        const service = platformServices[platform]?.();
        if (!service?.refreshToken) {
          return res.status(401).json({ error: `${platform} token expired — please reconnect` });
        }
        conn = await service.refreshToken(conn);
      }

      req.platformToken     = decrypt(conn.access_token);
      req.platformAccountId = conn.account_id;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = requirePlatformAuth;
