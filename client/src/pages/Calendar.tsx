import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday,
  addMonths, subMonths, startOfWeek, endOfWeek, formatDistanceToNow, isPast,
} from 'date-fns'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { PLATFORM_COLORS, PLATFORM_LABELS } from '../lib/platformLimits'
import type { Platform } from '../lib/platformLimits'
import PlatformIcon from '../components/ui/PlatformIcon'
import { useConfirm } from '../components/ui/ConfirmDialog'

interface MediaAssetRow {
  id: string
  type: 'image' | 'video' | 'gif'
  thumbnail_path?: string | null
}

interface Post {
  id: string
  content: string
  platform: Platform[]
  scheduled_at: string
  status: string
  post_type: 'text' | 'image' | 'video'
  ai_generated?: boolean
  voice_profile_id?: string | null
  media_assets?: MediaAssetRow[]
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  publishing: 'bg-amber-50 text-amber-700 border-amber-200',
  failed:     'bg-red-50 text-red-700 border-red-200',
  partial:    'bg-orange-50 text-orange-700 border-orange-200',
}

export default function Calendar() {
  const navigate = useNavigate()
  const confirm  = useConfirm()
  const [month, setMonth]       = useState(new Date())
  const [posts, setPosts]       = useState<Post[]>([])
  const [selected, setSelected] = useState<Post | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    api.get('/api/posts/scheduled')
      .then((r) => setPosts(r.data))
      .catch(() => toast.error('Failed to load posts'))
      .finally(() => setLoading(false))
  }, [])

  const gridStart = startOfWeek(startOfMonth(month))
  const gridEnd   = endOfWeek(endOfMonth(month))
  const days      = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const postsOnDay = (day: Date) =>
    posts.filter((p) => p.scheduled_at && isSameDay(new Date(p.scheduled_at), day))

  return (
    <div className="p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setMonth((m) => subMonths(m, 1))} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">←</button>
          <span className="text-sm font-medium text-gray-700 min-w-[120px] text-center">{format(month, 'MMMM yyyy')}</span>
          <button onClick={() => setMonth((m) => addMonths(m, 1))} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">→</button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-7 mb-1">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
              <div key={d} className="text-xs font-medium text-gray-400 text-center py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-xl overflow-hidden">
            {days.map((day) => {
              const dayPosts = postsOnDay(day)
              const inMonth = day.getMonth() === month.getMonth()
              return (
                <div key={day.toISOString()} className={`bg-white min-h-[90px] p-1.5 ${!inMonth ? 'opacity-40' : ''} ${isToday(day) ? 'ring-2 ring-indigo-400 ring-inset' : ''}`}>
                  <p className={`text-xs font-medium mb-1 ${isToday(day) ? 'text-indigo-600' : 'text-gray-500'}`}>{format(day, 'd')}</p>
                  <div className="space-y-0.5">
                    {dayPosts.slice(0, 3).map((post) => (
                      <button key={post.id} onClick={() => setSelected(post)}
                        className="w-full text-left text-xs rounded px-1 py-0.5 truncate text-white hover:opacity-90"
                        style={{ backgroundColor: PLATFORM_COLORS[post.platform[0]] }}>
                        {post.content.slice(0, 25)}
                      </button>
                    ))}
                    {dayPosts.length > 3 && <p className="text-xs text-gray-400">+{dayPosts.length - 3} more</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {selected && (() => {
          const when      = new Date(selected.scheduled_at)
          const mediaCount = selected.media_assets?.length ?? 0
          const statusCls  = STATUS_STYLES[selected.status] || 'bg-gray-50 text-gray-600 border-gray-200'
          const overdue   = isPast(when) && selected.status === 'scheduled'
          return (
            <div className="w-80 bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 overflow-y-auto scrollbar-slim shrink-0">
              {/* Header — platforms + close */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1.5 flex-wrap">
                  {selected.platform.map((p) => (
                    <span key={p}
                      className="flex items-center gap-1 text-xs text-white px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: PLATFORM_COLORS[p] }}>
                      <PlatformIcon platform={p} size={11} className="brightness-0 invert" />
                      {PLATFORM_LABELS[p]}
                    </span>
                  ))}
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
              </div>

              {/* Metadata badges */}
              <div className="flex flex-wrap gap-1.5">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusCls} capitalize`}>
                  {selected.status}
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-gray-200 text-gray-600 capitalize">
                  {selected.post_type}
                </span>
                {mediaCount > 0 && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-gray-200 text-gray-600">
                    {mediaCount} {selected.post_type === 'video' ? 'video' : 'image'}{mediaCount === 1 ? '' : 's'}
                  </span>
                )}
                {selected.ai_generated && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-indigo-200 text-indigo-700 bg-indigo-50">
                    AI
                  </span>
                )}
              </div>

              {/* When */}
              <div className="border-t border-gray-100 pt-3">
                <p className="text-sm font-medium text-gray-800">{format(when, 'EEE, MMM d · h:mm a')}</p>
                <p className={`text-xs mt-0.5 ${overdue ? 'text-red-600' : 'text-gray-500'}`}>
                  {overdue ? `Overdue — was due ${formatDistanceToNow(when, { addSuffix: true })}`
                           : formatDistanceToNow(when, { addSuffix: true })}
                </p>
              </div>

              {/* Content */}
              <div className="border-t border-gray-100 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Content</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{selected.content}</p>
                <p className="text-[11px] text-gray-400 mt-2">{selected.content.length.toLocaleString()} characters</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
                <button
                  onClick={() => navigate(`/compose?id=${selected.id}`)}
                  className="flex-1 text-sm border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50 text-gray-700"
                >Edit</button>
                <button
                  onClick={async () => {
                    if (!(await confirm({ title: 'Delete post?', destructive: true }))) return
                    await api.delete(`/api/posts/${selected.id}`)
                    setPosts((prev) => prev.filter((p) => p.id !== selected.id))
                    setSelected(null)
                    toast.success('Deleted')
                  }}
                  className="flex-1 text-sm border border-red-200 rounded-lg py-1.5 hover:bg-red-50 text-red-500"
                >Delete</button>
              </div>
            </div>
          )
        })()}
      </div>
      {loading && <p className="text-center text-gray-400 mt-4 text-sm">Loading…</p>}
    </div>
  )
}
