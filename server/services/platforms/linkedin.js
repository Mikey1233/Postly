const { encrypt, decrypt } = require('../../middleware/tokenCrypto');

const AUTH_BASE = 'https://www.linkedin.com/oauth/v2';
const API_BASE  = 'https://api.linkedin.com/v2';
// openid + profile + email = Sign In with LinkedIn (OpenID Connect, required since 2023)
// w_member_social = create posts on behalf of the member
const SCOPES = 'openid profile email w_member_social';

// creds = { clientId, clientSecret, redirectUri }
function getAuthUrl(state, creds) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     creds.clientId,
    redirect_uri:  creds.redirectUri,
    state,
    scope:         SCOPES,
  });
  return `${AUTH_BASE}/authorization?${params}`;
}

async function exchangeCode(code, creds) {
  const params = new URLSearchParams({
    grant_type:    'authorization_code',
    code,
    redirect_uri:  creds.redirectUri,
    client_id:     creds.clientId,
    client_secret: creds.clientSecret,
  });
  const res = await fetch(`${AUTH_BASE}/accessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`LinkedIn token exchange failed: ${data.error_description || JSON.stringify(data)}`);
  return data; // { access_token, refresh_token, expires_in }
}

async function refreshToken(conn) {
  const db    = require('../../db');
  const creds = await db.platformCredentials.getDecrypted('linkedin');
  const currentRefresh = decrypt(conn.refresh_token);

  const params = new URLSearchParams({
    grant_type:    'refresh_token',
    refresh_token: currentRefresh,
    client_id:     creds.clientId,
    client_secret: creds.clientSecret,
  });
  const res = await fetch(`${AUTH_BASE}/accessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`LinkedIn token refresh failed: ${data.error_description || JSON.stringify(data)}`);

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  return db.platformConnections.upsert('linkedin', {
    access_token:     encrypt(data.access_token),
    refresh_token:    data.refresh_token ? encrypt(data.refresh_token) : conn.refresh_token,
    token_expires_at: expiresAt,
  });
}

async function getProfile(token) {
  // OpenID Connect userinfo — replaces the deprecated /v2/me endpoint.
  // Returns { sub, name, given_name, family_name, email, picture }
  // `sub` is the member's LinkedIn ID used in URNs (urn:li:person:{sub}).
  const res = await fetch(`${API_BASE}/userinfo`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`LinkedIn profile fetch failed: ${JSON.stringify(data)}`);
  return data;
}

// Step 1: Register upload — returns { uploadUrl, assetUrn }
async function registerUpload(token, ownerId, recipe = 'urn:li:digitalmediaRecipe:feedshare-image') {
  const body = {
    registerUploadRequest: {
      owner: `urn:li:person:${ownerId}`,
      recipes: [recipe],
      serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }],
    },
  };
  const res = await fetch(`${API_BASE}/assets?action=registerUpload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`LinkedIn register upload failed: ${JSON.stringify(data)}`);
  const mechanism = data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'];
  return { uploadUrl: mechanism.uploadUrl, assetUrn: data.value.asset };
}

// Step 2: PUT binary to the uploadUrl
async function uploadBinary(uploadUrl, buffer) {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: buffer,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LinkedIn binary upload failed (${res.status}): ${text}`);
  }
}

// LinkedIn groups API is deprecated — return empty array
async function getGroups() {
  return [];
}

// ── Publisher contract ───────────────────────────────────────────────────────

const RECIPES = {
  image:    'urn:li:digitalmediaRecipe:feedshare-image',
  video:    'urn:li:digitalmediaRecipe:feedshare-video',
  gif:      'urn:li:digitalmediaRecipe:feedshare-image',
  document: 'urn:li:digitalmediaRecipe:feedshare-document',
};

function recipeFor(mediaType) {
  return RECIPES[mediaType] || RECIPES.image;
}

// Used by publisher: returns the LinkedIn asset URN for a single media buffer.
async function uploadMedia(buffer, mimeType, token, conn) {
  if (!conn?.account_id) throw new Error('LinkedIn account_id missing on connection');
  const mediaType = mimeType.startsWith('video/') ? 'video'
                  : mimeType === 'application/pdf' ? 'document'
                  : 'image';
  const { uploadUrl, assetUrn } = await registerUpload(token, conn.account_id, recipeFor(mediaType));
  await uploadBinary(uploadUrl, buffer);
  return assetUrn;
}

// Used by publisher: posts the ugcPost with the supplied asset URNs.
// `mediaContext` lets the caller force shareMediaCategory (e.g. 'DOCUMENT' for carousels).
async function publishPost(post, mediaUrns, token, conn, mediaContext = {}) {
  const ownerUrn = `urn:li:person:${conn.account_id}`;

  const isDocument = mediaContext.isDocument === true;
  const isVideo    = mediaContext.isVideo === true;
  const shareMediaCategory = isDocument ? 'DOCUMENT'
                           : isVideo    ? 'VIDEO'
                           : mediaUrns.length > 0 ? 'IMAGE'
                           : 'NONE';

  const media = mediaUrns.map((urn) => ({
    status: 'READY',
    media:  urn,
    ...(isDocument && { title: { text: mediaContext.title || 'Document' } }),
  }));

  const body = {
    author:         ownerUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: post.content || '' },
        shareMediaCategory,
        ...(media.length > 0 && { media }),
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };

  const res = await fetch(`${API_BASE}/ugcPosts`, {
    method: 'POST',
    headers: {
      Authorization:               `Bearer ${token}`,
      'Content-Type':              'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`LinkedIn publish failed: ${data.message || JSON.stringify(data)}`);
  return { id: data.id, raw: data };
}

module.exports = {
  getAuthUrl,
  exchangeCode,
  refreshToken,
  getProfile,
  registerUpload,
  uploadBinary,
  uploadMedia,
  publishPost,
  getGroups,
};
