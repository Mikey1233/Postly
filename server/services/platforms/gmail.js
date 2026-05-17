const { encrypt, decrypt } = require('../../middleware/tokenCrypto');

const AUTH_BASE  = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL  = 'https://oauth2.googleapis.com/token';
const PROFILE_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const SEND_URL   = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

// gmail.send = send only (no read), openid+email+profile = identify connected account
const SCOPES = 'https://www.googleapis.com/auth/gmail.send openid email profile';

// ── OAuth ────────────────────────────────────────────────────────────────────

function getAuthUrl(state, creds) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     creds.clientId,
    redirect_uri:  creds.redirectUri,
    scope:         SCOPES,
    state,
    // offline + consent = guarantee a refresh_token even on subsequent connects
    access_type:   'offline',
    prompt:        'consent',
  });
  return `${AUTH_BASE}?${params}`;
}

async function exchangeCode(code, creds) {
  const params = new URLSearchParams({
    grant_type:    'authorization_code',
    code,
    client_id:     creds.clientId,
    client_secret: creds.clientSecret,
    redirect_uri:  creds.redirectUri,
  });
  const res = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    params.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Gmail token exchange failed: ${data.error_description || JSON.stringify(data)}`);
  return data;
}

async function refreshToken(conn) {
  const db    = require('../../db');
  const creds = await db.platformCredentials.getDecrypted('gmail');
  const currentRefresh = decrypt(conn.refresh_token);
  const params = new URLSearchParams({
    grant_type:    'refresh_token',
    refresh_token: currentRefresh,
    client_id:     creds.clientId,
    client_secret: creds.clientSecret,
  });
  const res = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    params.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Gmail token refresh failed: ${data.error_description || JSON.stringify(data)}`);
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  // Google does not return a new refresh_token on refresh — reuse the existing one.
  return db.platformConnections.upsert('gmail', {
    access_token:     encrypt(data.access_token),
    refresh_token:    conn.refresh_token,
    token_expires_at: expiresAt,
  });
}

async function getProfile(token) {
  const res = await fetch(PROFILE_URL, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(`Gmail profile fetch failed: ${JSON.stringify(data)}`);
  return data;
}

// ── Send ─────────────────────────────────────────────────────────────────────

// RFC 2047 — wrap non-ASCII subjects so receivers don't see `=?` headers raw.
function encodeSubject(subject) {
  if (!subject) return '';
  if (/^[\x20-\x7E]*$/.test(subject)) return subject;
  return `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
}

function buildMime({ from, to, subject, body }) {
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    body || '',
  ];
  return lines.join('\r\n');
}

function base64url(input) {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Send one email. Returns { id, threadId } from Gmail.
async function sendOne({ to, subject, body, fromName, fromEmail }, token) {
  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  const mime = buildMime({ from, to, subject, body });
  const raw  = base64url(mime);
  const res = await fetch(SEND_URL, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Gmail send to ${to} failed: ${data.error?.message || JSON.stringify(data)}`);
  return data;
}

module.exports = {
  getAuthUrl,
  exchangeCode,
  refreshToken,
  getProfile,
  sendOne,
};
