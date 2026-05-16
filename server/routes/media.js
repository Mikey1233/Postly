const router    = require('express').Router();
const multer    = require('multer');
const fs        = require('fs');
const db        = require('../db');
const storage   = require('../services/media/storage');
const limits    = require('../config/platformLimits');
const imageProc = require('../services/media/imageProcessor');
const videoProc = require('../services/media/videoProcessor');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB max (LinkedIn limit)
});

function validatePlatformLimits(file, platforms) {
  for (const platform of platforms) {
    const lim = limits[platform];
    if (!lim) continue;
    if (file.mimetype.startsWith('image/') && !lim.acceptedImageTypes.includes(file.mimetype)) {
      throw Object.assign(new Error(`${platform} does not accept ${file.mimetype} images`), { status: 422 });
    }
    if (file.mimetype.startsWith('video/') && !lim.acceptedVideoTypes.includes(file.mimetype)) {
      throw Object.assign(new Error(`${platform} does not accept ${file.mimetype} videos`), { status: 422 });
    }
    if (file.mimetype.startsWith('video/') && file.size > lim.maxVideoSizeBytes) {
      throw Object.assign(new Error(`File exceeds ${platform} video size limit`), { status: 422 });
    }
  }
}

function detectType(mimeType) {
  if (mimeType === 'image/gif') return 'gif';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  throw Object.assign(new Error(`Unsupported file type: ${mimeType}`), { status: 422 });
}

// POST /api/media/upload
router.post('/upload', upload.single('file'), async (req, res, next) => {
  let tmpVideoPath = null;
  let tmpThumbPath = null;
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { post_id, sort_order = 0, platforms: rawPlatforms } = req.body;
    const platforms = rawPlatforms ? JSON.parse(rawPlatforms) : [];

    validatePlatformLimits(req.file, platforms);

    const fileType = detectType(req.file.mimetype);
    const filename = req.file.originalname;
    const folder   = post_id ? `posts/${post_id}` : 'library';

    let processedBuffer = req.file.buffer;
    let thumbnailPath   = null;
    let dimensions      = null;
    let durationSeconds = null;
    let mimeType        = req.file.mimetype;

    if (fileType === 'image' || fileType === 'gif') {
      // Normalize HEIC → JPEG; pass-through otherwise
      processedBuffer = await imageProc.normalizeImageFormat(req.file.buffer, req.file.mimetype);
      if (mimeType === 'image/heic' || mimeType === 'image/heif') mimeType = 'image/jpeg';

      // Thumbnail (skip for animated GIFs — would lose animation)
      if (fileType !== 'gif') {
        const thumb = await imageProc.generateThumbnail(processedBuffer);
        const thumbKey = `${folder}/thumbnails/${Date.now()}-${filename}.jpg`;
        thumbnailPath = await storage.upload(storage.MEDIA_BUCKET, thumbKey, thumb, 'image/jpeg');
      }

      try {
        dimensions = await imageProc.getImageDimensions(processedBuffer);
      } catch { /* dimensions optional */ }
    }

    if (fileType === 'video') {
      tmpVideoPath = videoProc.writeTempFile(req.file.buffer, filename);

      const meta = await videoProc.getVideoMetadata(tmpVideoPath);
      dimensions      = meta.width && meta.height ? { width: meta.width, height: meta.height } : null;
      durationSeconds = meta.duration || null;

      // Validate against any platforms the user has targeted
      for (const platform of platforms) {
        if (videoProc.PLATFORM_VIDEO_LIMITS[platform]) {
          await videoProc.validateVideoForPlatform(tmpVideoPath, platform);
        }
      }

      try {
        tmpThumbPath = await videoProc.extractVideoThumbnail(tmpVideoPath);
        const thumbBuf = fs.readFileSync(tmpThumbPath);
        const thumbKey = `${folder}/thumbnails/${Date.now()}-${filename}.jpg`;
        thumbnailPath = await storage.upload(storage.MEDIA_BUCKET, thumbKey, thumbBuf, 'image/jpeg');
      } catch (err) {
        console.warn('[media] video thumbnail extraction failed:', err.message);
      }
    }

    const storageKey  = `${folder}/${Date.now()}-${filename}`;
    const storagePath = await storage.upload(storage.MEDIA_BUCKET, storageKey, processedBuffer, mimeType);

    const asset = await db.media.create({
      post_id:          post_id || null,
      type:             fileType,
      filename,
      storage_path:     storagePath,
      mime_type:        mimeType,
      size_bytes:       processedBuffer.length,
      dimensions:       dimensions || null,
      duration_seconds: durationSeconds,
      thumbnail_path:   thumbnailPath,
      sort_order:       Number(sort_order),
    });

    res.status(201).json(asset);
  } catch (err) {
    next(err);
  } finally {
    videoProc.safeUnlink(tmpVideoPath);
    videoProc.safeUnlink(tmpThumbPath);
  }
});

// DELETE /api/media/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const asset = await db.media.getById(req.params.id);
    await storage.remove(storage.MEDIA_BUCKET, asset.storage_path);
    if (asset.thumbnail_path) await storage.remove(storage.MEDIA_BUCKET, asset.thumbnail_path);
    await db.media.remove(req.params.id);
    res.json({ deleted: req.params.id });
  } catch (err) { next(err); }
});

// GET /api/media/post/:postId
router.get('/post/:postId', async (req, res, next) => {
  try {
    const assets = await db.media.getForPost(req.params.postId);
    res.json(assets);
  } catch (err) { next(err); }
});

// GET /api/media/library?page=1&limit=20
router.get('/library', async (req, res, next) => {
  try {
    const limit  = Math.min(Number(req.query.limit) || 20, 100);
    const offset = (Number(req.query.page || 1) - 1) * limit;
    const assets = await db.media.getLibrary(limit, offset);
    res.json(assets);
  } catch (err) { next(err); }
});

// POST /api/media/:id/alt-text  — wired to AI in Stage 4
router.post('/:id/alt-text', async (req, res, next) => {
  try {
    const { altText } = req.body;
    if (!altText) return res.status(400).json({ error: 'altText is required' });
    const asset = await db.media.updateAltText(req.params.id, altText);
    res.json(asset);
  } catch (err) { next(err); }
});

module.exports = router;
