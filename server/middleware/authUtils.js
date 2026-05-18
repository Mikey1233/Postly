const bcrypt    = require('bcryptjs');
const crypto    = require('crypto');
const appConfig = require('../db/appConfig');

const COOKIE_NAME   = 'postly_session';
const SESSION_HOURS = parseInt(process.env.SESSION_DURATION_HOURS || '12', 10);
const SESSION_MS    = SESSION_HOURS * 60 * 60 * 1000;

// Sessions are stateless HMAC-signed tokens. The token carries its own expiry
// and verifies against a key derived from ENCRYPTION_KEY, so server restarts
// (deploys, `node --watch` reloads) no longer invalidate active sessions.
// Logout is enforced client-side by clearing the cookie; we accept that a
// stolen token remains valid until its `exp` for this single-user tool.
function sessionKey() {
  const base = process.env.ENCRYPTION_KEY;
  if (!base) throw new Error('ENCRYPTION_KEY env var is required for session signing');
  return crypto.createHash('sha256').update(`postly-session:${base}`).digest();
}

function sign(payloadB64) {
  return crypto.createHmac('sha256', sessionKey()).update(payloadB64).digest('base64url');
}

// ── Credential helpers ────────────────────────────────────────────────────────

async function isAccountConfigured() {
  const [email, hash] = await Promise.all([
    appConfig.get('profile_email'),
    appConfig.get('password_hash'),
  ]);
  return !!(email && hash);
}

async function verifyCredentials(email, password) {
  const [storedEmail, storedHash] = await Promise.all([
    appConfig.get('profile_email'),
    appConfig.get('password_hash'),
  ]);
  if (!storedEmail || !storedHash) return false;
  if (storedEmail.toLowerCase() !== email.toLowerCase().trim()) return false;
  return bcrypt.compare(password, storedHash);
}

async function setCredentials(email, password) {
  const hash = await bcrypt.hash(password, 12);
  await Promise.all([
    appConfig.set('profile_email', email.toLowerCase().trim()),
    appConfig.set('password_hash', hash),
  ]);
}

// ── Session helpers ───────────────────────────────────────────────────────────

function createSession() {
  const payload    = { exp: Date.now() + SESSION_MS, nonce: crypto.randomBytes(8).toString('hex') };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${payloadB64}.${sign(payloadB64)}`;
}

function verifySession(token) {
  if (!token || typeof token !== 'string') return false;
  const dot = token.indexOf('.');
  if (dot === -1) return false;
  const payloadB64 = token.slice(0, dot);
  const sig        = token.slice(dot + 1);
  const expected   = sign(payloadB64);
  // Constant-time compare to avoid timing attacks on the signature.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    return typeof exp === 'number' && Date.now() < exp;
  } catch { return false; }
}

// Stateless tokens can't be revoked server-side without a deny-list. Logout
// works because clearSessionCookie removes the cookie from the browser — the
// token simply expires on schedule if the cookie is somehow retained.
function destroySession(_token) { /* no-op — see comment above */ }

// ── Cookie helpers ────────────────────────────────────────────────────────────

function setSessionCookie(res, token) {
  const prod = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   prod,
    // Cross-origin (Vercel → Railway) requires SameSite=None + Secure.
    // Lax is fine for same-origin dev where the proxy collapses the origin.
    sameSite: prod ? 'none' : 'lax',
    maxAge:   SESSION_MS,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

module.exports = {
  isAccountConfigured, verifyCredentials, setCredentials,
  createSession, verifySession, destroySession,
  setSessionCookie, clearSessionCookie, COOKIE_NAME,
};
