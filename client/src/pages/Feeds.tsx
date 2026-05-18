import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import axios from 'axios'
import api from '../lib/api'
import useAppStore from '../store/useAppStore'
import { useConfirm } from '../components/ui/ConfirmDialog'

type Category = 'ai' | 'tech' | 'software'

interface FeedItem {
  id: string
  title: string
  url: string
  summary: string | null
  author: string | null
  imageUrl: string | null
  publishedAt: string | null
  sourceId: string
  sourceName: string
  category: Category
}

interface FeedSource {
  id: string
  name: string
  url: string
  category: Category
  enabled: boolean
  last_polled_at: string | null
  last_error: string | null
}

const CATEGORY_LABELS: Record<Category, string> = { ai: 'AI', tech: 'Tech', software: 'Software' }
const CATEGORIES: Category[] = ['ai', 'tech', 'software']

function serverError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined
    if (data?.error) return data.error
  }
  return fallback
}

// Build the AI-context string that goes into currentPost.context when the user
// clicks "Draft post". Threaded into every AI call from the composer so
// suggestions are grounded in the article the user picked.
function buildContext(item: FeedItem): string {
  const lines = [
    `Article: ${item.title}`,
    `Source: ${item.sourceName}`,
    `URL: ${item.url}`,
  ]
  if (item.summary) lines.push('', item.summary)
  return lines.join('\n')
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'recent'
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }) }
  catch { return 'recent' }
}

// ── Sources modal ────────────────────────────────────────────────────────────

interface SourcesModalProps {
  sources: FeedSource[]
  onClose: () => void
  onChange: () => void
}

