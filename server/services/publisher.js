const db        = require('../db');
const storage   = require('./media/storage');
const imageProc = require('./media/imageProcessor');
const { decrypt }   = require('../middleware/tokenCrypto');

const linkedin = require('./platforms/linkedin');
const twitter  = require('./platforms/twitter');
const facebook = require('./platforms/facebook');
const reddit   = require('./platforms/reddit');

const publishers = { linkedin, x: twitter, facebook, reddit };

// Resolve a usable token for a platform connection, refreshing if it's near expiry.
async function getActiveToken(platform, conn) {
  const bufferMs  = 5 * 60 * 1000;
  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : null;
  if (expiresAt && expiresAt - Date.now() < bufferMs) {
    const svc = publishers[platform];
    if (svc?.refreshToken) {
      const refreshed = await svc.refreshToken(conn);
      return { token: decrypt(refreshed.access_token), conn: refreshed };
    }
  }
  return { token: decrypt(conn.access_token), conn };
}

async function publishRegularPost(post, platform, conn, token, mediaAssets) {
  const sorted = [...mediaAssets].sort((a, b) => a.sort_order - b.sort_order);
  const platformMediaIds = [];
  const svc = publishers[platform];

  for (const asset of sorted) {
    const originalBuffer = await storage.download(storage.MEDIA_BUCKET, asset.storage_path);
    const buffer = asset.type === 'image'
      ? await imageProc.processImageForPlatform(originalBuffer, platform)
      : originalBuffer;
    const mimeType = asset.type === 'image' ? 'image/jpeg' : (asset.mime_type || 'application/octet-stream');
    const mediaId = await svc.uploadMedia(buffer, mimeType, token, conn);
    platformMediaIds.push(mediaId);
  }

  return svc.publishPost(post, platformMediaIds, token, conn);
}

async function publishToPlatform(post, platform, mediaAssets) {
  const conn = await db.platformConnections.getByPlatform(platform);
  if (!conn) throw new Error(`${platform} not connected`);
  const { token, conn: liveConn } = await getActiveToken(platform, conn);
  return publishRegularPost(post, platform, liveConn, token, mediaAssets);
}

async function publishPost(post) {
  const fullPost   = post.media_assets ? post : await db.posts.getById(post.id);
  const mediaAssets = fullPost.media_assets || [];
  const targets    = Array.isArray(fullPost.platform) ? fullPost.platform : [];
  const results    = {};

  for (const platform of targets) {
    try {
      const result = await publishToPlatform(fullPost, platform, mediaAssets);
      results[platform] = { success: true, ...result };
      await db.publishLogs.record(fullPost.id, platform, 'success', result);
    } catch (err) {
      console.error(`[publisher] ${platform} failed for post ${fullPost.id}:`, err.message);
      results[platform] = { error: err.message };
      await db.publishLogs.record(fullPost.id, platform, 'failed', err.message);
    }
  }

  const outcomes = Object.values(results);
  const anyFailed = outcomes.some((r) => r.error);
  const allFailed = outcomes.every((r) => r.error);
  const status = !targets.length ? fullPost.status
                : allFailed ? 'failed'
                : anyFailed ? 'partial'
                : 'published';

  await db.posts.update(fullPost.id, {
    status,
    published_at: status === 'published' || status === 'partial' ? new Date().toISOString() : null,
    platform_post_ids: results,
  });

  return { status, results };
}

module.exports = { publishPost };
