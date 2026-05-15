const { encrypt, decrypt } = require('../../middleware/tokenCrypto');

const AUTH_BASE = 'https://www.linkedin.com/oauth/v2';
const API_V2    = 'https://api.linkedin.com/v2';        // legacy — kept for profile/userinfo only
const API_REST  = 'https://api.linkedin.com/rest';      // current REST API for posts + media

// LinkedIn REST API version — format is YYYYMM (6 digits, e.g. 202604 = April 2026).
// LinkedIn supports each version for ~12 months. If you see a 426 NONEXISTENT_VERSION error,
// bump this to the current month (or latest confirmed active version on the LinkedIn changelog).
const LI_VERSION = '202604';

const REST_HEADERS = (token) => ({
  Authorization:               `Bearer ${token}`,
  'Content-Type':              'application/json',
  'LinkedIn-Version':          LI_VERSION,
  'X-Restli-Protocol-Version': '2.0.0',
});

// openid + profile + email = Sign In with LinkedIn (OpenID Connect, required since 2023)
// w_member_social = create/manage posts on behalf of the member
const SCOPES = 'openid profile email w_member_social';

// ── OAuth ────────────────────────────────────────────────────────────────────

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
  return data;
}

async function refreshToken(conn) {
  const db           = require('../../db');
  const creds        = await db.platformCredentials.getDecrypted('linkedin');
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
  const res = await fetch(`${API_V2}/userinfo`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`LinkedIn profile fetch failed: ${JSON.stringify(data)}`);
  return data;
}

// ── Media upload (new REST API) ───────────────────────────────────────────────
// LinkedIn deprecated /v2/assets?action=registerUpload for documents and images.
// Use /rest/documents, /rest/images, and /rest/videos instead.

// Documents (PDFs / carousel files)
async function initializeDocumentUpload(token, ownerId) {
  const res = await fetch(`${API_REST}/documents?action=initializeUpload`, {
    method: 'POST',
    headers: REST_HEADERS(token),
    body: JSON.stringify({
      initializeUploadRequest: { owner: `urn:li:person:${ownerId}` },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`LinkedIn document upload init failed: ${JSON.stringify(data)}`);
  return { uploadUrl: data.value.uploadUrl, documentUrn: data.value.document };
}

// Images
async function initializeImageUpload(token, ownerId) {
  const res = await fetch(`${API_REST}/images?action=initializeUpload`, {
    method: 'POST',
    headers: REST_HEADERS(token),
    body: JSON.stringify({
      initializeUploadRequest: { owner: `urn:li:person:${ownerId}` },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`LinkedIn image upload init failed: ${JSON.stringify(data)}`);
  return { uploadUrl: data.value.uploadUrl, imageUrn: data.value.image };
}

// Videos — requires file size upfront
async function initializeVideoUpload(token, ownerId, fileSizeBytes) {
  const res = await fetch(`${API_REST}/videos?action=initializeUpload`, {
    method: 'POST',
    headers: REST_HEADERS(token),
    body: JSON.stringify({
      initializeUploadRequest: {
        owner:            `urn:li:person:${ownerId}`,
        fileSizeBytes,
        uploadCaptions:   false,
        uploadThumbnail:  false,
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`LinkedIn video upload init failed: ${JSON.stringify(data)}`);
  return { uploadUrl: data.value.uploadInstructions[0]?.uploadUrl, videoUrn: data.value.video };
}

// Binary upload — used by all three init flows (same PUT pattern)
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

// Used by publisher.js — resolves upload by MIME type, returns the media URN.
async function uploadMedia(buffer, mimeType, token, conn) {
  if (!conn?.account_id) throw new Error('LinkedIn account_id missing on connection');
  const ownerId = conn.account_id;

  if (mimeType === 'application/pdf') {
    const { uploadUrl, documentUrn } = await initializeDocumentUpload(token, ownerId);
    await uploadBinary(uploadUrl, buffer);
    return documentUrn;
  }
  if (mimeType.startsWith('video/')) {
    const { uploadUrl, videoUrn } = await initializeVideoUpload(token, ownerId, buffer.length);
    await uploadBinary(uploadUrl, buffer);
    return videoUrn;
  }
  // Default: image
  const { uploadUrl, imageUrn } = await initializeImageUpload(token, ownerId);
  await uploadBinary(uploadUrl, buffer);
  return imageUrn;
}

// ── Post creation (new /rest/posts API) ────────────────────────────────────────
// LinkedIn retired /v2/ugcPosts for new integrations — use /rest/posts instead.
// Response is HTTP 201 with a `location` header; no body.

async function publishPost(post, mediaUrns, token, conn, mediaContext = {}) {
  const ownerUrn  = `urn:li:person:${conn.account_id}`;
  const isDocument = mediaContext.isDocument === true;
  const isVideo    = mediaContext.isVideo    === true;

  const body = {
    author:       ownerUrn,
    commentary:   post.content || '',
    visibility:   'PUBLIC',
    distribution: {
      feedDistribution:              'MAIN_FEED',
      targetEntities:                [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState:            'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };

  if (mediaUrns.length > 0) {
    if (isDocument) {
      body.content = {
        media: { title: mediaContext.title || 'Document', id: mediaUrns[0] },
      };
    } else if (isVideo) {
      body.content = { media: { id: mediaUrns[0] } };
    } else if (mediaUrns.length === 1) {
      body.content = { media: { id: mediaUrns[0] } };
    } else {
      // Multi-image carousel
      body.content = {
        multiImage: {
          images: mediaUrns.map((id) => ({ id, altText: '' })),
        },
      };
    }
  }

  const res = await fetch(`${API_REST}/posts`, {
    method: 'POST',
    headers: REST_HEADERS(token),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(`LinkedIn publish failed: ${data.message || JSON.stringify(data)}`);
  }

  // 201 Created — LinkedIn returns the post URN in the Location header, no body
  const postUrn = res.headers.get('x-linkedin-id') || res.headers.get('location') || '';
  return { id: postUrn };
}

// LinkedIn groups API is deprecated — return empty array
async function getGroups() {
  return [];
}

module.exports = {
  getAuthUrl,
  exchangeCode,
  refreshToken,
  getProfile,
  initializeDocumentUpload,
  initializeImageUpload,
  initializeVideoUpload,
  uploadBinary,
  uploadMedia,
  publishPost,
  getGroups,
};
