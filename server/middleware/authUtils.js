const bcrypt    = require('bcryptjs');
const crypto    = require('crypto');
const appConfig = require('../db/appConfig');

const COOKIE_NAME   = 'postly_session';
const SESSION_HOURS = parseInt(process.env.SESSION_DURATION_HOURS || '12', 10);
const SESSION_MS    = SESSION_HOURS * 60 * 60 * 1000;

// In-memory session store: token → expiry timestamp (ms).
// Sessions are intentionally lost on restart — re-login is the recovery path.
const sessions = new Map();

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
  const token     = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_MS;
  sessions.set(token, expiresAt);
  return token;
}

function verifySession(token) {
  if (!token) return false;
  const expiresAt = sessions.get(token);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function destroySession(token) {
  if (token) sessions.delete(token);
}

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
