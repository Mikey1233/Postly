import { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import axios from 'axios'
import api, { streamSSE } from '../lib/api'
import { PLATFORM_LIMITS, PLATFORM_LABELS, PLATFORM_COLORS } from '../lib/platformLimits'
import type { Platform } from '../lib/platformLimits'
import { useShallow } from 'zustand/react/shallow'
import useAppStore from '../store/useAppStore'
import type { Tone, MediaAsset } from '../store/useAppStore'
import MediaUploadZone from '../components/media/MediaUploadZone'
import PlatformIcon from '../components/ui/PlatformIcon'
import { useConfirm } from '../components/ui/ConfirmDialog'

interface DbMediaRow {
  id: string
  type: 'image' | 'video' | 'gif'
  filename: string
  storage_path: string
  thumbnail_path: string | null
  mime_type: string
  size_bytes: number
  alt_text: string | null
  sort_order: number
}
function dbToMediaAsset(row: DbMediaRow): MediaAsset {
  return {
    id: row.id,
    type: row.type,
    filename: row.filename,
    storagePath: row.storage_path,
    thumbnailPath: row.thumbnail_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    altText: row.alt_text,
    sortOrder: row.sort_order,
  }
}

function serverError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined
    if (data?.error) return data.error
  }
  return fallback
}

// Platforms we can publish/schedule to. Gmail is a special case — it sends
// the post as an email to chosen recipients (Subject + To picker shown below).
const PUBLISH_PLATFORMS: Platform[] = ['linkedin', 'x', 'gmail']

// First non-empty line of the post, used as the default email subject when
// the user hasn't typed one. Trimmed to a reasonable subject length.
function autoSubjectFrom(content: string): string {
  const firstLine = content.split('\n').map((l) => l.trim()).find(Boolean) || ''
  return firstLine.slice(0, 120)
}

const TONES: { value: Tone; label: string }[] = [
  { value: 'default',            label: 'Default' },
  { value: 'motivational',       label: 'Motivational' },
  { value: 'educational',        label: 'Educational' },
  { value: 'sales',              label: 'Sales' },
  { value: 'inspirational',      label: 'Inspirational' },
  { value: 'storytelling',       label: 'Storytelling' },
  { value: 'humorous',           label: 'Humorous' },
  { value: 'controversial',      label: 'Controversial' },
  { value: 'thought-leadership', label: 'Thought leadership' },
]

