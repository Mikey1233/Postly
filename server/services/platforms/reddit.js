const { encrypt, decrypt } = require('../../middleware/tokenCrypto');

const AUTH_URL  = 'https://www.reddit.com/api/v1/authorize';
const TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
const API_BASE  = 'https://oauth.reddit.com';
const USER_AGENT = 'Postly/1.0';
const SCOPES    = 'submit read identity mysubreddits';

function makeBasicAuth(clientId, clientSecret) {
  return Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}

// creds = { clientId, clientSecret, redirectUri }
function getAuthUrl(state, creds) {
  const params = new URLSearchParams({
    client_id:     creds.clientId,
    response_type: 'code',
    state,
    redirect_uri:  creds.redirectUri,
    duration:      'permanent',
    scope:         SCOPES,
  });
  return `${AUTH_URL}?${params}`;
}

async function exchangeCode(code, creds) {
  const params = new URLSearchParams({
    grant_type:   'authorization_code',
    code,
    redirect_uri: creds.redirectUri,
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization:  `Basic ${makeBasicAuth(creds.clientId, creds.clientSecret)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent':   USER_AGENT,
    },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(`Reddit token exchange failed: ${data.error || JSON.stringify(data)}`);
  return data; // { access_token, refresh_token, expires_in, scope, token_type }
}

async function refreshToken(conn) {
  const db    = require('../../db');
  const creds = await db.platformCredentials.getDecrypted('reddit');
  const currentRefresh = decrypt(conn.refresh_token);

  const params = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: currentRefresh });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization:  `Basic ${makeBasicAuth(creds.clientId, creds.clientSecret)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent':   USER_AGENT,
    },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(`Reddit token refresh failed: ${data.error || JSON.stringify(data)}`);

  const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
  return db.platformConnections.upsert('reddit', {
    access_token:     encrypt(data.access_token),
    refresh_token:    data.refresh_token ? encrypt(data.refresh_token) : conn.refresh_token,
    token_expires_at: expiresAt,
  });
}

async function getProfile(token) {
  const res  = await fetch(`${API_BASE}/api/v1/me`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': USER_AGENT },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Reddit profile fetch failed: ${JSON.stringify(data)}`);
  return data; // { id, name, icon_img, ... }
}

async function getSubreddits(token) {
  const res  = await fetch(`${API_BASE}/subreddits/mine/subscriber?limit=100`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': USER_AGENT },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Reddit subreddits fetch failed: ${JSON.stringify(data)}`);
  return (data.data?.children || []).map((c) => ({
    group_id:     c.data.id,
    name:         c.data.display_name,
    description:  c.data.public_description,
    member_count: c.data.subscribers,
    metadata:     { display_name_prefixed: c.data.display_name_prefixed, url: c.data.url },
  }));
}

// ── Publisher contract ───────────────────────────────────────────────────────

// Reddit's media lease flow: ask for an S3 upload lease, PUT the file, get the asset URL back.
async function uploadMedia(buffer, mimeType, token /* , conn */) {
  const leaseBody = new URLSearchParams({ filepath: `postly_${Date.now()}`, mimetype: mimeType });
  const leaseRes = await fetch(`${API_BASE}/api/media/asset.json`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent':   USER_AGENT,
    },
    body: leaseBody.toString(),
  });
  const lease = await leaseRes.json().catch(() => ({}));
  if (!leaseRes.ok || lease.error) throw new Error(`Reddit media lease failed: ${lease.error || JSON.stringify(lease)}`);

  const action = lease.args?.action;
  const fields = lease.args?.fields || [];
  const assetId = lease.asset?.asset_id;
  if (!action || !assetId) throw new Error('Reddit media lease returned unexpected shape');

  const form = new FormData();
  for (const { name, value } of fields) form.append(name, value);
  form.append('file', new Blob([buffer], { type: mimeType }));

  const uploadRes = await fetch(action.startsWith('http') ? action : `https:${action}`, { method: 'POST', body: form });
  if (!uploadRes.ok) throw new Error(`Reddit S3 upload failed (${uploadRes.status})`);

  return {
    assetId,
    url: `https://reddit-uploaded-media.s3-accelerate.amazonaws.com/${assetId}`,
    mimeType,
  };
}

async function publishPost(post, mediaRefs, token, _conn) {
  // Reddit posts go to a specific subreddit, taken from target_group on the post.
  const subreddit = post.target_group?.groupName || post.target_group?.group_id;
  if (!subreddit) throw new Error('Reddit posts require a target subreddit (post.target_group)');

  const title = (post.metadata?.title || post.content || '').slice(0, 300);
  const params = {
    sr:      subreddit,
    title,
    api_type: 'json',
    sendreplies: 'true',
  };

  if (mediaRefs.length === 1) {
    const m = mediaRefs[0];
    if (m.mimeType?.startsWith('video/')) {
      params.kind = 'video';
      params.url  = m.url;
      params.video_poster_url = m.url; // Reddit requires a poster; reuse the upload URL as a placeholder
    } else {
      params.kind = 'image';
      params.url  = m.url;
    }
  } else if (mediaRefs.length > 1) {
    params.kind = 'self';
    params.text = `${post.content || ''}\n\n${mediaRefs.map((m) => m.url).join('\n')}`;
  } else {
    params.kind = 'self';
    params.text = post.content || '';
  }

  const res = await fetch(`${API_BASE}/api/submit`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent':   USER_AGENT,
    },
    body: new URLSearchParams(params).toString(),
  });
  const data = await res.json().catch(() => ({}));
  const errors = data.json?.errors;
  if (!res.ok || (Array.isArray(errors) && errors.length > 0)) {
    throw new Error(`Reddit publish failed: ${JSON.stringify(errors || data)}`);
  }
  return { id: data.json?.data?.id, url: data.json?.data?.url, raw: data };
}

module.exports = {
  getAuthUrl,
  exchangeCode,
  refreshToken,
  getProfile,
  getSubreddits,
  uploadMedia,
  publishPost,
};
