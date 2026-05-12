module.exports = {
  linkedin: {
    maxImages: 9,
    maxVideoSizeBytes: 5 * 1024 * 1024 * 1024,
    maxVideoDurationSec: 600,
    acceptedImageTypes: ['image/jpeg', 'image/png', 'image/gif'],
    acceptedVideoTypes: ['video/mp4'],
  },
  x: {
    maxImages: 4,
    maxVideoSizeBytes: 512 * 1024 * 1024,
    maxVideoDurationSec: 140,
    acceptedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    acceptedVideoTypes: ['video/mp4', 'video/mov'],
  },
  facebook: {
    maxImages: 10,
    maxVideoSizeBytes: 10 * 1024 * 1024 * 1024,
    maxVideoDurationSec: 14400,
    acceptedImageTypes: ['image/jpeg', 'image/png', 'image/gif'],
    acceptedVideoTypes: ['video/mp4', 'video/mov'],
  },
  reddit: {
    maxImages: 20,
    maxVideoSizeBytes: 1024 * 1024 * 1024,
    acceptedImageTypes: ['image/jpeg', 'image/png', 'image/gif'],
    acceptedVideoTypes: ['video/mp4'],
  },
};
