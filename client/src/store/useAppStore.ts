import { create } from 'zustand'
import type { Platform } from '../lib/platformLimits'

export interface MediaAsset {
  id: string
  type: 'image' | 'video' | 'gif'
  filename: string
  storagePath: string
  thumbnailPath: string | null
  mimeType: string
  sizeBytes: number
  altText: string | null
  sortOrder: number
}

export interface ContentPillar {
  id: string
  name: string
  color: string
  postCount: number
}

export interface EmailRecipient {
  id: string
  name: string
  email: string
  groupTag: string | null
  notes: string | null
}

export type Tone =
  | 'default' | 'motivational' | 'educational' | 'sales' | 'inspirational'
  | 'storytelling' | 'humorous' | 'controversial' | 'thought-leadership'

export interface VoiceProfile {
  id: string
  name: string
  platform: Platform
  systemPrompt: string
  analysis: Record<string, unknown>
  isDefault: boolean
}

interface CurrentPost {
  id: string | null
  content: string
  // The story / intent behind the post — what's on the user's mind, why they're
  // writing it. Threaded into every AI call (compose, edit, hooks, score, …)
  // so suggestions are grounded in the writer's actual goal.
  context: string
  platforms: Platform[]
  voice: string | null   // voice profile id
  tone: Tone
  mediaAssets: MediaAsset[]
  postType: 'text' | 'image' | 'video'
  pillarId: string | null
  scheduledAt: string | null
  targetGroup: { platform: Platform; groupId: string; groupName: string } | null
  // Gmail-specific — only meaningful when 'gmail' is in platforms.
  // emailSubject is null when the user hasn't overridden it; the composer
  // falls back to the first line of `content` at send time.
  recipientIds: string[]
  emailSubject: string | null
}

interface AuthState {
  checked: boolean        // have verify + setup-status both resolved?
  authenticated: boolean  // is the session currently valid?
  setupDone: boolean      // has a password been configured (via /signup or AUTH_PASSWORD_HASH)?
}

interface AppState {
  auth: AuthState
  currentPost: CurrentPost
  voiceProfiles: VoiceProfile[]
  platformConnections: Partial<Record<Platform, { configured: boolean; connected: boolean; state?: string; accountName?: string; expiresAt?: string }>>
  selectedModel: string
  contentPillars: ContentPillar[]
  emailRecipients: EmailRecipient[]
  darkMode: boolean
  isAILoading: boolean
  autocompleteText: string
  postScore: { hookStrength: number; clarity: number; structure: number; predictedEngagement: number; suggestions: string[] } | null

  profileName: string | null
  profileEmail: string | null
  setAuth: (patch: Partial<AuthState>) => void
  setProfileName: (name: string | null) => void
  setProfileEmail: (email: string | null) => void
  setPostContent: (content: string) => void
  togglePlatform: (platform: Platform) => void
  addMediaAsset: (asset: MediaAsset) => void
  removeMediaAsset: (id: string) => void
  reorderMediaAssets: (assets: MediaAsset[]) => void
  setCurrentPost: (patch: Partial<CurrentPost>) => void
  resetComposer: () => void

  setPlatformConnections: (connections: AppState['platformConnections']) => void
  setVoiceProfiles: (profiles: VoiceProfile[]) => void
  upsertVoiceProfile: (profile: VoiceProfile) => void
  removeVoiceProfile: (id: string) => void
  setSelectedModel: (model: string) => void
  setContentPillars: (pillars: ContentPillar[]) => void
  setEmailRecipients: (recipients: EmailRecipient[]) => void
  upsertEmailRecipient: (recipient: EmailRecipient) => void
  removeEmailRecipient: (id: string) => void
  setAILoading: (loading: boolean) => void
  setAutocompleteText: (text: string) => void
  setPostScore: (score: AppState['postScore']) => void
  toggleDarkMode: () => void
}

