const ffmpeg = require('fluent-ffmpeg');
const fs     = require('fs');
const os     = require('os');
const path   = require('path');
const crypto = require('crypto');

const PLATFORM_VIDEO_LIMITS = {
  linkedin: { maxDurationSec: 600, maxSizeBytes: 5  * 1024 * 1024 * 1024 },
  x:        { maxDurationSec: 140, maxSizeBytes: 512 * 1024 * 1024       },
};

function formatBytes(n) {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)}GB`;
  if (n >= 1024 ** 2) return `${Math.round(n / 1024 ** 2)}MB`;
  return `${Math.round(n / 1024)}KB`;
}

function writeTempFile(buffer, originalName = '') {
  const ext = path.extname(originalName) || '.bin';
  const tmpPath = path.join(os.tmpdir(), `postly_${crypto.randomBytes(6).toString('hex')}${ext}`);
  fs.writeFileSync(tmpPath, buffer);
  return tmpPath;
}

function safeUnlink(p) {
  try { if (p && fs.existsSync(p)) fs.unlinkSync(p); } catch { /* ignore */ }
}

function extractVideoThumbnail(videoPath) {
  const thumbName = `thumb_${crypto.randomBytes(6).toString('hex')}.jpg`;
  const folder    = os.tmpdir();
  const thumbPath = path.join(folder, thumbName);
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .on('end',   () => resolve(thumbPath))
      .on('error', reject)
      .screenshots({ timestamps: ['1'], filename: thumbName, folder, size: '640x?' });
  });
}

function getVideoMetadata(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      const stream = metadata.streams.find((s) => s.codec_type === 'video');
      resolve({
        duration:  metadata.format?.duration ?? 0,
        sizeBytes: metadata.format?.size ? Number(metadata.format.size) : 0,
        bitrate:   metadata.format?.bit_rate ? Number(metadata.format.bit_rate) : 0,
        width:     stream?.width  ?? null,
        height:    stream?.height ?? null,
        codec:     stream?.codec_name ?? null,
      });
    });
  });
}

async function validateVideoForPlatform(videoPath, platform) {
  const limit = PLATFORM_VIDEO_LIMITS[platform];
  if (!limit) throw new Error(`Unknown platform: ${platform}`);
  const meta = await getVideoMetadata(videoPath);
  if (meta.duration > limit.maxDurationSec) {
    throw Object.assign(
      new Error(`Video is ${Math.round(meta.duration)}s — ${platform} allows max ${limit.maxDurationSec}s`),
      { status: 422 },
    );
  }
  if (meta.sizeBytes && meta.sizeBytes > limit.maxSizeBytes) {
    throw Object.assign(
      new Error(`Video is ${formatBytes(meta.sizeBytes)} — ${platform} allows max ${formatBytes(limit.maxSizeBytes)}`),
      { status: 422 },
    );
  }
  return meta;
}

module.exports = {
  extractVideoThumbnail,
  getVideoMetadata,
  validateVideoForPlatform,
  writeTempFile,
  safeUnlink,
  PLATFORM_VIDEO_LIMITS,
};
