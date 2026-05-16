// Server-side platform limits — used by media upload validation and publishing.
// Only includes platforms we actually publish to (LinkedIn + X). Facebook and
// Reddit remain as AI generation targets only — see client/src/lib/platformLimits.ts
// for the full set used by the composer for AI hints and char counts.
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
};
