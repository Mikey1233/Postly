const { encrypt, decrypt } = require('../../middleware/tokenCrypto');

const AUTH_BASE = 'https://www.facebook.com/v18.0/dialog/oauth';
const TOKEN_URL = 'https://graph.facebook.com/v18.0/oauth/access_token';
const API_BASE  = 'https://graph.facebook.com/v18.0';
const SCOPES    = 'pages_manage_posts,groups_access_member_info,publish_to_groups';

// creds = { clientId, clientSecret, redirectUri }
function getAuthUrl(state, creds) {
  const params = new URLSearchParams({
    client_id:     creds.clientId,
    redirect_uri:  creds.redirectUri,
    scope:         SCOPES,
    state,
    response_type: 'code',
  });
  return `${AUTH_BASE}?${params}`;
}

async function exchangeCode(code, creds) {
  const params = new URLSearchParams({
    client_id:     creds.clientId,
    client_secret: creds.clientSecret,
    redirect_uri:  creds.redirectUri,
    code,
  });
  const res  = await fetch(`${TOKEN_URL}?${params}`);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(`Facebook token exchange failed: ${data.error?.message || JSON.stringify(data)}`);
  return data; // { access_token, token_type }
}

// Exchange short-lived token for a long-lived one (~60 days)
async function getLongLivedToken(shortToken, creds) {
  const params = new URLSearchParams({
    grant_type:        'fb_exchange_token',
    client_id:         creds.clientId,
    client_secret:     creds.clientSecret,
    fb_exchange_token: shortToken,
  });
  const res  = await fetch(`${TOKEN_URL}?${params}`);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(`Facebook long-lived token exchange failed: ${data.error?.message || JSON.stringify(data)}`);
  return data; // { access_token, token_type, expires_in }
}

// Facebook has no refresh token — re-auth required
async function refreshToken() {
  throw new Error('Facebook token expired — please reconnect on the Platforms page');
}

async function getProfile(token) {
  const res  = await fetch(`${API_BASE}/me?fields=id,name&access_token=${token}`);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(`Facebook profile fetch failed: ${data.error?.message || JSON.stringify(data)}`);
  return data; // { id, name }
}

async function getGroups(token) {
  const res  = await fetch(`${API_BASE}/me/groups?fields=id,name,member_count&access_token=${token}`);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(`Facebook groups fetch failed: ${data.error?.message || JSON.stringify(data)}`);
  return data.data || [];
}

// ── Publisher contract ───────────────────────────────────────────────────────

// For images: upload as unpublished photo, get photo_id, then attach to a feed post.
// For videos: upload to /me/videos directly with the description (one-shot).
async function uploadMedia(buffer, mimeType, token, conn) {
  if (!conn?.account_id) throw new Error('Facebook account_id missing on connection');

  if (mimeType.startsWith('video/')) {
    const form = new FormData();
    form.append('access_token', token);
    form.append('source', new Blob([buffer], { type: mimeType }));
    const res = await fetch(`${API_BASE}/${conn.account_id}/videos`, { method: 'POST', body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw new Error(`Facebook video upload failed: ${data.error?.message || JSON.stringify(data)}`);
    return { type: 'video', id: data.id };
  }

  // Image: upload as unpublished, attach to feed post during publish
  const form = new FormData();
  form.append('access_token', token);
  form.append('published', 'false');
  form.append('source', new Blob([buffer], { type: mimeType }));
  const res = await fetch(`${API_BASE}/${conn.account_id}/photos`, { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(`Facebook photo upload failed: ${data.error?.message || JSON.stringify(data)}`);
  return { type: 'photo', id: data.id };
}

async function publishPost(post, mediaRefs, token, conn) {
  if (!conn?.account_id) throw new Error('Facebook account_id missing on connection');

  // Video uploads are already published during upload — return that ID.
  const videoRef = mediaRefs.find((m) => m.type === 'video');
  if (videoRef) return { id: videoRef.id, raw: { videoId: videoRef.id } };

  const photoIds = mediaRefs.filter((m) => m.type === 'photo').map((m) => m.id);
  const body = new URLSearchParams({ access_token: token, message: post.content || '' });
  if (photoIds.length > 0) {
    photoIds.forEach((id, i) => body.append(`attached_media[${i}]`, JSON.stringify({ media_fbid: id })));
  }
  const res = await fetch(`${API_BASE}/${conn.account_id}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(`Facebook publish failed: ${data.error?.message || JSON.stringify(data)}`);
  return { id: data.id, raw: data };
}

module.exports = {
  getAuthUrl,
  exchangeCode,
  getLongLivedToken,
  refreshToken,
  getProfile,
  getGroups,
  uploadMedia,
  publishPost,
};
