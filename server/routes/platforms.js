const router   = require('express').Router();
const crypto   = require('crypto');
const { encrypt } = require('../middleware/tokenCrypto');
const db       = require('../db');

const linkedin = require('../services/platforms/linkedin');
const twitter  = require('../services/platforms/twitter');

const PLATFORMS = ['linkedin', 'x'];

// Derive the redirect URI from SERVER_URL so the user can copy it into the platform app console
function getRedirectUri(platform) {
  const base = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3001}`;
  return `${base}/api/platforms/${platform}/callback`;
}

// ── App Credentials ───────────────────────────────────────────────────────────

// GET /api/platforms/:platform/credentials
// Returns whether credentials are saved + the redirect URI to paste into the developer console
router.get('/:platform/credentials', async (req, res, next) => {
  try {
    const { platform } = req.params;
    if (!PLATFORMS.includes(platform)) {
      return res.status(400).json({ error: `Unknown platform: ${platform}` });
    }
    const configured = await db.platformCredentials.isSet(platform);
    res.json({ platform, configured, redirectUri: getRedirectUri(platform) });
  } catch (err) { next(err); }
});

// POST /api/platforms/:platform/credentials  { clientId, clientSecret }
router.post('/:platform/credentials', async (req, res, next) => {
  try {
    const { platform } = req.params;
    const { clientId, clientSecret } = req.body;
    if (!clientId || !clientSecret) {
      return res.status(400).json({ error: 'clientId and clientSecret are required' });
    }
    if (!PLATFORMS.includes(platform)) {
      return res.status(400).json({ error: `Unknown platform: ${platform}` });
    }
    await db.platformCredentials.save(platform, clientId, clientSecret);
    res.json({ saved: true, platform, redirectUri: getRedirectUri(platform) });
  } catch (err) { next(err); }
});

// DELETE /api/platforms/:platform/credentials  — remove app credentials (also disconnects)
router.delete('/:platform/credentials', async (req, res, next) => {
  try {
    const { platform } = req.params;
    if (!PLATFORMS.includes(platform)) {
      return res.status(400).json({ error: `Unknown platform: ${platform}` });
    }
    await db.platformCredentials.remove(platform);
    // Also clear any stored OAuth tokens since they're now orphaned
    await db.platformConnections.remove(platform).catch(() => {});
    res.json({ removed: platform });
  } catch (err) { next(err); }
});

// ── OAuth Flow ────────────────────────────────────────────────────────────────

// GET /api/platforms/status
router.get('/status', async (_req, res, next) => {
  try {
    const connections   = await db.platformConnections.getAll();
    const now           = new Date();
    const warningAt     = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const status = {};
    for (const p of PLATFORMS) {
      const configured = await db.platformCredentials.isSet(p);
      const conn       = connections.find((c) => c.platform === p);
      if (!conn) {
        status[p] = { configured, connected: false };
        continue;
      }
      const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : null;
      let state = 'connected';
      if (expiresAt) {
        if (expiresAt < now)       state = 'expired';
        else if (expiresAt < warningAt) state = 'expiring';
      }
      status[p] = { configured, connected: true, state, accountName: conn.account_name, accountId: conn.account_id, expiresAt: conn.token_expires_at, connectedAt: conn.connected_at };
    }
    res.json(status);
  } catch (err) { next(err); }
});

// GET /api/platforms/:platform/auth  — redirect to OAuth consent screen
router.get('/:platform/auth', async (req, res, next) => {
  try {
    const { platform } = req.params;
    if (!PLATFORMS.includes(platform)) {
      return res.status(400).json({ error: `Unknown platform: ${platform}` });
    }
    const creds = await db.platformCredentials.getDecrypted(platform);
    const redirectUri = getRedirectUri(platform);
    const state = crypto.randomBytes(16).toString('hex');
    let url;
    switch (platform) {
      case 'linkedin': url = linkedin.getAuthUrl(state, { ...creds, redirectUri }); break;
      case 'x':        url = twitter.getAuthUrl(state, { ...creds, redirectUri });  break;
      default: return res.status(400).json({ error: `Unknown platform: ${platform}` });
    }
    res.redirect(url);
  } catch (err) { next(err); }
});

// GET /api/platforms/:platform/callback  — exchange code → save encrypted tokens → redirect
router.get('/:platform/callback', async (req, res, next) => {
  try {
    const { platform } = req.params;
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      return res.redirect(`${process.env.FRONTEND_URL}/platforms?error=${encodeURIComponent(oauthError)}`);
    }

    if (!PLATFORMS.includes(platform)) {
      return res.status(400).json({ error: `Unknown platform: ${platform}` });
    }

    const creds      = await db.platformCredentials.getDecrypted(platform);
    const redirectUri = getRedirectUri(platform);

    switch (platform) {
      case 'linkedin': {
        const tokens  = await linkedin.exchangeCode(code, { ...creds, redirectUri });
        const profile = await linkedin.getProfile(tokens.access_token);
        await db.platformConnections.upsert('linkedin', {
          access_token:     encrypt(tokens.access_token),
          refresh_token:    tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
          token_expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
          account_id:   profile.sub,
          account_name: profile.name || [profile.given_name, profile.family_name].filter(Boolean).join(' '),
        });
        break;
      }
      case 'x': {
        const tokens  = await twitter.exchangeCode(code, state, { ...creds, redirectUri });
        const profile = await twitter.getProfile(tokens.access_token);
        await db.platformConnections.upsert('x', {
          access_token:     encrypt(tokens.access_token),
          refresh_token:    tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
          token_expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
          account_id:       profile.id,
          account_name:     profile.username,
        });
        break;
      }
      default:
        return res.status(400).json({ error: `Unknown platform: ${platform}` });
    }

    res.redirect(`${process.env.FRONTEND_URL}/platforms?connected=${platform}`);
  } catch (err) { next(err); }
});

// DELETE /api/platforms/:platform  — disconnect (remove OAuth tokens, keep app credentials)
router.delete('/:platform', async (req, res, next) => {
  try {
    const { platform } = req.params;
    if (!PLATFORMS.includes(platform)) {
      return res.status(400).json({ error: `Unknown platform: ${platform}` });
    }
    await db.platformConnections.remove(platform);
    res.json({ disconnected: platform });
  } catch (err) { next(err); }
});

module.exports = router;