const DEFAULT_POST: CurrentPost = {
  id: null, content: '', context: '', platforms: ['linkedin'], voice: null, tone: 'default',
  mediaAssets: [], postType: 'text', pillarId: null, scheduledAt: null, targetGroup: null,
  recipientIds: [], emailSubject: null,
}

const useAppStore = create<AppState>((set) => ({
  auth: { checked: false, authenticated: false, setupDone: false },
  profileName: null,
  profileEmail: null,
  currentPost: { ...DEFAULT_POST },
  voiceProfiles: [],
  platformConnections: {},
  selectedModel: 'anthropic/claude-sonnet-4-5',
  contentPillars: [],
  emailRecipients: [],
  // Read synchronously so the very first render already has the right value — no flash.
  darkMode: (() => {
    try {
      const v = localStorage.getItem('postly-dark-mode')
      if (v === 'true')  return true
      if (v === 'false') return false
    } catch { /* blocked storage */ }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })(),
  isAILoading: false,
  autocompleteText: '',
  postScore: null,

  setPostContent: (content) => set((s) => ({ currentPost: { ...s.currentPost, content } })),
  togglePlatform: (platform) => set((s) => ({
    currentPost: {
      ...s.currentPost,
      platforms: s.currentPost.platforms.includes(platform)
        ? s.currentPost.platforms.filter((p) => p !== platform)
        : [...s.currentPost.platforms, platform],
    },
  })),
  addMediaAsset: (asset) => set((s) => ({ currentPost: { ...s.currentPost, mediaAssets: [...s.currentPost.mediaAssets, asset] } })),
  removeMediaAsset: (id) => set((s) => ({ currentPost: { ...s.currentPost, mediaAssets: s.currentPost.mediaAssets.filter((a) => a.id !== id) } })),
  reorderMediaAssets: (assets) => set((s) => ({ currentPost: { ...s.currentPost, mediaAssets: assets } })),
  setCurrentPost: (patch) => set((s) => ({ currentPost: { ...s.currentPost, ...patch } })),
  resetComposer: () => set({ currentPost: { ...DEFAULT_POST }, postScore: null, autocompleteText: '' }),

  setAuth: (patch) => set((s) => ({ auth: { ...s.auth, checked: true, ...patch } })),
  setProfileName:  (name)  => set({ profileName: name }),
  setProfileEmail: (email) => set({ profileEmail: email }),
  setPlatformConnections: (connections) => set({ platformConnections: connections }),
  setVoiceProfiles: (profiles) => set({ voiceProfiles: profiles }),
  upsertVoiceProfile: (profile) => set((s) => {
    const idx = s.voiceProfiles.findIndex((v) => v.id === profile.id)
    const next = idx === -1 ? [...s.voiceProfiles, profile] : s.voiceProfiles.map((v) => v.id === profile.id ? profile : v)
    return { voiceProfiles: next }
  }),
  removeVoiceProfile: (id) => set((s) => ({ voiceProfiles: s.voiceProfiles.filter((v) => v.id !== id) })),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setContentPillars: (pillars) => set({ contentPillars: pillars }),
  setEmailRecipients: (recipients) => set({ emailRecipients: recipients }),
  upsertEmailRecipient: (recipient) => set((s) => {
    const idx = s.emailRecipients.findIndex((r) => r.id === recipient.id)
    const next = idx === -1 ? [...s.emailRecipients, recipient] : s.emailRecipients.map((r) => r.id === recipient.id ? recipient : r)
    return { emailRecipients: next.sort((a, b) => a.name.localeCompare(b.name)) }
  }),
  removeEmailRecipient: (id) => set((s) => ({ emailRecipients: s.emailRecipients.filter((r) => r.id !== id) })),
  setAILoading: (loading) => set({ isAILoading: loading }),
  setAutocompleteText: (text) => set({ autocompleteText: text }),
  setPostScore: (score) => set({ postScore: score }),
  toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
}))

export default useAppStore
