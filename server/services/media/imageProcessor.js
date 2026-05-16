const sharp = require('sharp');

const PLATFORM_IMAGE_SPECS = {
  linkedin: { maxWidth: 1200, maxHeight: 1200, quality: 90 },
  x:        { maxWidth: 4096, maxHeight: 4096, quality: 85 },
};

async function processImageForPlatform(inputBuffer, platform) {
  const spec = PLATFORM_IMAGE_SPECS[platform];
  if (!spec) throw new Error(`Unknown platform: ${platform}`);
  return sharp(inputBuffer)
    .rotate()
    .resize(spec.maxWidth, spec.maxHeight, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: spec.quality })
    .toBuffer();
}

async function generateThumbnail(inputBuffer) {
  return sharp(inputBuffer)
    .rotate()
    .resize(400, 400, { fit: 'cover' })
    .jpeg({ quality: 70 })
    .toBuffer();
}

// HEIC/HEIF → JPEG. Requires Sharp built with libheif; falls through if unavailable.
async function normalizeImageFormat(inputBuffer, mimeType) {
  if (mimeType === 'image/heic' || mimeType === 'image/heif') {
    try {
      return await sharp(inputBuffer).rotate().jpeg({ quality: 90 }).toBuffer();
    } catch (err) {
      throw Object.assign(new Error('HEIC images are not supported by this Sharp build — convert to JPEG before uploading'), { status: 422, cause: err });
    }
  }
  return inputBuffer;
}

async function getImageDimensions(buffer) {
  const meta = await sharp(buffer).metadata();
  return { width: meta.width, height: meta.height };
}

module.exports = { processImageForPlatform, generateThumbnail, normalizeImageFormat, getImageDimensions, PLATFORM_IMAGE_SPECS };
