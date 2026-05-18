import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { formatDate } from '../lib/utils'
import { PLATFORM_COLORS, PLATFORM_LABELS } from '../lib/platformLimits'
import type { Platform } from '../lib/platformLimits'
import PlatformIcon from '../components/ui/PlatformIcon'
import { useConfirm } from '../components/ui/ConfirmDialog'

interface DraftRow {
  id: string
  content: string
  platform: Platform[]
  post_type: string
  voice_profile_id: string | null
  updated_at: string
  created_at: string
  media_assets?: { id: string; type: string }[]
}

export default function Drafts() {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const [drafts, setDrafts] = useState<DraftRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/api/posts/drafts')
      .then((r) => setDrafts(r.data))
      .catch(() => toast.error('Failed to load drafts'))
      .finally(() => setLoading(false))
  }, [])

  const open = (id: string) => navigate(`/compose?id=${id}`)

  const remove = async (id: string) => {
    if (!(await confirm({ title: 'Delete draft?', destructive: true }))) return
    const prev = drafts
    setDrafts((d) => d.filter((r) => r.id !== id))
    try {
      await api.delete(`/api/posts/${id}`)
      toast.success('Draft deleted')
    } catch {
      setDrafts(prev)
      toast.error('Failed to delete draft')
    }
  }

  const filtered = search.trim()
    ? drafts.filter((d) => d.content.toLowerCase().includes(search.toLowerCase()))
    : drafts

  if (loading) return <div className="p-6 text-gray-400 text-sm">Loading…</div>

  return (
    <div className="p-6 max-w-4xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drafts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {drafts.length} saved draft{drafts.length === 1 ? '' : 's'} — pick up where you left off.
          </p>
        </div>
        <button onClick={() => navigate('/compose')} className="btn-gradient text-white px-4 py-2 rounded-lg text-sm font-medium shrink-0">
          + New Draft
        </button>
      </div>

      {drafts.length > 0 && (
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search drafts…"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
      )}

      {drafts.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-xl p-10 text-center">
          <p className="text-sm text-gray-500 mb-3">No drafts yet. Save a draft from the composer and it'll show up here.</p>
          <button onClick={() => navigate('/compose')} className="btn-gradient text-white px-4 py-2 rounded-lg text-sm font-medium">
            + Start a draft
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">No drafts match "{search}".</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => {
            const lines = d.content.split('\n').filter(Boolean)
            const preview = lines.slice(0, 3).join(' • ').slice(0, 220)
            const mediaCount = d.media_assets?.length ?? 0
            return (
              <div key={d.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3 group hover:border-indigo-200 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {(d.platform || []).map((p) => (
                      <span key={p}
                        className="flex items-center gap-1 text-[11px] font-medium text-white px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: PLATFORM_COLORS[p] }}>
                        <PlatformIcon platform={p} size={10} className="brightness-0 invert" />
                        {PLATFORM_LABELS[p]}
                      </span>
                    ))}
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 capitalize">
                      {d.post_type}
                    </span>
                    {mediaCount > 0 && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-gray-200 text-gray-500">
                        {mediaCount} {d.post_type === 'video' ? 'video' : 'image'}{mediaCount === 1 ? '' : 's'}
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400 ml-auto">Updated {formatDate(d.updated_at)}</span>
                  </div>
                  <button onClick={() => open(d.id)}
                    className="text-sm text-gray-800 text-left leading-relaxed line-clamp-3 hover:text-indigo-700 w-full"
                  >
                    {preview || <span className="italic text-gray-400">(empty draft)</span>}
                  </button>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => open(d.id)}
                    className="text-xs px-3 py-1 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                    Edit
                  </button>
                  <button onClick={() => remove(d.id)}
                    className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200">
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