interface ScoreData { hookStrength: number; clarity: number; structure: number; predictedEngagement: number; suggestions: string[] }
interface HookData { type: string; hook: string }

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 text-gray-500 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${value * 10}%` }} />
      </div>
      <span className="text-gray-500 w-8 text-right">{value}/10</span>
    </div>
  )
}

export default function Composer() {
  const navigate = useNavigate()
  const confirm  = useConfirm()
  const [searchParams] = useSearchParams()
  const draftIdParam = searchParams.get('id')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const contextRef = useRef<HTMLTextAreaElement>(null)
  const autocompleteCtrl = useRef<AbortController | null>(null)
  const autocompleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    currentPost, setPostContent, togglePlatform, addMediaAsset, removeMediaAsset,
    setCurrentPost, resetComposer, selectedModel, setSelectedModel,
    postScore, setPostScore, contentPillars, voiceProfiles,
    emailRecipients, setEmailRecipients,
  } = useAppStore(
    useShallow((s) => ({
      currentPost:        s.currentPost,
      setPostContent:     s.setPostContent,
      togglePlatform:     s.togglePlatform,
      addMediaAsset:      s.addMediaAsset,
      removeMediaAsset:   s.removeMediaAsset,
      setCurrentPost:     s.setCurrentPost,
      resetComposer:      s.resetComposer,
      selectedModel:      s.selectedModel,
      setSelectedModel:   s.setSelectedModel,
      postScore:          s.postScore,
      setPostScore:       s.setPostScore,
      contentPillars:     s.contentPillars,
      voiceProfiles:      s.voiceProfiles,
      emailRecipients:    s.emailRecipients,
      setEmailRecipients: s.setEmailRecipients,
    }))
  )

  // Gmail integration — only relevant when 'gmail' is in currentPost.platforms.
  const gmailSelected = currentPost.platforms.includes('gmail')
  const subjectValue = currentPost.emailSubject ?? autoSubjectFrom(currentPost.content)
  const selectedRecipients = emailRecipients.filter((r) => currentPost.recipientIds.includes(r.id))
  const [recipientPickerOpen, setRecipientPickerOpen] = useState(false)
  const [recipientSearch, setRecipientSearch] = useState('')

  // All saved voices. The composer always renders the full list — user picks.
  const availableVoices = voiceProfiles
  const activeVoice = availableVoices.find((v) => v.id === currentPost.voice)
    ?? availableVoices.find((v) => v.isDefault)
    ?? availableVoices[0]
    ?? null
  const activePlatform: Platform = activeVoice?.platform ?? 'linkedin'

  const [models, setModels]         = useState<{ id: string; name: string }[]>([])
  const [ghostText, setGhostText]   = useState('')
  const [aiInput, setAIInput]       = useState('')
  const [saving, setSaving]         = useState(false)

  // Proposed-edit flow — AI reads the textarea, returns a revised version,
  // user accepts or rejects from a card right above the textarea.
  // `proposedEditRange` is null for whole-draft edits, or [start, end] for selection edits.
  const [proposedEdit, setProposedEdit]                 = useState<string | null>(null)
  const [proposedEditInstruction, setProposedEditInstr] = useState('')
  const [proposedEditLoading, setProposedEditLoading]   = useState(false)
  const [proposedEditRange, setProposedEditRange]       = useState<[number, number] | null>(null)
  const proposedEditCtrl = useRef<AbortController | null>(null)

  // Last-known selection inside the textarea. Tracked on every selection change
  // so it survives the user clicking into the AI input before hitting send.
  const [selectionStart, setSelectionStart] = useState(0)
  const [selectionEnd,   setSelectionEnd]   = useState(0)
  const selectionLength = Math.max(0, selectionEnd - selectionStart)
  const [scheduling, setScheduling] = useState(false)
  const [posting, setPosting]       = useState(false)
  const [scheduleModal, setScheduleModal] = useState(false)
  const [scheduleDate, setScheduleDate]   = useState('')

  // Hook generator
  const [hooksModal, setHooksModal]     = useState(false)
  const [hooks, setHooks]               = useState<HookData[]>([])
  const [hooksLoading, setHooksLoading] = useState(false)

  // Repurpose engine
  const [repurposeModal, setRepurposeModal]     = useState(false)
  const [repurposeFormat, setRepurposeFormat]   = useState<'x-thread' | 'reddit' | 'longform'>('x-thread')
  const [repurposeResult, setRepurposeResult]   = useState('')
  const [repurposeLoading, setRepurposeLoading] = useState(false)

  // Rewrite-in-voice: tracks voice id being rewritten
  const [rewriting, setRewriting] = useState<string | null>(null)
  const rewriteCtrl = useRef<AbortController | null>(null)

  // YouTube import: paste a URL, server fetches transcript, transcript becomes
  // context, then we stream a compose into the editor.
  const [youtubeModal, setYoutubeModal]             = useState(false)
  const [youtubeUrl, setYoutubeUrl]                 = useState('')
  const [youtubeInstruction, setYoutubeInstruction] = useState('')
  const [youtubeLoading, setYoutubeLoading]         = useState(false)
  const youtubeCtrl = useRef<AbortController | null>(null)

  useEffect(() => {
    api.get('/api/ai/models').then((r) => setModels(r.data.models)).catch(() => {})
  }, [])

  // Load the recipient list once on mount so the Gmail picker is populated
  // the moment the user toggles Gmail on. Skips if already loaded.
  useEffect(() => {
    if (emailRecipients.length > 0) return
    api.get<Array<{ id: string; name: string; email: string; group_tag: string | null; notes: string | null }>>('/api/recipients')
      .then(({ data }) => setEmailRecipients(
        data.map((r) => ({ id: r.id, name: r.name, email: r.email, groupTag: r.group_tag, notes: r.notes }))
          .sort((a, b) => a.name.localeCompare(b.name))
      ))
      .catch(() => { /* silent — page surfaces real errors */ })
  // intentionally only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load a saved draft (or any post) into the composer when ?id=<uuid> is set.
  // Navigated to from /drafts and from the Calendar drawer's Edit button.
  useEffect(() => {
    if (!draftIdParam || draftIdParam === currentPost.id) return
    let cancelled = false
    api.get(`/api/posts/${draftIdParam}`).then(({ data }) => {
      if (cancelled) return
      const gmailMeta = data.metadata?.gmail || {}
      setCurrentPost({
        id:           data.id,
        content:      data.content || '',
        context:      data.context || '',
        platforms:    data.platform || [],
        postType:     data.post_type || 'text',
        voice:        data.voice_profile_id || null,
        scheduledAt:  data.scheduled_at || null,
        mediaAssets:  (data.media_assets || []).map(dbToMediaAsset),
        recipientIds: Array.isArray(gmailMeta.recipientIds) ? gmailMeta.recipientIds : [],
        emailSubject: typeof gmailMeta.subject === 'string' ? gmailMeta.subject : null,
      })
    }).catch(() => toast.error('Failed to load draft'))
    return () => { cancelled = true }
  // currentPost.id intentionally omitted — we only want to load when the URL param changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftIdParam, setCurrentPost])

  // Resize the context textarea to fit whatever's in it (handles draft loads).
  useEffect(() => {
    const el = contextRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [currentPost.context])

  // If the stored voice is missing/unavailable (e.g. user just analysed their first voice
  // or deleted the one they had picked), fall back to the platform default.
  useEffect(() => {
    if (!availableVoices.length) return
    const exists = availableVoices.find((v) => v.id === currentPost.voice)
    if (!exists) {
      const fallback = availableVoices.find((v) => v.isDefault) ?? availableVoices[0]
      setCurrentPost({ voice: fallback.id })
    }
  }, [availableVoices, currentPost.voice, setCurrentPost])

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  const triggerAutocomplete = useCallback((text: string) => {
    if (autocompleteTimer.current) clearTimeout(autocompleteTimer.current)
    if (autocompleteCtrl.current) autocompleteCtrl.current.abort()
    setGhostText('')
    if (text.length < 20) return
    autocompleteTimer.current = setTimeout(async () => {
      autocompleteCtrl.current = new AbortController()
      try {
        let suggestion = ''
        await streamSSE(
          '/api/ai/autocomplete',
          {
            text: text.slice(-300),
            platform: activePlatform,
            voiceId: activeVoice?.id,
            model: selectedModel,
            tone: currentPost.tone,
            context: currentPost.context || null,
          },
          (chunk) => { suggestion += chunk; setGhostText(suggestion) },
          autocompleteCtrl.current.signal,
        )
      } catch (err: unknown) {
        if (!(err instanceof Error) || err.name !== 'AbortError') { /* silent */ }
      }
    }, 500)
  }, [activeVoice, activePlatform, selectedModel, currentPost.tone, currentPost.context])

  const scheduleScore = useCallback((content: string) => {
    if (scoreTimer.current) clearTimeout(scoreTimer.current)
    if (content.length < 50) { setPostScore(null); return }
    scoreTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.post<ScoreData>('/api/ai/score', {
          content,
          platform: activePlatform,
          context: currentPost.context || null,
        })
        setPostScore(data)
      } catch { /* silent */ }
    }, 1500)
  }, [activePlatform, setPostScore, currentPost.context])

  const handleContentChange = (val: string) => {
    setPostContent(val)
    adjustHeight()
    triggerAutocomplete(val)
    scheduleScore(val)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Proposed edit takes priority over ghost autocomplete: Tab accepts, Esc rejects.
    if (proposedEdit !== null && !proposedEditLoading) {
      if (e.key === 'Tab')    { e.preventDefault(); acceptProposedEdit();  return }
      if (e.key === 'Escape') { e.preventDefault(); rejectProposedEdit();  return }
    }
    if (e.key === 'Tab' && ghostText) {
      e.preventDefault()
      setPostContent(currentPost.content + ghostText)
      setGhostText('')
      if (autocompleteCtrl.current) autocompleteCtrl.current.abort()
    }
    if (e.key === 'Escape') setGhostText('')
  }

  const trackSelection = () => {
    const el = textareaRef.current
    if (!el) return
    setSelectionStart(el.selectionStart)
    setSelectionEnd(el.selectionEnd)
  }

  const cancelProposedEdit = () => {
    if (proposedEditCtrl.current) proposedEditCtrl.current.abort()
    setProposedEdit(null)
    setProposedEditInstr('')
    setProposedEditRange(null)
    setProposedEditLoading(false)
  }

  // Send the user's instruction + current draft to the AI.
  //  - Empty draft → /api/ai/compose generates a first version.
  //  - Has draft, no selection → /api/ai/edit revises the whole draft.
  //  - Has selection → /api/ai/edit returns a replacement for just the selected range.
  // The result appears as a proposed edit above the textarea for accept/reject.
  const sendAIRequest = async () => {
    const instruction = aiInput.trim()
    if (!instruction || proposedEditLoading) return
    if (autocompleteCtrl.current) autocompleteCtrl.current.abort()
    setGhostText('')
    setAIInput('')
    setProposedEditInstr(instruction)
    setProposedEditLoading(true)
    setProposedEdit('')

    const existing = currentPost.content
    const hasContent = existing.trim().length > 0
    const hasSelection = hasContent && selectionLength > 0
    setProposedEditRange(hasSelection ? [selectionStart, selectionEnd] : null)

    proposedEditCtrl.current = new AbortController()

    const endpoint = hasContent ? '/api/ai/edit' : '/api/ai/compose'
    const sharedContext = currentPost.context || null
    const body = hasContent
      ? {
          content: existing,
          instruction,
          selection: hasSelection
            ? { start: selectionStart, end: selectionEnd, text: existing.slice(selectionStart, selectionEnd) }
            : null,
          platform: activePlatform,
          voiceId:  activeVoice?.id,
          model:    selectedModel,
          tone:     currentPost.tone,
          context:  sharedContext,
        }
      : {
          topic: instruction,
          platform: activePlatform,
          voiceId: activeVoice?.id,
          model: selectedModel,
          tone: currentPost.tone,
          context: sharedContext,
        }

    let result = ''
    try {
      await streamSSE(
        endpoint,
        body,
        (chunk) => { result += chunk; setProposedEdit(result) },
        proposedEditCtrl.current.signal,
      )
    } catch (err: unknown) {
      if (!(err instanceof Error) || err.name !== 'AbortError') {
        toast.error('AI request failed')
        cancelProposedEdit()
      }
    } finally {
      setProposedEditLoading(false)
    }
  }

  const acceptProposedEdit = () => {
    if (!proposedEdit) return
    let next: string
    if (proposedEditRange) {
      const [start, end] = proposedEditRange
      next = currentPost.content.slice(0, start) + proposedEdit + currentPost.content.slice(end)
    } else {
      next = proposedEdit
    }
    setPostContent(next)
    adjustHeight()
    scheduleScore(next)
    setProposedEdit(null)
    setProposedEditInstr('')
    setProposedEditRange(null)
    // Return focus to the textarea so the keyboard flow continues there.
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const rejectProposedEdit = () => {
    cancelProposedEdit()
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  // Switch the active voice. If there's existing content, stream a rewrite
  // through /api/ai/rephrase using the selected voice's saved system prompt.
  const selectVoice = async (voice: typeof availableVoices[number]) => {
    if (rewriting) return
    setCurrentPost({ voice: voice.id })

    const content = currentPost.content.trim()
    if (!content) return

    if (autocompleteCtrl.current) autocompleteCtrl.current.abort()
    setGhostText('')

    setRewriting(voice.id)
    rewriteCtrl.current = new AbortController()
    let rewritten = ''
    setPostContent('')
    try {
      await streamSSE(
        '/api/ai/rephrase',
        {
          content,
          platform: voice.platform,
          voiceId: voice.id,
          model: selectedModel,
          tone: currentPost.tone,
          context: currentPost.context || null,
        },
        (chunk) => { rewritten += chunk; setPostContent(rewritten); adjustHeight() },
        rewriteCtrl.current.signal,
      )
      scheduleScore(rewritten)
    } catch (err: unknown) {
      if (!(err instanceof Error) || err.name !== 'AbortError') {
        setPostContent(content) // restore on failure
        toast.error('Rewrite failed')
      }
    } finally {
      setRewriting(null)
    }
  }

  const generateHashtags = async () => {
    if (!currentPost.content) { toast.error('Write a post first'); return }
    try {
      const { data } = await api.post('/api/ai/hashtags', { content: currentPost.content, platform: activePlatform })
      setPostContent(currentPost.content + '\n\n' + (data.hashtags as string[]).join(' '))
      toast.success('Hashtags added')
    } catch { toast.error('Failed to generate hashtags') }
  }

  const generateHooks = async () => {
    const hasContent = currentPost.content.trim().length > 0
    const hasContext = currentPost.context.trim().length > 0
    if (!hasContent && !hasContext) { toast.error('Write some content or add context first'); return }
    setHooks([])
    setHooksLoading(true)
    setHooksModal(true)
    try {
      const { data } = await api.post('/api/ai/hooks', {
        content: currentPost.content,
        context: currentPost.context || null,
        platform: activePlatform,
        voiceId: activeVoice?.id,
      })
      setHooks(data.hooks || [])
    } catch { toast.error('Failed to generate hooks') }
    finally { setHooksLoading(false) }
  }

  const useHook = (hook: string) => {
    setPostContent(hook + '\n\n' + currentPost.content)
    setHooksModal(false)
    toast.success('Hook added')
  }

  const generateFromYoutube = async () => {
    const url = youtubeUrl.trim()
    if (!url) { toast.error('Paste a YouTube URL first'); return }
    if (currentPost.content.trim() && !(await confirm({ title: 'Replace current draft?', body: 'A new post will be generated from this video.', confirmLabel: 'Replace', destructive: true }))) return

    setYoutubeLoading(true)

    let transcript = ''
    try {
      const { data } = await api.post<{ transcript: string; truncated: boolean }>(
        '/api/youtube/transcript',
        { url },
      )
      transcript = data.transcript || ''
      if (!transcript) throw new Error('Empty transcript')
      if (data.truncated) toast('Long video — using the first portion of the transcript', { icon: '✂️' })
    } catch (err) {
      toast.error(serverError(err, 'Failed to fetch transcript'))
      setYoutubeLoading(false)
      return
    }

    // Save the transcript as the post's context so follow-up AI edits stay grounded.
    setCurrentPost({ context: transcript })

    // Reset the editor and stream the generated draft in.
    if (autocompleteCtrl.current) autocompleteCtrl.current.abort()
    setGhostText('')
    setPostContent('')
    setYoutubeModal(false)

    const instruction = youtubeInstruction.trim()
      || `Write a ${activePlatform} post based on this YouTube video. Surface the most useful insight or takeaway and make it stand on its own — don't reference "the video" unless it strengthens the hook.`

    youtubeCtrl.current = new AbortController()
    let result = ''
    try {
      await streamSSE(
        '/api/ai/compose',
        {
          topic: instruction,
          platform: activePlatform,
          voiceId:  activeVoice?.id,
          model:    selectedModel,
          tone:     currentPost.tone,
          context:  transcript,
        },
        (chunk) => { result += chunk; setPostContent(result); adjustHeight() },
        youtubeCtrl.current.signal,
      )
      scheduleScore(result)
      toast.success('Post generated from video')
    } catch (err: unknown) {
      if (!(err instanceof Error) || err.name !== 'AbortError') {
        toast.error('Generation failed')
      }
    } finally {
      setYoutubeLoading(false)
      setYoutubeUrl('')
      setYoutubeInstruction('')
    }
  }

  const generateRepurpose = async () => {
    if (!currentPost.content.trim()) { toast.error('Write some content first'); return }
    setRepurposeLoading(true)
    setRepurposeResult('')
    try {
      let result = ''
      await streamSSE(
        '/api/ai/repurpose',
        { content: currentPost.content, format: repurposeFormat, platform: activePlatform, model: selectedModel },
        (chunk) => { result += chunk; setRepurposeResult(result) },
      )
    } catch { toast.error('Failed to repurpose') }
    finally { setRepurposeLoading(false) }
  }

  // Build the gmail block for posts.metadata when Gmail is selected.
  // Skipped when Gmail isn't a target so we don't bloat unrelated drafts.
  const buildMetadata = (): Record<string, unknown> | null => {
    if (!gmailSelected) return null
    return {
      gmail: {
        recipientIds: currentPost.recipientIds,
        subject:      (currentPost.emailSubject ?? autoSubjectFrom(currentPost.content)) || null,
      },
    }
  }

  // Single place to reject a save/publish when Gmail is selected but the
  // required Gmail fields aren't ready. Returns true if we should bail out.
  const blockedByGmailGate = ({ requireRecipients }: { requireRecipients: boolean }): boolean => {
    if (!gmailSelected) return false
    if (requireRecipients && currentPost.recipientIds.length === 0) {
      toast.error('Pick at least one recipient for the Gmail send')
      return true
    }
    return false
  }

  const saveDraft = async ({ silent = false }: { silent?: boolean } = {}): Promise<string | null> => {
    if (!currentPost.content.trim()) { toast.error('Write something first'); return null }
    if (!currentPost.platforms.length) { toast.error('Pick at least one platform'); return null }
    setSaving(true)
    try {
      const metadata = buildMetadata()
      if (currentPost.id) {
        await api.put(`/api/posts/${currentPost.id}`, {
          content: currentPost.content, platform: currentPost.platforms,
          post_type: currentPost.postType,
          voice_profile_id: currentPost.voice || null,
          context: currentPost.context || null,
          metadata,
        })
        if (!silent) toast.success('Draft saved')
        return currentPost.id
      }
      const { data } = await api.post('/api/posts', {
        content: currentPost.content, platform: currentPost.platforms,
        status: 'draft', post_type: currentPost.postType,
        voice_profile_id: currentPost.voice || null,
        context: currentPost.context || null,
        metadata,
      })
      setCurrentPost({ id: data.id })
      if (!silent) toast.success('Draft saved')
      return data.id as string
    } catch (err) {
      toast.error(serverError(err, 'Failed to save draft'))
      return null
    }
    finally { setSaving(false) }
  }

  const schedule = async () => {
    if (!currentPost.platforms.length) { toast.error('Pick a platform to schedule to'); return }
    if (!scheduleDate) { toast.error('Pick a date and time'); return }
    if (blockedByGmailGate({ requireRecipients: true })) return
    setScheduling(true)
    try {
      const postData = {
        content: currentPost.content, platform: currentPost.platforms,
        status: 'scheduled', scheduled_at: new Date(scheduleDate).toISOString(),
        post_type: currentPost.postType,
        metadata: buildMetadata(),
      }
      if (currentPost.id) await api.put(`/api/posts/${currentPost.id}`, postData)
      else { const { data } = await api.post('/api/posts', postData); setCurrentPost({ id: data.id }) }
      toast.success('Post scheduled')
      setScheduleModal(false)
    } catch { toast.error('Failed to schedule') }
    finally { setScheduling(false) }
  }

  const postNow = async () => {
    if (!currentPost.platforms.length) { toast.error('Pick a platform to post to'); return }
    if (blockedByGmailGate({ requireRecipients: true })) return
    const targetSummary = currentPost.platforms.map((p) => PLATFORM_LABELS[p]).join(' + ')
    const gmailSuffix = gmailSelected ? ` (Gmail → ${currentPost.recipientIds.length} recipient${currentPost.recipientIds.length === 1 ? '' : 's'})` : ''
    if (!(await confirm({ title: 'Post now?', body: `Publishing to ${targetSummary}${gmailSuffix}.`, confirmLabel: 'Post' }))) return
    const id = currentPost.id || await saveDraft({ silent: true })
    if (!id) return
    setPosting(true)
    try {
      await api.post(`/api/posts/${id}/publish`, {})
      toast.success('Publishing started!')
      resetComposer()
      navigate('/')
    } catch { toast.error('Publish failed') }
    finally { setPosting(false) }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Left — Editor ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-y-auto scrollbar-slim p-5 gap-4 border-r border-gray-200">

          {/* Voice picker — click a saved voice to rewrite the post in it */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 shrink-0 uppercase tracking-wide">Voice:</span>
            {availableVoices.length === 0 && (
              <Link to="/voice" className="text-xs text-indigo-600 hover:underline">
                Create a voice profile to start writing →
              </Link>
            )}
            {availableVoices.map((v) => {
              const active = activeVoice?.id === v.id
              const isRewriting = rewriting === v.id
              return (
                <button
                  key={v.id}
                  onClick={() => selectVoice(v)}
                  disabled={!!rewriting}
                  title={`Rewrite in "${v.name}" (${PLATFORM_LABELS[v.platform]})`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                    active ? 'text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                  style={active ? { backgroundColor: PLATFORM_COLORS[v.platform], borderColor: PLATFORM_COLORS[v.platform] } : {}}
                >
                  <PlatformIcon platform={v.platform} size={14} className={active ? 'brightness-0 invert' : ''} />
                  <span className="truncate max-w-[180px]">{v.name}</span>
                  {isRewriting && <span className="ml-1 animate-pulse">…</span>}
                </button>
              )
            })}
          </div>

          {/* Tone selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 shrink-0 uppercase tracking-wide">Tone:</span>
            {TONES.map(({ value, label }) => {
              const active = currentPost.tone === value
              return (
                <button
                  key={value}
                  onClick={() => setCurrentPost({ tone: value })}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* Content pillar tags */}
          {contentPillars.length > 0 && (
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-xs text-gray-400 shrink-0">Pillar:</span>
              {contentPillars.map((pillar) => {
                const active = currentPost.pillarId === pillar.id
                return (
                  <button
                    key={pillar.id}
                    onClick={() => setCurrentPost({ pillarId: active ? null : pillar.id })}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      active ? 'text-white border-transparent' : 'text-gray-500 border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                    style={active ? { backgroundColor: pillar.color, borderColor: pillar.color } : {}}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: active ? 'rgba(255,255,255,0.8)' : pillar.color }}
                    />
                    {pillar.name}
                  </button>
                )
              })}
            </div>
          )}

          {/* Proposed AI edit — sits right above the textarea so accept/reject is
              in the same vertical space as what's being changed. */}
          {(proposedEdit !== null || proposedEditLoading) && (
            <div className="border border-indigo-300 bg-indigo-50/70 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 flex items-center gap-2 flex-wrap">
                    Proposed edit
                    <span className="text-[10px] font-medium normal-case text-indigo-500/80 bg-white border border-indigo-200 rounded-full px-2 py-0.5">
                      {proposedEditRange ? `selection · ${proposedEditRange[1] - proposedEditRange[0]} chars` : 'whole draft'}
                    </span>
                    {proposedEditLoading && <span className="animate-pulse text-indigo-400 normal-case font-normal">streaming…</span>}
                  </p>
                  {proposedEditInstruction && (
                    <p className="text-xs text-indigo-600/80 mt-1 truncate" title={proposedEditInstruction}>
                      "{proposedEditInstruction}"
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={rejectProposedEdit}
                    title="Reject (Esc)"
                    className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50"
                  >
                    {proposedEditLoading ? 'Cancel' : 'Reject'}
                  </button>
                  <button
                    onClick={acceptProposedEdit}
                    disabled={proposedEditLoading || !proposedEdit}
                    title="Accept (Tab)"
                    className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Accept
                  </button>
                </div>
              </div>
              <div className="bg-white border border-indigo-100 rounded-lg p-3 max-h-72 overflow-y-auto scrollbar-slim">
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {proposedEdit || (proposedEditLoading ? '…' : '')}
                </p>
              </div>
              {!proposedEditLoading && (
                <p className="text-[10px] text-indigo-700/70 flex items-center gap-2">
                  <kbd className="bg-white border border-indigo-200 rounded px-1.5 py-0.5 font-medium">Tab</kbd> accept
                  <kbd className="bg-white border border-indigo-200 rounded px-1.5 py-0.5 font-medium">Esc</kbd> reject
                  <span className="text-indigo-400">— from the editor</span>
                </p>
              )}
            </div>
          )}

          {/* Context — the "why" behind the post. Fed into every AI call so hooks,
              CTAs, edits, and the score are grounded in the writer's actual intent. */}
          <div className="border border-gray-200 rounded-xl bg-gray-50/60 px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="post-context" className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Context
              </label>
              <span className="text-[10px] text-gray-400">
                Used by AI for hooks, CTAs, edits, score
              </span>
            </div>
            <textarea
              id="post-context"
              ref={contextRef}
              value={currentPost.context}
              onChange={(e) => {
                setCurrentPost({ context: e.target.value })
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = `${el.scrollHeight}px`
              }}
              placeholder="What's the story behind this post? Why are you writing it, what's the goal, who's it for?"
              rows={2}
              className="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Gmail panel — Subject + Recipient picker. Visible only when Gmail
              is one of the selected publish targets. */}
          {gmailSelected && (
            <div className="border border-rose-200 bg-rose-50/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 flex items-center gap-2">
                  <PlatformIcon platform="gmail" size={14} />
                  Email send
                </p>
                <Link to="/recipients" className="text-[10px] text-rose-700/70 hover:underline">
                  Manage recipients →
                </Link>
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Subject
                </label>
                <input
                  type="text"
                  value={subjectValue}
                  onChange={(e) => setCurrentPost({ emailSubject: e.target.value })}
                  placeholder="(uses first line of your post)"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
                {currentPost.emailSubject !== null && (
                  <button
                    onClick={() => setCurrentPost({ emailSubject: null })}
                    className="text-[10px] text-gray-400 hover:text-gray-600"
                  >
                    Reset to first line
                  </button>
                )}
              </div>

              {/* Recipients */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    To {selectedRecipients.length > 0 && (
                      <span className="text-gray-400 normal-case font-normal ml-1">
                        ({selectedRecipients.length} selected)
                      </span>
                    )}
                  </label>
                  <button
                    onClick={() => setRecipientPickerOpen((o) => !o)}
                    className="text-[10px] text-rose-700 hover:underline"
                  >
                    {recipientPickerOpen ? 'Close' : selectedRecipients.length ? 'Edit' : '+ Add'}
                  </button>
                </div>

                {selectedRecipients.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">
                    {emailRecipients.length === 0
                      ? <>No recipients yet. <Link to="/recipients" className="text-rose-700 hover:underline">Add one →</Link></>
                      : 'No one selected yet — click + Add'}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRecipients.map((r) => (
                      <span
                        key={r.id}
                        className="inline-flex items-center gap-1.5 bg-white border border-rose-200 rounded-full pl-2.5 pr-1 py-0.5 text-xs"
                      >
                        <span className="text-gray-700">{r.name}</span>
                        <span className="text-gray-400 text-[10px]">{r.email}</span>
                        <button
                          onClick={() => setCurrentPost({ recipientIds: currentPost.recipientIds.filter((id) => id !== r.id) })}
                          title="Remove"
                          className="w-4 h-4 rounded-full text-gray-400 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center"
                        >×</button>
                      </span>
                    ))}
                  </div>
                )}

                {recipientPickerOpen && emailRecipients.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-2 mt-1.5 space-y-1.5">
                    <input
                      value={recipientSearch}
                      onChange={(e) => setRecipientSearch(e.target.value)}
                      placeholder="Search by name, email, tag…"
                      className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-rose-300"
                    />
                    <div className="max-h-48 overflow-y-auto scrollbar-slim space-y-0.5">
                      {emailRecipients
                        .filter((r) => {
                          if (!recipientSearch.trim()) return true
                          const s = recipientSearch.toLowerCase()
                          return r.name.toLowerCase().includes(s)
                            || r.email.toLowerCase().includes(s)
                            || (r.groupTag || '').toLowerCase().includes(s)
                        })
                        .map((r) => {
                          const checked = currentPost.recipientIds.includes(r.id)
                          return (
                            <label
                              key={r.id}
                              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer text-xs"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...currentPost.recipientIds, r.id]
                                    : currentPost.recipientIds.filter((id) => id !== r.id)
                                  setCurrentPost({ recipientIds: next })
                                }}
                                className="accent-rose-600"
                              />
                              <span className="text-gray-800 font-medium">{r.name}</span>
                              <span className="text-gray-400">{r.email}</span>
                              {r.groupTag && (
                                <span className="ml-auto text-[10px] bg-indigo-50 text-indigo-700 rounded-full px-1.5 py-0.5">
                                  {r.groupTag}
                                </span>
                              )}
                            </label>
                          )
                        })}
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[10px] text-gray-400">
                      <button
                        onClick={() => setCurrentPost({ recipientIds: emailRecipients.map((r) => r.id) })}
                        className="hover:text-gray-700"
                      >Select all</button>
                      <button
                        onClick={() => setCurrentPost({ recipientIds: [] })}
                        className="hover:text-gray-700"
                      >Clear</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={currentPost.content}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onSelect={trackSelection}
              onKeyUp={trackSelection}
              onClick={trackSelection}
              placeholder="What's on your mind?"
              className={`w-full min-h-[180px] border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 resize-none leading-relaxed transition-colors ${
                proposedEdit !== null
                  ? 'border-indigo-300 focus:ring-indigo-300 bg-indigo-50/30'
                  : 'border-gray-200 focus:ring-indigo-400'
              }`}
              style={{ height: 'auto' }}
            />
            {ghostText && (
              <div className="mt-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-400 flex items-center gap-2">
                <kbd className="bg-white border border-gray-200 rounded px-1 text-gray-500">Tab</kbd>
                to accept: <span className="text-gray-500">{ghostText.slice(0, 100)}{ghostText.length > 100 ? '…' : ''}</span>
                <button onClick={() => setGhostText('')} className="ml-auto text-gray-300 hover:text-gray-500">✕</button>
              </div>
            )}
          </div>

          {/* Character counters */}
          {currentPost.platforms.length > 0 && (
            <div className="flex gap-3 flex-wrap">
              {currentPost.platforms.map((p) => {
                const limit = PLATFORM_LIMITS[p].characters
                if (!limit) return null
                const count = currentPost.content.length
                const over = count > limit
                return (
                  <span key={p} className={`text-xs font-mono ${over ? 'text-red-500' : 'text-gray-400'}`}>
                    {PLATFORM_LABELS[p]}: {count.toLocaleString()} / {limit.toLocaleString()}
                  </span>
                )
              })}
            </div>
          )}

          {/* Media */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Media</p>
            <MediaUploadZone
              platforms={currentPost.platforms}
              assets={currentPost.mediaAssets}
              postId={currentPost.id}
              onAdd={addMediaAsset}
              onRemove={removeMediaAsset}
            />
          </div>

          {/* Toolbar */}
          <div className="flex gap-2 flex-wrap">
            {[
              { label: 'Hashtags',     onClick: generateHashtags },
              { label: 'Score ↺',     onClick: () => scheduleScore(currentPost.content) },
              { label: 'Hooks',        onClick: generateHooks },
              { label: 'From YouTube', onClick: () => setYoutubeModal(true) },
              { label: 'Repurpose',    onClick: () => setRepurposeModal(true) },
            ].map(({ label, onClick }) => (
              <button key={label} onClick={onClick}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50">
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Right — AI Panel ──────────────────────────────────────────────── */}
        {/* Three zones so the score card never pushes the input out of view:
            top (model select) and bottom (input + score) are shrink-0;
            the middle area takes whatever's left and scrolls on its own. */}
        <div className="w-80 shrink-0 min-h-0 flex flex-col bg-gray-50 overflow-hidden">
          <div className="p-5 pb-3 shrink-0">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-slim px-5 pb-3 space-y-3">
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">AI Editor</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Tell the AI what to change. It reads your current post and proposes an edit you can
                <span className="text-indigo-600 font-medium"> accept </span>
                or <span className="text-gray-700 font-medium">reject</span> right above your draft.
                With no draft yet, it'll write a first version from your prompt.
              </p>
              <ul className="text-xs text-gray-500 space-y-0.5 mt-1 pl-3 list-disc">
                <li>"Make the hook punchier"</li>
                <li>"Shorten by 30% and tighten the CTA"</li>
                <li>"Rewrite as a single paragraph"</li>
              </ul>
            </div>
          </div>

          <div className="shrink-0 border-t border-gray-200 bg-gray-50 p-5 pt-3 space-y-3">
            {postScore && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2 max-h-56 overflow-y-auto scrollbar-slim">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Post Score</p>
                <ScoreBar label="Hook"       value={postScore.hookStrength} />
                <ScoreBar label="Clarity"    value={postScore.clarity} />
                <ScoreBar label="Structure"  value={postScore.structure} />
                <ScoreBar label="Engagement" value={postScore.predictedEngagement} />
                {postScore.suggestions?.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {postScore.suggestions.map((s, i) => (
                      <p key={i} className="text-xs text-gray-500">💡 {s}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {currentPost.content.trim() && !proposedEdit && !proposedEditLoading && (
              <p className="text-[10px] uppercase tracking-wide text-gray-400">
                {selectionLength > 0
                  ? `Editing ${selectionLength} selected char${selectionLength === 1 ? '' : 's'}`
                  : 'Editing whole draft'}
              </p>
            )}

            <div className="flex gap-2">
              <input
                data-ai-input
                value={aiInput}
                onChange={(e) => setAIInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAIRequest() } }}
                placeholder={currentPost.content.trim() ? 'Tell AI what to change…' : 'Ask AI to write…'}
                disabled={proposedEditLoading}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-100"
              />
              <button onClick={sendAIRequest} disabled={proposedEditLoading || !aiInput.trim()} className="btn-gradient text-white px-3 py-1.5 rounded-lg text-sm disabled:opacity-50">→</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-t border-gray-200 flex-wrap">
        {/* Publish targets — LinkedIn + X only */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 uppercase tracking-wide mr-1">Post to:</span>
          {PUBLISH_PLATFORMS.map((p) => {
            const active = currentPost.platforms.includes(p)
            return (
              <button
                key={p}
                onClick={() => togglePlatform(p)}
                title={`${active ? 'Remove' : 'Add'} ${PLATFORM_LABELS[p]}`}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  active ? 'text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
                style={active ? { backgroundColor: PLATFORM_COLORS[p], borderColor: PLATFORM_COLORS[p] } : {}}
              >
                <PlatformIcon platform={p} size={12} className={active ? 'brightness-0 invert' : ''} />
                {PLATFORM_LABELS[p]}
              </button>
            )
          })}
        </div>

        {/* data-shortcut lets Ctrl+S trigger save from useKeyboardShortcuts */}
        <button data-shortcut="save" onClick={() => saveDraft()} disabled={saving}
          className="border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-60 ml-auto">
          {saving ? 'Saving…' : 'Save Draft'}
        </button>
        <button
          onClick={() => {
            if (!currentPost.platforms.length) { toast.error('Pick a platform to schedule to'); return }
            setScheduleModal(true)
          }}
          className="border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50">
          Schedule
        </button>
        {/* data-shortcut="publish" lets Ctrl+Enter trigger post from anywhere */}
        <button data-shortcut="publish" onClick={postNow} disabled={posting || !currentPost.content}
          className="btn-gradient text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
          {posting ? 'Posting…' : 'Post Now'}
        </button>
      </div>

      {/* ── Schedule modal ──────────────────────────────────────────────────── */}
      {scheduleModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80 space-y-4">
            <h2 className="font-semibold text-gray-900">Schedule Post</h2>
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <div className="flex gap-2">
              <button onClick={schedule} disabled={scheduling}
                className="flex-1 btn-gradient text-white px-4 py-2 rounded-lg text-sm font-medium">
                {scheduling ? 'Scheduling…' : 'Confirm'}
              </button>
              <button onClick={() => setScheduleModal(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hook generator modal ────────────────────────────────────────────── */}
      {hooksModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-[480px] max-h-[70vh] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Hook Generator</h2>
                <p className="text-xs text-gray-400 mt-0.5">Click a hook to prepend it to your post.</p>
              </div>
              <button onClick={() => setHooksModal(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>
            {hooksLoading ? (
              <p className="text-sm text-gray-400 animate-pulse text-center py-8">Generating hooks…</p>
            ) : hooks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No hooks generated.</p>
            ) : (
              <div className="overflow-y-auto space-y-3 flex-1 scrollbar-slim">
                {hooks.map(({ type, hook }, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-2 hover:border-indigo-200 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600 shrink-0">
                        {type.replace(/-/g, ' ')}
                      </span>
                      <button onClick={() => useHook(hook)} className="text-xs text-indigo-600 hover:underline font-medium shrink-0">
                        Use →
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{hook}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── YouTube → Post modal ────────────────────────────────────────────── */}
      {youtubeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-[480px] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Generate from YouTube</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  We'll grab the transcript and use it as context for your post.
                </p>
              </div>
              <button
                onClick={() => { if (!youtubeLoading) setYoutubeModal(false) }}
                disabled={youtubeLoading}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none disabled:opacity-40"
              >✕</button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                YouTube URL
              </label>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !youtubeLoading) generateFromYoutube() }}
                placeholder="https://www.youtube.com/watch?v=…"
                disabled={youtubeLoading}
                autoFocus
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Instruction <span className="text-gray-400 normal-case font-normal">(optional)</span>
              </label>
              <textarea
                value={youtubeInstruction}
                onChange={(e) => setYoutubeInstruction(e.target.value)}
                placeholder={`e.g. "Pull the 3 most counter-intuitive ideas and write a hook-led ${activePlatform} post"`}
                disabled={youtubeLoading}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none disabled:bg-gray-100"
              />
            </div>

            <p className="text-[10px] text-gray-400">
              Transcript is saved to the Context field so follow-up AI edits stay grounded in the video.
            </p>

            <div className="flex gap-2">
              <button
                onClick={generateFromYoutube}
                disabled={youtubeLoading || !youtubeUrl.trim()}
                className="flex-1 btn-gradient text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
              >
                {youtubeLoading ? 'Fetching transcript…' : 'Generate Post'}
              </button>
              <button
                onClick={() => setYoutubeModal(false)}
                disabled={youtubeLoading}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Repurpose engine modal ──────────────────────────────────────────── */}
      {repurposeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-[560px] max-h-[80vh] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Repurpose Post</h2>
              <button
                onClick={() => { setRepurposeModal(false); setRepurposeResult('') }}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >✕</button>
            </div>

            {/* Format picker */}
            <div className="flex gap-2">
              {(['x-thread', 'reddit', 'longform'] as const).map((fmt) => (
                <button key={fmt} onClick={() => setRepurposeFormat(fmt)}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                    repurposeFormat === fmt
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}>
                  {fmt === 'x-thread' ? 'X Thread' : fmt === 'reddit' ? 'Reddit Post' : 'Long-form Blog'}
                </button>
              ))}
            </div>

            <button onClick={generateRepurpose} disabled={repurposeLoading}
              className="btn-gradient text-white px-4 py-2 rounded-lg text-sm font-medium w-fit disabled:opacity-60">
              {repurposeLoading ? 'Generating…' : 'Generate'}
            </button>

            {repurposeResult && (
              <div className="flex-1 overflow-y-auto min-h-[160px] border border-gray-200 rounded-xl p-4 bg-gray-50 scrollbar-slim">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{repurposeResult}</p>
              </div>
            )}

            {repurposeResult && !repurposeLoading && (
              <div className="flex gap-2">
                <button
                  onClick={() => { navigator.clipboard.writeText(repurposeResult); toast.success('Copied!') }}
                  className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                  Copy
                </button>
                <button
                  onClick={() => {
                    setPostContent(repurposeResult)
                    setRepurposeModal(false)
                    setRepurposeResult('')
                    toast.success('Content replaced')
                  }}
                  className="btn-gradient text-white px-4 py-2 rounded-lg text-sm">
                  Use as Post
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
