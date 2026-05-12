import { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api, { streamSSE } from '../lib/api'
import { PLATFORM_LIMITS, PLATFORM_LABELS, PLATFORM_COLORS } from '../lib/platformLimits'
import type { Platform } from '../lib/platformLimits'
import { useShallow } from 'zustand/react/shallow'
import useAppStore from '../store/useAppStore'
import MediaUploadZone from '../components/media/MediaUploadZone'
import PlatformIcon from '../components/ui/PlatformIcon'

const ALL_PLATFORMS: Platform[] = ['linkedin', 'x', 'facebook', 'reddit']

interface ScoreData { hookStrength: number; clarity: number; structure: number; predictedEngagement: number; suggestions: string[] }
interface AIMessage { role: 'user' | 'assistant'; content: string }

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

  const { currentPost, setPostContent, togglePlatform, addMediaAsset, removeMediaAsset,
    reorderMediaAssets, setCurrentPost, resetComposer, selectedModel, setSelectedModel,
    postScore, setPostScore } = useAppStore(
    useShallow((s) => ({
      currentPost: s.currentPost,
      setPostContent: s.setPostContent,
      togglePlatform: s.togglePlatform,
      addMediaAsset: s.addMediaAsset,
      removeMediaAsset: s.removeMediaAsset,
      reorderMediaAssets: s.reorderMediaAssets,
      setCurrentPost: s.setCurrentPost,
      resetComposer: s.resetComposer,
      selectedModel: s.selectedModel,
      setSelectedModel: s.setSelectedModel,
      postScore: s.postScore,
      setPostScore: s.setPostScore,
    }))
  )

  const [models, setModels]           = useState<{ id: string; name: string }[]>([])
  const [ghostText, setGhostText]     = useState('')
  const [aiMessages, setAIMessages]   = useState<AIMessage[]>([])
  const [aiInput, setAIInput]         = useState('')
  const [aiLoading, setAILoading]     = useState(false)
  const [saving, setSaving]           = useState(false)
  const [scheduling, setScheduling]   = useState(false)
  const [posting, setPosting]         = useState(false)
  const [scheduleModal, setScheduleModal] = useState(false)
  const [scheduleDate, setScheduleDate]   = useState('')

  useEffect(() => {
    api.get('/api/ai/models').then((r) => setModels(r.data.models)).catch(() => {})
  }, [])

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  const triggerAutocomplete = useCallback((text: string) => {
    if (autocompleteTimer.current) clearTimeout(autocompleteTimer.current)
    if (autocompleteCtrl.current) { autocompleteCtrl.current.abort() }
    setGhostText('')
    if (text.length < 20) return

    autocompleteTimer.current = setTimeout(async () => {
      autocompleteCtrl.current = new AbortController()
      try {
        let suggestion = ''
        await streamSSE(
          '/api/ai/autocomplete',
          { text: text.slice(-300), platform: currentPost.platforms[0] || 'linkedin', model: selectedModel },
          (chunk) => { suggestion += chunk; setGhostText(suggestion) },
          autocompleteCtrl.current.signal,
        )
      } catch (err: unknown) {
        if (!(err instanceof Error) || err.name !== 'AbortError') { /* silent */ }
      }
    }, 500)
  }, [currentPost.platforms, selectedModel])

  const scheduleScore = useCallback((content: string) => {
    if (scoreTimer.current) clearTimeout(scoreTimer.current)
    if (content.length < 50) { setPostScore(null); return }
    scoreTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.post<ScoreData>('/api/ai/score', { content, platform: currentPost.platforms[0] || 'linkedin' })
        setPostScore(data)
      } catch { /* silent */ }
    }, 1500)
  }, [currentPost.platforms, setPostScore])

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
    if (e.key === 'Escape') { setGhostText('') }
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
        { topic: aiInput, platform: currentPost.platforms[0] || 'linkedin', model: selectedModel },
        (chunk) => {
          response += chunk
          setAIMessages((prev) => {
            const msgs = [...prev]
            const last = msgs[msgs.length - 1]
            if (last?.role === 'assistant') { msgs[msgs.length - 1] = { role: 'assistant', content: response } }
            else { msgs.push({ role: 'assistant', content: response }) }
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

  const generateHashtags = async () => {
    if (!currentPost.content) { toast.error('Write a post first'); return }
    try {
      const { data } = await api.post('/api/ai/hashtags', { content: currentPost.content, platform: currentPost.platforms[0] })
      const tags: string[] = data.hashtags
      setPostContent(currentPost.content + '\n\n' + tags.join(' '))
      toast.success('Hashtags added')
    } catch { toast.error('Failed to generate hashtags') }
  }

  const saveDraft = async () => {
    setSaving(true)
    try {
      const { data } = await api.post('/api/posts', { content: currentPost.content, platform: currentPost.platforms, status: 'draft', post_type: currentPost.postType })
      setCurrentPost({ id: data.id })
      toast.success('Draft saved')
    } catch { toast.error('Failed to save draft') }
    finally { setSaving(false) }
  }

  const schedule = async () => {
    if (!scheduleDate) { toast.error('Pick a date and time'); return }
    setScheduling(true)
    try {
      const postData = { content: currentPost.content, platform: currentPost.platforms, status: 'scheduled', scheduled_at: new Date(scheduleDate).toISOString(), post_type: currentPost.postType }
      if (currentPost.id) { await api.put(`/api/posts/${currentPost.id}`, postData) }
      else { const { data } = await api.post('/api/posts', postData); setCurrentPost({ id: data.id }) }
      toast.success('Post scheduled')
      setScheduleModal(false)
    } catch { toast.error('Failed to schedule') }
    finally { setScheduling(false) }
  }

  const postNow = async () => {
    if (!currentPost.id) { await saveDraft() }
    if (!confirm('Post now to all selected platforms?')) return
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
      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — Editor */}
        <div className="flex-1 flex flex-col overflow-y-auto p-5 gap-4 border-r border-gray-200">
          {/* Platform chips */}
          <div className="flex gap-2 flex-wrap">
            {ALL_PLATFORMS.map((p) => {
              const active = currentPost.platforms.includes(p)
              return (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${active ? 'text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  style={active ? { backgroundColor: PLATFORM_COLORS[p], borderColor: PLATFORM_COLORS[p] } : {}}
                >
                  <PlatformIcon platform={p} size={14} className={active ? 'brightness-0 invert' : ''} />
                  {PLATFORM_LABELS[p]}
                </button>
              )
            })}
          </div>

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

          {/* Media upload */}
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
              { label: 'Hashtags', onClick: generateHashtags },
              { label: 'Score ↺', onClick: () => scheduleScore(currentPost.content) },
              { label: 'Carousel ↗', onClick: () => navigate('/compose/carousel') },
            ].map(({ label, onClick }) => (
              <button key={label} onClick={onClick} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50">
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Right — AI Panel */}
        <div className="w-80 shrink-0 flex flex-col p-5 gap-4 overflow-y-auto bg-gray-50">
          {/* Model + Voice */}
          <div className="flex flex-col gap-2">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

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

          {/* AI input */}
          <div className="flex gap-2">
            <input
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

      {/* Bottom bar */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-t border-gray-200">
        <button onClick={saveDraft} disabled={saving} className="border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-60">
          {saving ? 'Saving…' : 'Save Draft'}
        </button>
        <button onClick={() => setScheduleModal(true)} className="btn-gradient-indigo-outline border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium">
          Schedule
        </button>
        <button onClick={postNow} disabled={posting || !currentPost.content} className="btn-gradient text-white px-5 py-2 rounded-lg text-sm font-medium ml-auto">
          {posting ? 'Posting…' : 'Post Now'}
        </button>
      </div>

      {/* Schedule modal */}
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
              <button onClick={schedule} disabled={scheduling} className="flex-1 btn-gradient text-white px-4 py-2 rounded-lg text-sm font-medium">
                {scheduling ? 'Scheduling…' : 'Confirm'}
              </button>
              <button onClick={() => setScheduleModal(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
