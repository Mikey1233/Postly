import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useShallow } from 'zustand/react/shallow'
import useAppStore from '../store/useAppStore'
import type { VoiceProfile } from '../store/useAppStore'
import { PLATFORM_LABELS, PLATFORM_COLORS } from '../lib/platformLimits'
import type { Platform } from '../lib/platformLimits'
import PlatformIcon from '../components/ui/PlatformIcon'

const PLATFORMS: Platform[] = ['linkedin', 'x', 'facebook', 'reddit']

interface Analysis {
  tone?: string[]
  hookStyle?: string
  sentenceLength?: string
  structure?: string
  emojiUsage?: string
  ctaStyle?: string
  signaturePhrases?: string[]
  systemPrompt?: string
}

interface ServerVoiceRow {
  id: string
  name: string
  platform: Platform
  system_prompt: string
  analysis: Analysis
  is_default: boolean
}

function rowToProfile(row: ServerVoiceRow): VoiceProfile {
  return {
    id: row.id,
    name: row.name || `${row.platform} voice`,
    platform: row.platform,
    systemPrompt: row.system_prompt,
    analysis: row.analysis as unknown as Record<string, unknown>,
    isDefault: !!row.is_default,
  }
}

export default function VoiceSetup() {
  const { voiceProfiles, upsertVoiceProfile, removeVoiceProfile, selectedModel } = useAppStore(
    useShallow((s) => ({
      voiceProfiles:      s.voiceProfiles,
      upsertVoiceProfile: s.upsertVoiceProfile,
      removeVoiceProfile: s.removeVoiceProfile,
      selectedModel:      s.selectedModel,
    }))
  )

  // Form state — open when creating a new voice OR editing an existing one.
  const [formOpen, setFormOpen]         = useState(false)
  const [editingId, setEditingId]       = useState<string | null>(null)
  const [formPlatform, setFormPlatform] = useState<Platform>('linkedin')
  const [formName, setFormName]         = useState('')
  const [sampleText, setSampleText]     = useState('')
  const [analysis, setAnalysis]         = useState<Analysis | null>(null)
  const [loading, setLoading]           = useState(false)
  const [saving, setSaving]             = useState(false)

  // Inline rename
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const openNew = () => {
    setEditingId(null)
    setFormPlatform('linkedin')
    setFormName('')
    setSampleText('')
    setAnalysis(null)
    setFormOpen(true)
  }

  const openEdit = (v: VoiceProfile) => {
    setEditingId(v.id)
    setFormPlatform(v.platform)
    setFormName(v.name)
    setSampleText('')
    setAnalysis(v.analysis as unknown as Analysis)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setAnalysis(null)
  }

  const analyze = async () => {
    const posts = sampleText.split('\n\n').map((s) => s.trim()).filter(Boolean)
    if (posts.length < 3) { toast.error('Paste at least 3 posts separated by blank lines'); return }
    setLoading(true)
    try {
      const { data } = await api.post<ServerVoiceRow>('/api/voice/analyze', {
        samplePosts: posts,
        platform: formPlatform,
        model: selectedModel,
        name: formName.trim() || undefined,
        voiceId: editingId || undefined,
      })
      upsertVoiceProfile(rowToProfile(data))
      setAnalysis(data.analysis)
      setEditingId(data.id)
      toast.success(editingId ? 'Voice updated' : 'Voice created')
    } catch {
      toast.error('Analysis failed — try again')
    } finally {
      setLoading(false)
    }
  }

  const startRename = (v: VoiceProfile) => {
    setRenamingId(v.id)
    setRenameValue(v.name)
  }

  const saveRename = async (v: VoiceProfile) => {
    const name = renameValue.trim()
    setRenamingId(null)
    if (!name || name === v.name) return
    setSaving(true)
    try {
      const { data } = await api.put<ServerVoiceRow>(`/api/voice/${v.id}`, { name })
      upsertVoiceProfile(rowToProfile(data))
      toast.success('Renamed')
    } catch {
      toast.error('Rename failed')
    } finally { setSaving(false) }
  }

  const makeDefault = async (v: VoiceProfile) => {
    try {
      const { data } = await api.put<ServerVoiceRow>(`/api/voice/${v.id}`, { isDefault: true })
      // Refresh the whole list — other voices may have lost their default flag.
      const refreshed = await api.get<ServerVoiceRow[]>('/api/voice')
      refreshed.data.forEach((r) => upsertVoiceProfile(rowToProfile(r)))
      upsertVoiceProfile(rowToProfile(data))
      toast.success(`${PLATFORM_LABELS[v.platform]} default → ${v.name}`)
    } catch { toast.error('Failed to set default') }
  }

  const remove = async (v: VoiceProfile) => {
    if (!confirm(`Delete "${v.name}"? Posts linked to this voice keep their content but lose the voice tag.`)) return
    try {
      await api.delete(`/api/voice/${v.id}`)
      removeVoiceProfile(v.id)
      toast.success('Voice deleted')
    } catch { toast.error('Delete failed') }
  }

  // Group voices by platform for the listing.
  const grouped = PLATFORMS.map((p) => ({
    platform: p,
    voices: voiceProfiles.filter((v) => v.platform === p),
  })).filter((g) => g.voices.length > 0)

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand Voices</h1>
          <p className="text-sm text-gray-500 mt-1">
            Name and save multiple voices. Each one is tagged with the platform it was sourced from.
            The composer lets you pick which voice to write in.
          </p>
        </div>
        <button onClick={openNew} className="btn-gradient text-white px-4 py-2 rounded-lg text-sm font-medium shrink-0">
          + New Voice
        </button>
      </div>

      {/* Saved voices list */}
      {voiceProfiles.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-500 mb-3">No voices yet. Create one to teach the AI how you write.</p>
          <button onClick={openNew} className="btn-gradient text-white px-4 py-2 rounded-lg text-sm font-medium">
            + Create your first voice
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(({ platform, voices }) => (
            <section key={platform} className="space-y-2">
              <div className="flex items-center gap-2">
                <PlatformIcon platform={platform} size={16} />
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{PLATFORM_LABELS[platform]}</h2>
              </div>
              <div className="space-y-2">
                {voices.map((v) => (
                  <div key={v.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                    <span
                      className="flex items-center gap-1 text-[11px] font-medium text-white px-2 py-0.5 rounded-full shrink-0"
                      style={{ backgroundColor: PLATFORM_COLORS[v.platform] }}
                    >
                      <PlatformIcon platform={v.platform} size={11} className="brightness-0 invert" />
                      {PLATFORM_LABELS[v.platform]}
                    </span>

                    {renamingId === v.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => saveRename(v)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRename(v)
                          if (e.key === 'Escape') setRenamingId(null)
                        }}
                        disabled={saving}
                        className="flex-1 text-sm border-b border-gray-300 focus:outline-none focus:border-indigo-400"
                      />
                    ) : (
                      <button onClick={() => startRename(v)}
                        className="flex-1 text-left text-sm font-medium text-gray-800 hover:text-indigo-600 truncate"
                        title="Click to rename"
                      >
                        {v.name}
                      </button>
                    )}

                    {v.isDefault && (
                      <span className="text-[10px] font-medium uppercase tracking-wide bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2 py-0.5 shrink-0">
                        Default
                      </span>
                    )}

                    <div className="flex items-center gap-1 shrink-0">
                      {!v.isDefault && (
                        <button onClick={() => makeDefault(v)} className="text-xs text-gray-400 hover:text-indigo-600 px-2 py-1">
                          Set default
                        </button>
                      )}
                      <button onClick={() => openEdit(v)} className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1">
                        Re-analyze
                      </button>
                      <button onClick={() => remove(v)} className="text-xs text-gray-400 hover:text-red-500 px-2 py-1">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Create / re-analyze form */}
      {formOpen && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">
              {editingId ? 'Re-analyze voice' : 'Create new voice'}
            </h2>
            <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>

          {/* Platform tabs */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Source platform</p>
            <div className="flex gap-1 border-b border-gray-200">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => !editingId && setFormPlatform(p)}
                  disabled={!!editingId}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                    formPlatform === p ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <PlatformIcon platform={p} size={16} />
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
            {editingId && (
              <p className="text-xs text-gray-400 mt-1">Platform is locked when re-analyzing an existing voice.</p>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Voice name</label>
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder={`e.g. "Thought-leader ${PLATFORM_LABELS[formPlatform]}"`}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Sample posts */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sample posts
            </label>
            <p className="text-xs text-gray-400 mb-2">Paste 5–15 of your best posts. Separate each with a blank line.</p>
            <textarea
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              rows={10}
              placeholder={`Post 1 content here...\n\nPost 2 content here...\n\nPost 3 content here...`}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y font-mono"
            />
          </div>

          <button
            onClick={analyze}
            disabled={loading}
            className="flex items-center gap-2 btn-gradient text-white px-5 py-2.5 rounded-lg font-medium"
          >
            {loading
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Analyzing…</>
              : editingId ? '🔄 Re-analyze & save' : '🔍 Analyze & save'}
          </button>

          {/* Results preview */}
          {analysis && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-gray-800">Voice analysis</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {analysis.tone && (
                  <div><span className="text-gray-500">Tone: </span>
                    {analysis.tone.map((t) => <span key={t} className="inline-block bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5 text-xs mr-1">{t}</span>)}
                  </div>
                )}
                {analysis.hookStyle      && <div><span className="text-gray-500">Hook: </span><span className="font-medium">{analysis.hookStyle}</span></div>}
                {analysis.sentenceLength && <div><span className="text-gray-500">Sentences: </span><span className="font-medium">{analysis.sentenceLength}</span></div>}
                {analysis.structure      && <div><span className="text-gray-500">Structure: </span><span className="font-medium">{analysis.structure}</span></div>}
                {analysis.emojiUsage     && <div><span className="text-gray-500">Emoji: </span><span className="font-medium">{analysis.emojiUsage}</span></div>}
                {analysis.ctaStyle       && <div><span className="text-gray-500">CTA: </span><span className="font-medium">{analysis.ctaStyle}</span></div>}
              </div>

              {analysis.signaturePhrases && analysis.signaturePhrases.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Signature phrases:</p>
                  <ul className="space-y-0.5">
                    {analysis.signaturePhrases.map((phrase) => (
                      <li key={phrase} className="text-sm text-gray-700">• "{phrase}"</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.systemPrompt && (
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Generated system prompt</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{analysis.systemPrompt}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
