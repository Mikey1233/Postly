const crypto = require('crypto');
const { encrypt, decrypt } = require('../../middleware/tokenCrypto');

const AUTH_BASE  = 'https://twitter.com/i/oauth2/authorize';
const TOKEN_URL  = 'https://api.twitter.com/2/oauth2/token';
const UPLOAD_URL = 'https://upload.twitter.com/1.1/media/upload.json';
const API_BASE   = 'https://api.twitter.com/2';
const SCOPES     = 'tweet.read tweet.write users.read offline.access media.write';
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

// In-memory PKCE store: state → { codeVerifier, expiresAt }
const pkceStore = new Map();

function generatePKCE() {
  const codeVerifier  = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

// creds = { clientId, clientSecret, redirectUri }
function getAuthUrl(state, creds) {
  const { codeVerifier, codeChallenge } = generatePKCE();
  pkceStore.set(state, { codeVerifier, expiresAt: Date.now() + 10 * 60 * 1000 });

  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             creds.clientId,
    redirect_uri:          creds.redirectUri,
    scope:                 SCOPES,
    state,
    code_challenge:        codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${AUTH_BASE}?${params}`;
}

function getPKCEVerifier(state) {
  const entry = pkceStore.get(state);
  if (!entry) throw new Error('Unknown or expired OAuth state');
  if (Date.now() > entry.expiresAt) {
    pkceStore.delete(state);
    throw new Error('OAuth state expired — please try connecting again');
  }
  pkceStore.delete(state);
  return entry.codeVerifier;
}

function makeBasicAuth(clientId, clientSecret) {
  return Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}

async function exchangeCode(code, state, creds) {
  const codeVerifier = getPKCEVerifier(state);
  const params = new URLSearchParams({
    grant_type:    'authorization_code',
    code,
    redirect_uri:  creds.redirectUri,
    code_verifier: codeVerifier,
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:  `Basic ${makeBasicAuth(creds.clientId, creds.clientSecret)}`,
    },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`X token exchange failed: ${data.error_description || JSON.stringify(data)}`);
  return data; // { access_token, refresh_token, expires_in, token_type, scope }
}

async function refreshToken(conn) {
  const db    = require('../../db');
  const creds = await db.platformCredentials.getDecrypted('x');
  const currentRefresh = decrypt(conn.refresh_token);

  const params = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: currentRefresh });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:  `Basic ${makeBasicAuth(creds.clientId, creds.clientSecret)}`,
    },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`X token refresh failed: ${data.error_description || JSON.stringify(data)}`);

  const expiresAt = new Date(Date.now() + (data.expires_in || 7200) * 1000).toISOString();
  return db.platformConnections.upsert('x', {
    access_token:     encrypt(data.access_token),
    refresh_token:    data.refresh_token ? encrypt(data.refresh_token) : conn.refresh_token,
    token_expires_at: expiresAt,
  });
}

async function getProfile(token) {
  const res = await fetch(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`X profile fetch failed: ${JSON.stringify(data)}`);
  return data.data; // { id, name, username }
}

// Chunked media upload: INIT → APPEND (5MB chunks) → FINALIZE → poll for video
async function uploadMediaChunked(token, buffer, mimeType) {
  const auth = `Bearer ${token}`;

  // INIT
  const initRes = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: auth },
    body: new URLSearchParams({ command: 'INIT', total_bytes: String(buffer.length), media_type: mimeType }).toString(),
  });
  const initData = await initRes.json();
  if (!initRes.ok) throw new Error(`X media INIT failed: ${JSON.stringify(initData)}`);
  const mediaId = initData.media_id_string;

  // APPEND
  const chunkCount = Math.ceil(buffer.length / CHUNK_SIZE);
  for (let i = 0; i < chunkCount; i++) {
    const chunk = buffer.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    const appendRes = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: auth },
      body: new URLSearchParams({ command: 'APPEND', media_id: mediaId, segment_index: String(i), media_data: chunk.toString('base64') }).toString(),
    });
    if (!appendRes.ok) throw new Error(`X media APPEND chunk ${i} failed: ${await appendRes.text()}`);
  }

  // FINALIZE
  const finalRes = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: auth },
    body: new URLSearchParams({ command: 'FINALIZE', media_id: mediaId }).toString(),
  });
  const finalData = await finalRes.json();
  if (!finalRes.ok) throw new Error(`X media FINALIZE failed: ${JSON.stringify(finalData)}`);

  if (finalData.processing_info) await pollMediaProcessing(auth, mediaId);
  return mediaId;
}

async function pollMediaProcessing(auth, mediaId, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const res  = await fetch(`${UPLOAD_URL}?command=STATUS&media_id=${mediaId}`, { headers: { Authorization: auth } });
    const data = await res.json();
    const state = data.processing_info?.state;
    if (state === 'succeeded') return;
    if (state === 'failed') throw new Error(`X media processing failed: ${JSON.stringify(data.processing_info)}`);
  }
  throw new Error('X media processing timed out');
}

// ── Publisher contract ───────────────────────────────────────────────────────

// X allows max 4 images per tweet (enforced by platformLimits before this point)
async function uploadMedia(buffer, mimeType, token /* , conn */) {
  return uploadMediaChunked(token, buffer, mimeType);
}

async function publishPost(post, mediaIds, token /* , conn */) {
  const body = {
    text: post.content || '',
    ...(mediaIds.length > 0 && { media: { media_ids: mediaIds } }),
  };
  const res = await fetch(`${API_BASE}/tweets`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`X publish failed: ${data.detail || data.title || JSON.stringify(data)}`);
  return { id: data.data?.id, raw: data };
}

module.exports = {
  getAuthUrl,
  exchangeCode,
  refreshToken,
  getProfile,
  uploadMediaChunked,
  uploadMedia,
  publishPost,
};
