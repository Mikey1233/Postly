import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { formatDate, timeAgo } from '../lib/utils'
import { PLATFORM_COLORS, PLATFORM_LABELS } from '../lib/platformLimits'
import type { Platform } from '../lib/platformLimits'
import { useShallow } from 'zustand/react/shallow'
import useAppStore from '../store/useAppStore'
import PlatformIcon from '../components/ui/PlatformIcon'

interface UpcomingPost { id: string; content: string; platform: Platform[]; scheduledAt: string; status: string }
interface PlatformStat { platform: Platform; impressions: number; engagement: number }

export default function Dashboard() {
  const navigate = useNavigate()
  const { setPlatformConnections, platformConnections } = useAppStore(
    useShallow((s) => ({ setPlatformConnections: s.setPlatformConnections, platformConnections: s.platformConnections }))
  )

  const [upcoming, setUpcoming]   = useState<UpcomingPost[]>([])
  const [failed, setFailed]       = useState<UpcomingPost[]>([])
  const [stats, setStats]         = useState({ totalPosts: 0, totalCarousels: 0, aiDrafts: 0 })
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/api/platforms/status').then((r) => setPlatformConnections(r.data)),
      api.get('/api/posts/scheduled').then((r) => setUpcoming(r.data.slice(0, 6))),
    ])
      .catch(() => toast.error('Failed to load dashboard data'))
      .finally(() => setLoading(false))
  }, [setPlatformConnections])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const connectedCount = Object.values(platformConnections).filter((c) => c?.connected).length

  if (loading) return <div className="p-6 text-gray-400">Loading…</div>

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{greeting} 👋</h1>
        <p className="text-sm text-gray-500 mt-0.5">{connectedCount} platform{connectedCount !== 1 ? 's' : ''} connected</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Scheduled', value: upcoming.length },
          { label: 'Platforms', value: connectedCount },
          { label: 'Total Posts', value: stats.totalPosts },
          { label: 'Carousels', value: stats.totalCarousels },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Failed posts alert */}
      {failed.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-red-700 font-medium">⚠ {failed.length} post{failed.length !== 1 ? 's' : ''} failed to publish</p>
          <button onClick={() => navigate('/analytics')} className="text-sm text-red-600 underline">View & Retry</button>
        </div>
      )}

      {/* Upcoming posts */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-3">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-400">No scheduled posts. <button onClick={() => navigate('/compose')} className="text-indigo-600 underline">Write one?</button></p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((post) => (
              <div key={post.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {post.platform.map((p) => (
                      <span key={p} className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: PLATFORM_COLORS[p] }}>{PLATFORM_LABELS[p]}</span>
                    ))}
                    <span className="text-xs text-gray-400">{formatDate(post.scheduledAt, 'MMM d, h:mm a')}</span>
                  </div>
                  <p className="text-sm text-gray-700 truncate">{post.content}</p>
                </div>
                <button onClick={() => navigate('/compose')} className="text-xs text-indigo-600 hover:underline shrink-0">Edit</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick compose */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="font-semibold text-gray-800 mb-3">Quick Compose</h2>
        <div className="flex gap-2">
          <input
            placeholder="What do you want to post about?"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            onKeyDown={(e) => { if (e.key === 'Enter') navigate('/compose') }}
          />
          <button
            onClick={() => navigate('/compose')}
            className="btn-gradient text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Compose
          </button>
        </div>
      </div>

      {/* Platform status */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-3">Platforms</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['linkedin', 'x', 'facebook', 'reddit'] as Platform[]).map((p) => {
            const conn = platformConnections[p]
            return (
              <div key={p} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-2.5">
                <PlatformIcon platform={p} size={22} className={conn?.connected ? '' : 'opacity-40 grayscale'} />
                <div>
                  <p className="text-sm font-medium text-gray-800">{PLATFORM_LABELS[p]}</p>
                  <p className="text-xs text-gray-400">
                    {conn?.connected ? (conn.state === 'expiring' ? '⚠ Expiring soon' : conn.accountName || 'Connected') : 'Not connected'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
