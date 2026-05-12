export type Platform = 'linkedin' | 'facebook' | 'x' | 'reddit'

export interface PlatformLimit {
  characters: number | null
  maxImages: number
  maxVideoSizeBytes: number
  maxVideoDurationSeconds: number
  supportsCarousel: boolean
  supportsGroups: boolean
}

export const PLATFORM_LIMITS: Record<Platform, PlatformLimit> = {
  linkedin: {
    characters: 3000,
    maxImages: 9,
    maxVideoSizeBytes: 5 * 1024 * 1024 * 1024,
    maxVideoDurationSeconds: 600,
    supportsCarousel: true,
    supportsGroups: false,
  },
  facebook: {
    characters: 63206,
    maxImages: 10,
    maxVideoSizeBytes: 10 * 1024 * 1024 * 1024,
    maxVideoDurationSeconds: 14400,
    supportsCarousel: true,
    supportsGroups: true,
  },
  x: {
    characters: 280,
    maxImages: 4,
    maxVideoSizeBytes: 512 * 1024 * 1024,
    maxVideoDurationSeconds: 140,
    supportsCarousel: false,
    supportsGroups: false,
  },
  reddit: {
    characters: null,
    maxImages: 20,
    maxVideoSizeBytes: 1024 * 1024 * 1024,
    maxVideoDurationSeconds: 900,
    supportsCarousel: false,
    supportsGroups: true,
  },
}

export function getLimit<K extends keyof PlatformLimit>(
  platform: Platform,
  key: K,
): PlatformLimit[K] | null {
  return PLATFORM_LIMITS[platform]?.[key] ?? null
}

export function validateMediaForPlatforms(
  files: { size: number; type: string }[],
  platforms: Platform[],
): string[] {
  const warnings: string[] = []
  for (const platform of platforms) {
    const lim = PLATFORM_LIMITS[platform]
    const images = files.filter((f) => f.type.startsWith('image/'))
    const videos = files.filter((f) => f.type.startsWith('video/'))
    if (images.length > lim.maxImages) {
      warnings.push(`${platform}: max ${lim.maxImages} images (you have ${images.length})`)
    }
    for (const v of videos) {
      if (v.size > lim.maxVideoSizeBytes) {
        warnings.push(`${platform}: video exceeds ${Math.round(lim.maxVideoSizeBytes / 1024 / 1024)}MB limit`)
      }
    }
  }
  return warnings
}

export const PLATFORM_COLORS: Record<Platform, string> = {
  linkedin: '#0A66C2',
  x: '#000000',
  facebook: '#1877F2',
  reddit: '#FF4500',
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  linkedin: 'LinkedIn',
  x: 'X',
  facebook: 'Facebook',
  reddit: 'Reddit',
}