function SourcesModal({ sources, onClose, onChange }: SourcesModalProps) {
  const confirm = useConfirm()
  const [name, setName]         = useState('')
  const [url, setUrl]           = useState('')
  const [category, setCategory] = useState<Category>('tech')
  const [saving, setSaving]     = useState(false)
  const [polling, setPolling]   = useState(false)

  const add = async () => {
    if (!name.trim() || !url.trim()) { toast.error('Name and URL required'); return }
    setSaving(true)
    try {
      await api.post('/api/feeds/sources', { name: name.trim(), url: url.trim(), category })
      setName(''); setUrl(''); setCategory('tech')
      toast.success('Source added — polling now')
      onChange()
      pollNow()
    } catch (err) {
      toast.error(serverError(err, 'Failed to add source'))
    } finally { setSaving(false) }
  }

  const toggleEnabled = async (s: FeedSource) => {
    try {
      await api.put(`/api/feeds/sources/${s.id}`, { enabled: !s.enabled })
      onChange()
    } catch { toast.error('Failed to toggle source') }
  }

  const remove = async (s: FeedSource) => {
    if (!(await confirm({ title: `Remove "${s.name}"?`, body: 'All cached items from this source will be deleted.', destructive: true }))) return
    try {
      await api.delete(`/api/feeds/sources/${s.id}`)
      onChange()
    } catch { toast.error('Failed to remove source') }
  }

  const pollNow = async () => {
    setPolling(true)
    try {
      await api.post('/api/feeds/poll')
      toast.success('Polled all sources')
      onChange()
    } catch { toast.error('Poll failed') }
    finally { setPolling(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Feed sources</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Add new source */}
          <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Add source</p>
            <div className="grid grid-cols-2 gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Source name (e.g. Stratechery)"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <select value={category} onChange={(e) => setCategory(e.target.value as Category)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <input value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="RSS / Atom feed URL"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <div className="flex justify-between items-center pt-1">
              <button onClick={pollNow} disabled={polling}
                className="text-xs text-gray-500 hover:text-indigo-600 disabled:opacity-50">
                {polling ? 'Polling…' : 'Poll all sources now'}
              </button>
              <button onClick={add} disabled={saving}
                className="btn-gradient text-white text-sm font-medium px-4 py-1.5 rounded-lg disabled:opacity-60">
                {saving ? 'Adding…' : 'Add source'}
              </button>
            </div>
          </div>

          {/* Existing sources */}
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
            {sources.length === 0 ? (
              <p className="text-sm text-gray-400 p-6 text-center">No sources yet.</p>
            ) : sources.map((s) => (
              <div key={s.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-gray-900 truncate">{s.name}</p>
                  <p className="text-xs text-gray-500 truncate">{s.url}</p>
                  {s.last_error && <p className="text-xs text-red-500 mt-0.5 truncate">⚠ {s.last_error}</p>}
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wide bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 shrink-0">
                  {CATEGORY_LABELS[s.category]}
                </span>
                <button onClick={() => toggleEnabled(s)}
                  className={`text-xs px-2 py-1 rounded shrink-0 ${
                    s.enabled ? 'text-indigo-600 hover:bg-indigo-50' : 'text-gray-400 hover:bg-gray-100'
                  }`}>
                  {s.enabled ? 'On' : 'Off'}
                </button>
                <button onClick={() => remove(s)}
                  className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 shrink-0">Remove</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Feeds() {
  const navigate       = useNavigate()
  const setCurrentPost = useAppStore((s) => s.setCurrentPost)
  const [items, setItems]       = useState<FeedItem[]>([])
  const [sources, setSources]   = useState<FeedSource[]>([])
  const [filter, setFilter]     = useState<Category | 'all'>('all')
  const [loading, setLoading]   = useState(true)
  const [showSources, setShowSources] = useState(false)

  const loadItems = useCallback(async (cat: Category | 'all') => {
    setLoading(true)
    try {
      const { data } = await api.get<FeedItem[]>('/api/feeds/items', {
        params: cat === 'all' ? { limit: 80 } : { category: cat, limit: 80 },
      })
      setItems(data)
    } catch {
      toast.error('Failed to load feeds')
    } finally { setLoading(false) }
  }, [])

  const loadSources = useCallback(async () => {
    try {
      const { data } = await api.get<FeedSource[]>('/api/feeds/sources')
      setSources(data)
    } catch { /* silent — modal still works empty */ }
  }, [])

  useEffect(() => { loadItems(filter) }, [filter, loadItems])
  useEffect(() => { loadSources() }, [loadSources])

  const counts = useMemo(() => {
    const c: Record<Category | 'all', number> = { all: items.length, ai: 0, tech: 0, software: 0 }
    for (const it of items) c[it.category] = (c[it.category] || 0) + 1
    return c
  }, [items])

  const draftPost = (item: FeedItem) => {
    setCurrentPost({ context: buildContext(item), content: '' })
    toast.success('Article loaded as context — ask the AI to write')
    navigate('/compose')
  }

  return (
    <div className="p-6 max-w-4xl space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feeds</h1>
          <p className="text-sm text-gray-500 mt-1">
            Latest in AI, tech & software. Click <span className="font-medium">Draft post</span> on any article to load it as context in the composer.
          </p>
        </div>
        <button onClick={() => setShowSources(true)}
          className="text-sm text-gray-600 hover:text-indigo-600 border border-gray-200 hover:border-indigo-200 px-3 py-1.5 rounded-lg shrink-0">
          Manage sources
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {(['all', ...CATEGORIES] as const).map((cat) => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              filter === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-700'
            }`}>
            {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
            <span className={`ml-1.5 ${filter === cat ? 'text-indigo-200' : 'text-gray-400'}`}>
              {counts[cat] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Items */}
      {loading ? (
        <p className="text-sm text-gray-400 py-10 text-center">Loading feeds…</p>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-200 border-dashed rounded-xl p-10 text-center">
          <p className="text-sm text-gray-500">No items yet. Sources are polled every 20 minutes.</p>
          <button onClick={() => setShowSources(true)} className="mt-2 text-xs text-indigo-600 hover:underline">
            Manage sources →
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <article key={item.id} className="bg-white border border-gray-200 hover:border-indigo-200 rounded-xl p-4 transition-colors">
              <div className="flex items-start gap-3">
                {item.imageUrl && (
                  <img src={item.imageUrl} alt="" loading="lazy"
                    className="w-20 h-20 object-cover rounded-lg shrink-0 bg-gray-50"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-1">
                    <span className="font-medium text-gray-700">{item.sourceName}</span>
                    <span>·</span>
                    <span>{relativeTime(item.publishedAt)}</span>
                    <span className="ml-auto text-[10px] font-medium uppercase tracking-wide bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                      {CATEGORY_LABELS[item.category]}
                    </span>
                  </div>
                  <a href={item.url} target="_blank" rel="noopener noreferrer"
                    className="block font-semibold text-gray-900 hover:text-indigo-700 leading-snug">
                    {item.title}
                  </a>
                  {item.summary && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.summary}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <button onClick={() => draftPost(item)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline">
                      Draft post →
                    </button>
                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-gray-400 hover:text-gray-700">
                      Open article
                    </a>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {showSources && (
        <SourcesModal
          sources={sources}
          onClose={() => setShowSources(false)}
          onChange={() => { loadSources(); loadItems(filter) }}
        />
      )}
    </div>
  )
}
