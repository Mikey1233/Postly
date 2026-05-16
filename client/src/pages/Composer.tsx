import { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api, { streamSSE } from '../lib/api'
import { PLATFORM_LIMITS, PLATFORM_LABELS, PLATFORM_COLORS } from '../lib/platformLimits'
import type { Platform } from '../lib/platformLimits'
import { useShallow } from 'zustand/react/shallow'
import useAppStore from '../store/useAppStore'
import MediaUploadZone from '../components/media/MediaUploadZone'
import PlatformIcon from '../components/ui/PlatformIcon'

// Voices can come from any of the 4 platforms the user has analysed.
const VOICE_PLATFORMS: Platform[] = ['linkedin', 'x', 'facebook', 'reddit']
// We can only actually publish/schedule to LinkedIn + X.
const PUBLISH_PLATFORMS: Platform[] = ['linkedin', 'x']

interface ScoreData { hookStrength: number; clarity: number; structure: number; predictedEngagement: number; suggestions: string[] }
interface AIMessage { role: 'user' | 'assistant'; content: string }
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const autocompleteCtrl = useRef<AbortController | null>(null)
  const autocompleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    currentPost, setPostContent, togglePlatform, addMediaAsset, removeMediaAsset,
    setCurrentPost, resetComposer, selectedModel, setSelectedModel,
    postScore, setPostScore, contentPillars, voiceProfiles,
  } = useAppStore(
    useShallow((s) => ({
      currentPost:      s.currentPost,
      setPostContent:   s.setPostContent,
      togglePlatform:   s.togglePlatform,
      addMediaAsset:    s.addMediaAsset,
      removeMediaAsset: s.removeMediaAsset,
      setCurrentPost:   s.setCurrentPost,
      resetComposer:    s.resetComposer,
      selectedModel:    s.selectedModel,
      setSelectedModel: s.setSelectedModel,
      postScore:        s.postScore,
      setPostScore:     s.setPostScore,
      contentPillars:   s.contentPillars,
      voiceProfiles:    s.voiceProfiles,
    }))
  )

  // Voices the user has actually saved
  const availableVoices = VOICE_PLATFORMS.filter((p) => voiceProfiles[p]?.systemPrompt)
  const activeVoice: Platform | null = currentPost.voice ?? availableVoices[0] ?? null

  const [models, setModels]         = useState<{ id: string; name: string }[]>([])
  const [ghostText, setGhostText]   = useState('')
  const [aiMessages, setAIMessages] = useState<AIMessage[]>([])
  const [aiInput, setAIInput]       = useState('')
  const [aiLoading, setAILoading]   = useState(false)
  const [saving, setSaving]         = useState(false)
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

  // Rewrite-in-voice
  const [rewriting, setRewriting] = useState<Platform | null>(null)
  const rewriteCtrl = useRef<AbortController | null>(null)

  useEffect(() => {
    api.get('/api/ai/models').then((r) => setModels(r.data.models)).catch(() => {})
  }, [])

  // If the stored voice is missing/unavailable (e.g. user just analysed their first voice),
  // fall back to the first available one so AI calls have a voice context.
  useEffect(() => {
    if (!availableVoices.length) return
    if (!currentPost.voice || !availableVoices.includes(currentPost.voice)) {
      setCurrentPost({ voice: availableVoices[0] })
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
          { text: text.slice(-300), platform: activeVoice || 'linkedin', model: selectedModel },
          (chunk) => { suggestion += chunk; setGhostText(suggestion) },
          autocompleteCtrl.current.signal,
        )
      } catch (err: unknown) {
        if (!(err instanceof Error) || err.name !== 'AbortError') { /* silent */ }
      }
    }, 500)
  }, [activeVoice, selectedModel])

  const scheduleScore = useCallback((content: string) => {
    if (scoreTimer.current) clearTimeout(scoreTimer.current)
    if (content.length < 50) { setPostScore(null); return }
    scoreTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.post<ScoreData>('/api/ai/score', { content, platform: activeVoice || 'linkedin' })
        setPostScore(data)
      } catch { /* silent */ }
    }, 1500)
  }, [activeVoice, setPostScore])

  const handleContentChange = (val: string) => {
    setPostContent(val)
    adjustHeight()
    triggerAutocomplete(val)
    scheduleScore(val)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && ghostText) {
      e.preventDefault()
      setPostContent(currentPost.content + ghostText)
      setGhostText('')
      if (autocompleteCtrl.current) autocompleteCtrl.current.abort()
    }
    if (e.key === 'Escape') setGhostText('')
  }

  const sendAIMessage = async () => {
    if (!aiInput.trim() || aiLoading) return
    const userMsg: AIMessage = { role: 'user', content: aiInput }
    setAIMessages((prev) => [...prev, userMsg])
    setAIInput('')
    setAILoading(true)
    let response = ''
    try {
      await streamSSE(
        '/api/ai/compose',
        { topic: aiInput, platform: activeVoice || 'linkedin', model: selectedModel },
        (chunk) => {
          response += chunk
          setAIMessages((prev) => {
            const msgs = [...prev]
            const last = msgs[msgs.length - 1]
            if (last?.role === 'assistant') msgs[msgs.length - 1] = { role: 'assistant', content: response }
            else msgs.push({ role: 'assistant', content: response })
            return msgs
          })
        },
      )
    } catch { toast.error('AI request failed') }
    finally { setAILoading(false) }
  }

  const useAIDraft = () => {
    const last = aiMessages.filter((m) => m.role === 'assistant').pop()
    if (last) { setPostContent(last.content); setGhostText('') }
  }

  // Switch the active voice. If there's existing content, stream a rewrite
  // through /api/ai/rephrase using the selected voice's saved system prompt.
  const selectVoice = async (voice: Platform) => {
    if (rewriting) return
    setCurrentPost({ voice })

    const content = currentPost.content.trim()
    if (!content) return

    if (autocompleteCtrl.current) autocompleteCtrl.current.abort()
    setGhostText('')

    setRewriting(voice)
    rewriteCtrl.current = new AbortController()
    let rewritten = ''
    setPostContent('')
    try {
      await streamSSE(
        '/api/ai/rephrase',
        { content, platform: voice, model: selectedModel },
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
      const { data } = await api.post('/api/ai/hashtags', { content: currentPost.content, platform: activeVoice || 'linkedin' })
      setPostContent(currentPost.content + '\n\n' + (data.hashtags as string[]).join(' '))
      toast.success('Hashtags added')
    } catch { toast.error('Failed to generate hashtags') }
  }

  const generateHooks = async () => {
    if (!currentPost.content.trim()) { toast.error('Write some content first'); return }
    setHooks([])
    setHooksLoading(true)
    setHooksModal(true)
    try {
      const { data } = await api.post('/api/ai/hooks', { content: currentPost.content, platform: activeVoice || 'linkedin' })
      setHooks(data.hooks || [])
    } catch { toast.error('Failed to generate hooks') }
    finally { setHooksLoading(false) }
  }

  const useHook = (hook: string) => {
    setPostContent(hook + '\n\n' + currentPost.content)
    setHooksModal(false)
    toast.success('Hook added')
  }

  const generateRepurpose = async () => {
    if (!currentPost.content.trim()) { toast.error('Write some content first'); return }
    setRepurposeLoading(true)
    setRepurposeResult('')
    try {
      let result = ''
      await streamSSE(
        '/api/ai/repurpose',
        { content: currentPost.content, format: repurposeFormat, platform: activeVoice || 'linkedin', model: selectedModel },
        (chunk) => { result += chunk; setRepurposeResult(result) },
      )
    } catch { toast.error('Failed to repurpose') }
    finally { setRepurposeLoading(false) }
  }

  const saveDraft = async () => {
    setSaving(true)
    try {
      const { data } = await api.post('/api/posts', {
        content: currentPost.content, platform: currentPost.platforms,
        status: 'draft', post_type: currentPost.postType,
      })
      setCurrentPost({ id: data.id })
      toast.success('Draft saved')
    } catch { toast.error('Failed to save draft') }
    finally { setSaving(false) }
  }

  const schedule = async () => {
    if (!currentPost.platforms.length) { toast.error('Pick a platform to schedule to'); return }
    if (!scheduleDate) { toast.error('Pick a date and time'); return }
    setScheduling(true)
    try {
      const postData = {
        content: currentPost.content, platform: currentPost.platforms,
        status: 'scheduled', scheduled_at: new Date(scheduleDate).toISOString(),
        post_type: currentPost.postType,
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
    if (!currentPost.id) await saveDraft()
    if (!confirm(`Post now to ${currentPost.platforms.map((p) => PLATFORM_LABELS[p]).join(' + ')}?`)) return
    setPosting(true)
    try {
      await api.post(`/api/posts/${currentPost.id}/publish`, {})
      toast.success('Publishing started!')
      resetComposer()
      navigate('/')
    } catch { toast.error('Publish failed') }
    finally { setPosting(false) }
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left — Editor ─────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-y-auto p-5 gap-4 border-r border-gray-200">

          {/* Voice tabs — click to rewrite the post in that saved voice */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 shrink-0 uppercase tracking-wide">Voice:</span>
            {availableVoices.length === 0 && (
              <Link to="/voice" className="text-xs text-indigo-600 hover:underline">
                Analyse a voice profile to start writing →
              </Link>
            )}
            {availableVoices.map((p) => {
              const active = activeVoice === p
              const isRewriting = rewriting === p
              return (
                <button
                  key={p}
                  onClick={() => selectVoice(p)}
                  disabled={!!rewriting}
                  title={`Rewrite in ${PLATFORM_LABELS[p]} voice`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                    active ? 'text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                  style={active ? { backgroundColor: PLATFORM_COLORS[p], borderColor: PLATFORM_COLORS[p] } : {}}
                >
                  <PlatformIcon platform={p} size={14} className={active ? 'brightness-0 invert' : ''} />
                  {PLATFORM_LABELS[p]} voice
                  {isRewriting && <span className="ml-1 animate-pulse">…</span>}
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

          {/* Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={currentPost.content}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What's on your mind?"
              className="w-full min-h-[180px] border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none leading-relaxed"
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
              { label: 'Hashtags',   onClick: generateHashtags },
              { label: 'Score ↺',   onClick: () => scheduleScore(currentPost.content) },
              { label: 'Hooks',      onClick: generateHooks },
              { label: 'Repurpose',  onClick: () => setRepurposeModal(true) },
            ].map(({ label, onClick }) => (
              <button key={label} onClick={onClick}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50">
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Right — AI Panel ──────────────────────────────────────────────── */}
        <div className="w-80 shrink-0 flex flex-col p-5 gap-4 overflow-y-auto bg-gray-50">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>

          {/* Chat messages */}
          <div className="flex-1 space-y-3 min-h-0">
            {aiMessages.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Ask AI to write or improve your post</p>
            )}
            {aiMessages.map((msg, i) => (
              <div key={i} className={`text-sm rounded-lg p-3 ${msg.role === 'user' ? 'bg-indigo-50 text-indigo-900' : 'bg-white border border-gray-200 text-gray-800'}`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.role === 'assistant' && (
                  <button onClick={useAIDraft} className="mt-2 text-xs text-indigo-600 hover:underline">Use this draft ↑</button>
                )}
              </div>
            ))}
            {aiLoading && <div className="text-xs text-gray-400 animate-pulse">AI is writing…</div>}
          </div>

          {/* AI input — data-ai-input lets Ctrl+Shift+A focus this from anywhere */}
          <div className="flex gap-2">
            <input
              data-ai-input
              value={aiInput}
              onChange={(e) => setAIInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAIMessage() } }}
              placeholder="Ask AI to write or edit…"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <button onClick={sendAIMessage} disabled={aiLoading} className="btn-gradient text-white px-3 py-1.5 rounded-lg text-sm">→</button>
          </div>

          {/* Score card */}
          {postScore && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
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
        <button data-shortcut="save" onClick={saveDraft} disabled={saving}
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
