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

export interface SlideData {
  order: number
  type: 'cover' | 'content' | 'stat' | 'quote' | 'cta' | 'image'
  headline?: string
  subtext?: string
  body?: string
  bulletPoints?: string[]
  statNumber?: string
  statLabel?: string
  quote?: string
  attribution?: string
  imageStoragePath?: string
}

export interface CarouselTheme {
  primaryColor: string
  backgroundColor: string
  textColor: string
  font: string
  logoStoragePath: string | null
  brandName: string
}

export interface ContentPillar {
  id: string
  name: string
  color: string
  postCount: number
}

interface CurrentPost {
  id: string | null
  content: string
  platforms: Platform[]
  mediaAssets: MediaAsset[]
  carouselId: string | null
  postType: 'text' | 'image' | 'video' | 'carousel'
  pillarId: string | null
  scheduledAt: string | null
  targetGroup: { platform: Platform; groupId: string; groupName: string } | null
}

interface CarouselEditor {
  id: string | null
  title: string
  slides: SlideData[]
  theme: CarouselTheme
  activeSlideIndex: number
  isDirty: boolean
}

interface AuthState {
  checked: boolean        // have verify + setup-status both resolved?
  authenticated: boolean  // is the session currently valid?
  setupDone: boolean      // has a password been configured (via /signup or AUTH_PASSWORD_HASH)?
}

interface AppState {
  auth: AuthState
  currentPost: CurrentPost
  carouselEditor: CarouselEditor
  voiceProfiles: Partial<Record<Platform, { systemPrompt: string; analysis: Record<string, unknown> }>>
  platformConnections: Partial<Record<Platform, { configured: boolean; connected: boolean; state?: string; accountName?: string; expiresAt?: string }>>
  selectedModel: string
  contentPillars: ContentPillar[]
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

  setActiveSlide: (index: number) => void
  updateSlide: (index: number, data: Partial<SlideData>) => void
  addSlide: (slide: SlideData) => void
  removeSlide: (index: number) => void
  setSlides: (slides: SlideData[]) => void
  updateCarouselTheme: (theme: Partial<CarouselTheme>) => void
  setCarouselEditor: (patch: Partial<CarouselEditor>) => void

  setPlatformConnections: (connections: AppState['platformConnections']) => void
  setVoiceProfile: (platform: Platform, profile: AppState['voiceProfiles'][Platform]) => void
  setSelectedModel: (model: string) => void
  setContentPillars: (pillars: ContentPillar[]) => void
  setAILoading: (loading: boolean) => void
  setAutocompleteText: (text: string) => void
  setPostScore: (score: AppState['postScore']) => void
  toggleDarkMode: () => void
}

const DEFAULT_POST: CurrentPost = {
  id: null, content: '', platforms: ['linkedin'], mediaAssets: [],
  carouselId: null, postType: 'text', pillarId: null, scheduledAt: null, targetGroup: null,
}

const DEFAULT_THEME: CarouselTheme = {
  primaryColor: '#0A66C2', backgroundColor: '#FFFFFF', textColor: '#1A1A1A',
  font: 'Helvetica', logoStoragePath: null, brandName: '',
}

const DEFAULT_CAROUSEL: CarouselEditor = {
  id: null, title: '', slides: [], theme: DEFAULT_THEME, activeSlideIndex: 0, isDirty: false,
}

const useAppStore = create<AppState>((set) => ({
  auth: { checked: false, authenticated: false, setupDone: false },
  profileName: null,
  profileEmail: null,
  currentPost: { ...DEFAULT_POST },
  carouselEditor: { ...DEFAULT_CAROUSEL },
  voiceProfiles: {},
  platformConnections: {},
  selectedModel: 'anthropic/claude-sonnet-4-5',
  contentPillars: [],
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

  setActiveSlide: (index) => set((s) => ({ carouselEditor: { ...s.carouselEditor, activeSlideIndex: index } })),
  updateSlide: (index, data) => set((s) => {
    const slides = [...s.carouselEditor.slides]
    slides[index] = { ...slides[index], ...data }
    return { carouselEditor: { ...s.carouselEditor, slides, isDirty: true } }
  }),
  addSlide: (slide) => set((s) => ({
    carouselEditor: { ...s.carouselEditor, slides: [...s.carouselEditor.slides, slide], isDirty: true },
  })),
  removeSlide: (index) => set((s) => {
    const slides = s.carouselEditor.slides.filter((_, i) => i !== index)
    return { carouselEditor: { ...s.carouselEditor, slides, activeSlideIndex: Math.min(index, slides.length - 1), isDirty: true } }
  }),
  setSlides: (slides) => set((s) => ({ carouselEditor: { ...s.carouselEditor, slides, isDirty: true } })),
  updateCarouselTheme: (theme) => set((s) => ({ carouselEditor: { ...s.carouselEditor, theme: { ...s.carouselEditor.theme, ...theme }, isDirty: true } })),
  setCarouselEditor: (patch) => set((s) => ({ carouselEditor: { ...s.carouselEditor, ...patch } })),

  setAuth: (patch) => set((s) => ({ auth: { ...s.auth, checked: true, ...patch } })),
  setProfileName:  (name)  => set({ profileName: name }),
  setProfileEmail: (email) => set({ profileEmail: email }),
  setPlatformConnections: (connections) => set({ platformConnections: connections }),
  setVoiceProfile: (platform, profile) => set((s) => ({ voiceProfiles: { ...s.voiceProfiles, [platform]: profile } })),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setContentPillars: (pillars) => set({ contentPillars: pillars }),
  setAILoading: (loading) => set({ isAILoading: loading }),
  setAutocompleteText: (text) => set({ autocompleteText: text }),
  setPostScore: (score) => set({ postScore: score }),
  toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
}))

export default useAppStore
