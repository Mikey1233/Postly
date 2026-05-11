import { create } from 'zustand'
import type { Platform } from '../lib/platformLimits'

export type PostType = 'post' | 'carousel'

export interface MediaAsset {
  id: string
  storagePath: string
  thumbnailPath: string | null
  type: 'image' | 'video' | 'gif'
  sortOrder: number
}

export interface Draft {
  id: string | null
  content: string
  platforms: Platform[]
  postType: PostType
  scheduledAt: string | null
  mediaAssets: MediaAsset[]
  carouselId: string | null
  pillarId: string | null
}

export interface VoiceProfile {
  platform: Platform
  tone: string[]
  hookStyle: string
  sentenceLength: string
  structure: string
  emojiUsage: string
  ctaStyle: string
  signaturePhrases: string[]
  systemPrompt: string
}

interface AppState {
  draft: Draft
  platformStatuses: Partial<Record<Platform, 'connected' | 'disconnected' | 'expiring'>>
  selectedModel: string
  voiceProfiles: Partial<Record<Platform, VoiceProfile>>
  darkMode: boolean

  setDraft: (patch: Partial<Draft>) => void
  resetDraft: () => void
  setPlatformStatuses: (
    statuses: Partial<Record<Platform, 'connected' | 'disconnected' | 'expiring'>>,
  ) => void
  setSelectedModel: (model: string) => void
  setVoiceProfile: (platform: Platform, profile: VoiceProfile) => void
  toggleDarkMode: () => void
}

const DEFAULT_DRAFT: Draft = {
  id: null,
  content: '',
  platforms: [],
  postType: 'post',
  scheduledAt: null,
  mediaAssets: [],
  carouselId: null,
  pillarId: null,
}

const useAppStore = create<AppState>((set) => ({
  draft: { ...DEFAULT_DRAFT },
  platformStatuses: {},
  selectedModel: 'anthropic/claude-sonnet-4-5',
  voiceProfiles: {},
  darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,

  setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  resetDraft: () => set({ draft: { ...DEFAULT_DRAFT } }),
  setPlatformStatuses: (statuses) => set({ platformStatuses: statuses }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setVoiceProfile: (platform, profile) =>
    set((s) => ({ voiceProfiles: { ...s.voiceProfiles, [platform]: profile } })),
  toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
}))

export default useAppStore
