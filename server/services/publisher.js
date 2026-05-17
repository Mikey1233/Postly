const db        = require('../db');
const storage   = require('./media/storage');
const imageProc = require('./media/imageProcessor');
const { decrypt }   = require('../middleware/tokenCrypto');

const linkedin = require('./platforms/linkedin');
const twitter  = require('./platforms/twitter');
const gmail    = require('./platforms/gmail');

const publishers = { linkedin, x: twitter, gmail };

// Auto-derive a subject from the first non-empty line if the user didn't set one.
function autoSubject(content) {
  const firstLine = (content || '').split('\n').map((l) => l.trim()).find(Boolean) || '(no subject)';
  return firstLine.slice(0, 120);
}

async function publishGmail(post, conn, token) {
  const meta = post.metadata?.gmail || {};
  const recipientIds = Array.isArray(meta.recipientIds) ? meta.recipientIds : [];
  if (!recipientIds.length) {
    throw new Error('No recipients selected for this Gmail post');
  }
  const recipients = await db.emailRecipients.getByIds(recipientIds);
  if (!recipients.length) throw new Error('Selected recipients no longer exist');

  const subject = (meta.subject?.trim()) || autoSubject(post.content);
  const body    = post.content || '';
  const fromEmail = conn.account_name;

  const sent = [];
  const failed = [];
  for (const r of recipients) {
    try {
      const result = await gmail.sendOne({
        to: r.email, subject, body, fromEmail, fromName: null,
      }, token);
      sent.push({ recipientId: r.id, email: r.email, messageId: result.id });
    } catch (err) {
      failed.push({ recipientId: r.id, email: r.email, error: err.message });
    }
  }
  if (!sent.length) throw new Error(`All ${recipients.length} sends failed`);
  return { id: sent.map((s) => s.messageId).join(','), sent, failed, subject };
}

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
  if (!publishers[platform]) {
    throw new Error(`${platform} publishing is not supported — use AI generation only and post manually`);
  }
  const conn = await db.platformConnections.getByPlatform(platform);
  if (!conn) throw new Error(`${platform} not connected`);
  const { token, conn: liveConn } = await getActiveToken(platform, conn);
  if (platform === 'gmail') return publishGmail(post, liveConn, token);
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
