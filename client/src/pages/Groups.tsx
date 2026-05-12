import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useShallow } from 'zustand/react/shallow'
import useAppStore from '../store/useAppStore'
import type { Platform } from '../lib/platformLimits'
import PlatformIcon from '../components/ui/PlatformIcon'

interface Group { group_id: string; name: string; description?: string; member_count?: number; platform: Platform }

const GROUP_PLATFORMS: { platform: Platform; label: string }[] = [
  { platform: 'facebook', label: 'Facebook Groups' },
  { platform: 'reddit',   label: 'Reddit Subreddits' },
]

export default function Groups() {
  const navigate  = useNavigate()
  const setCurrentPost = useAppStore((s) => s.setCurrentPost)
  const [groups, setGroups]     = useState<Partial<Record<Platform, Group[]>>>({})
  const [syncing, setSyncing]   = useState<Platform | null>(null)
  const [loading, setLoading]   = useState(true)

  const sync = async (platform: Platform) => {
    setSyncing(platform)
    try {
      const { data } = await api.get<Group[]>(`/api/platforms/${platform}/groups`)
      const tagged = data.map((g) => ({ ...g, platform }))
      setGroups((prev) => ({ ...prev, [platform]: tagged }))
      toast.success('Groups synced')
    } catch {
      toast.error(`Failed to sync ${platform} groups — make sure you're connected`)
    } finally {
      setSyncing(null)
    }
  }

  useEffect(() => {
    setLoading(false)
  }, [])

  const composeForGroup = (group: Group) => {
    setCurrentPost({ platforms: [group.platform], targetGroup: { platform: group.platform, groupId: group.group_id, groupName: group.name } })
    navigate('/compose')
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Groups & Communities</h1>
        <p className="text-sm text-gray-500 mt-1">Sync your groups and post directly to them.</p>
      </div>

      {GROUP_PLATFORMS.map(({ platform, label }) => {
        const list = groups[platform] || []
        return (
          <div key={platform} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold text-gray-800">
                <PlatformIcon platform={platform} size={20} />
                {label}
              </h2>
              <button
                onClick={() => sync(platform)}
                disabled={syncing === platform}
                className="flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-60"
              >
                {syncing === platform ? <><span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />Syncing…</> : '🔄 Sync'}
              </button>
            </div>

            {list.length === 0 ? (
              <p className="text-sm text-gray-400 bg-gray-50 rounded-xl p-4 text-center">
                No groups synced yet.{' '}
                {syncing === platform ? 'Loading…' : (
                  <button onClick={() => sync(platform)} className="text-indigo-600 hover:underline">Sync now</button>
                )}
              </p>
            ) : (
              <div className="space-y-2">
                {list.map((group) => (
                  <div key={group.group_id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{group.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {group.member_count ? `${group.member_count.toLocaleString()} members` : ''}
                        {group.description ? (group.member_count ? ' · ' : '') + group.description.slice(0, 60) : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => composeForGroup(group)}
                      className="text-sm bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 shrink-0"
                    >
                      Compose
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
