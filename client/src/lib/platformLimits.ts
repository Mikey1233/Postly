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
