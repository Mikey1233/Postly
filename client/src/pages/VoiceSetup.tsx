import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useShallow } from 'zustand/react/shallow'
import useAppStore from '../store/useAppStore'
import { PLATFORM_LABELS } from '../lib/platformLimits'
import type { Platform } from '../lib/platformLimits'
import PlatformIcon from '../components/ui/PlatformIcon'

const PLATFORMS: Platform[] = ['linkedin', 'x', 'facebook', 'reddit']

interface Analysis {
  tone: string[]
  hookStyle: string
  sentenceLength: string
  structure: string
  emojiUsage: string
  ctaStyle: string
  signaturePhrases: string[]
  systemPrompt: string
}

export default function VoiceSetup() {
  const { voiceProfiles, setVoiceProfile, selectedModel } = useAppStore(
    useShallow((s) => ({ voiceProfiles: s.voiceProfiles, setVoiceProfile: s.setVoiceProfile, selectedModel: s.selectedModel }))
  )
  const [activePlatform, setActivePlatform] = useState<Platform>('linkedin')
  const [sampleText, setSampleText] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const analyze = async () => {
    const posts = sampleText.split('\n\n').map((s) => s.trim()).filter(Boolean)
    if (posts.length < 3) { toast.error('Paste at least 3 posts separated by blank lines'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/api/voice/analyze', { samplePosts: posts, platform: activePlatform, model: selectedModel })
      setAnalysis(data.analysis)
      setSaved(false)
    } catch {
      toast.error('Analysis failed — try again')
    } finally {
      setLoading(false)
    }
  }

  const save = async () => {
    if (!analysis) return
    const posts = sampleText.split('\n\n').map((s) => s.trim()).filter(Boolean)
    try {
      const { data } = await api.post('/api/voice/analyze', { samplePosts: posts, platform: activePlatform, model: selectedModel })
      setVoiceProfile(activePlatform, { systemPrompt: data.system_prompt, analysis: data.analysis })
      setSaved(true)
      toast.success('Voice profile saved')
    } catch {
      toast.error('Save failed')
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Brand Voice Setup</h1>
        <p className="text-sm text-gray-500 mt-1">Teach the AI to write in your voice.</p>
      </div>

      {/* Platform tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => { setActivePlatform(p); setAnalysis(null); setSaved(false) }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activePlatform === p ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <PlatformIcon platform={p} size={16} />
            {PLATFORM_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Sample posts input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Step 1 — Paste your best {PLATFORM_LABELS[activePlatform]} posts
        </label>
        <p className="text-xs text-gray-400 mb-2">Paste 5–15 posts. Separate each with a blank line. The more you paste, the better the analysis.</p>
        <textarea
          value={sampleText}
          onChange={(e) => setSampleText(e.target.value)}
          rows={12}
          placeholder={`Post 1 content here...\n\nPost 2 content here...\n\nPost 3 content here...`}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y font-mono"
        />
      </div>

      <button
        onClick={analyze}
        disabled={loading}
        className="flex items-center gap-2 btn-gradient text-white px-5 py-2.5 rounded-lg font-medium"
      >
        {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Analyzing…</> : '🔍 Analyze My Voice'}
      </button>

      {/* Results */}
      {analysis && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Voice Profile Results</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Tone: </span>
                {analysis.tone.map((t) => <span key={t} className="inline-block bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5 text-xs mr-1">{t}</span>)}
              </div>
              <div><span className="text-gray-500">Hook style: </span><span className="font-medium">{analysis.hookStyle}</span></div>
              <div><span className="text-gray-500">Sentences: </span><span className="font-medium">{analysis.sentenceLength}</span></div>
              <div><span className="text-gray-500">Structure: </span><span className="font-medium">{analysis.structure}</span></div>
              <div><span className="text-gray-500">Emoji usage: </span><span className="font-medium">{analysis.emojiUsage}</span></div>
              <div><span className="text-gray-500">CTA style: </span><span className="font-medium">{analysis.ctaStyle}</span></div>
            </div>

            {analysis.signaturePhrases?.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-500 mb-1">Signature phrases:</p>
                <ul className="space-y-0.5">
                  {analysis.signaturePhrases.map((phrase) => (
                    <li key={phrase} className="text-sm text-gray-700">• "{phrase}"</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Generated System Prompt</p>
              <p className="text-sm text-gray-700 leading-relaxed">{analysis.systemPrompt}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={save} className="btn-gradient text-white px-5 py-2 rounded-lg text-sm font-medium">
              💾 Save Profile
            </button>
            <button onClick={() => setAnalysis(null)} className="text-gray-500 px-4 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50">
              🔄 Re-analyze
            </button>
            {saved && <span className="text-sm text-green-600 self-center">✓ Saved</span>}
          </div>
        </div>
      )}

      {/* Existing profile notice */}
      {voiceProfiles[activePlatform] && !analysis && (
        <div className="text-sm text-gray-500 bg-green-50 border border-green-200 rounded-lg p-3">
          ✓ You have a saved voice profile for {PLATFORM_LABELS[activePlatform]}. Paste new posts above and re-analyze to update it.
        </div>
      )}
    </div>
  )
}
