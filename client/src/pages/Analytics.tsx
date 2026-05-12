import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { formatDate } from '../lib/utils'
import { PLATFORM_COLORS, PLATFORM_LABELS } from '../lib/platformLimits'
import type { Platform } from '../lib/platformLimits'

interface AnalyticsRow { impressions: number; likes: number; comments: number; shares: number }
interface PostRow { id: string; content: string; platform: Platform[]; publishedAt: string; postAnalytics: AnalyticsRow[] }

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

export default function Analytics() {
  const [posts, setPosts]   = useState<PostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy]   = useState<'impressions' | 'likes' | 'date'>('date')

  useEffect(() => {
    api.get('/api/posts/history')
      .then((r) => setPosts(r.data))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [])

  const totals = posts.reduce((acc, p) => {
    p.postAnalytics?.forEach((a) => {
      acc.impressions += a.impressions || 0
      acc.likes       += a.likes || 0
      acc.comments    += a.comments || 0
    })
    return acc
  }, { impressions: 0, likes: 0, comments: 0 })

  const sorted = [...posts].sort((a, b) => {
    const ga = (field: keyof AnalyticsRow) => a.postAnalytics?.[0]?.[field] || 0
    const gb = (field: keyof AnalyticsRow) => b.postAnalytics?.[0]?.[field] || 0
    if (sortBy === 'impressions') return gb('impressions') - ga('impressions')
    if (sortBy === 'likes')       return gb('likes') - ga('likes')
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  })

  const maxImp = Math.max(...posts.map((p) => p.postAnalytics?.[0]?.impressions || 0), 1)

  if (loading) return <div className="p-6 text-gray-400">Loading…</div>

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Published Posts"   value={posts.length} />
        <StatCard label="Total Impressions" value={totals.impressions.toLocaleString()} />
        <StatCard label="Total Likes"       value={totals.likes.toLocaleString()} />
        <StatCard label="Total Comments"    value={totals.comments.toLocaleString()} />
      </div>

      {sorted.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Top Posts by Impressions</h2>
          <div className="space-y-2">
            {sorted.slice(0, 8).map((post) => {
              const imp = post.postAnalytics?.[0]?.impressions || 0
              return (
                <div key={post.id} className="flex items-center gap-3">
                  <p className="text-xs text-gray-500 w-40 truncate shrink-0">{post.content.slice(0, 35)}…</p>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                    <div className="h-2.5 rounded-full transition-all" style={{ width: `${(imp / maxImp) * 100}%`, backgroundColor: PLATFORM_COLORS[post.platform[0]] }} />
                  </div>
                  <p className="text-xs text-gray-500 w-14 text-right">{imp.toLocaleString()}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Published Posts</h2>
          <div className="flex gap-1">
            {(['date', 'impressions', 'likes'] as const).map((s) => (
              <button key={s} onClick={() => setSortBy(s)}
                className={`text-xs px-3 py-1 rounded-lg ${sortBy === s ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {sorted.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">No published posts yet</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {sorted.map((post) => {
              const a = post.postAnalytics?.[0] || {} as Partial<AnalyticsRow>
              return (
                <div key={post.id} className="px-5 py-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {post.platform.map((p) => (
                        <span key={p} className="text-xs text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: PLATFORM_COLORS[p] }}>{PLATFORM_LABELS[p]}</span>
                      ))}
                      <span className="text-xs text-gray-400">{formatDate(post.publishedAt)}</span>
                    </div>
                    <p className="text-sm text-gray-700 truncate">{post.content}</p>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500 shrink-0">
                    <div className="text-center"><p className="font-medium text-gray-900">{a.impressions ?? '—'}</p><p>Views</p></div>
                    <div className="text-center"><p className="font-medium text-gray-900">{a.likes ?? '—'}</p><p>Likes</p></div>
                    <div className="text-center"><p className="font-medium text-gray-900">{a.comments ?? '—'}</p><p>Comments</p></div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
