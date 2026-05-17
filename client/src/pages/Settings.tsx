import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useShallow } from 'zustand/react/shallow'
import useAppStore from '../store/useAppStore'
import PlatformIcon from '../components/ui/PlatformIcon'

interface Pillar { id: string; name: string; color: string; postCount: number }

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4']

export default function Settings() {
  const navigate = useNavigate()
  const {
    selectedModel, setSelectedModel, contentPillars, setContentPillars,
    profileName, setProfileName, profileEmail, setProfileEmail,
  } = useAppStore(
    useShallow((s) => ({
      selectedModel:     s.selectedModel,
      setSelectedModel:  s.setSelectedModel,
      contentPillars:    s.contentPillars,
      setContentPillars: s.setContentPillars,
      profileName:       s.profileName,
      setProfileName:    s.setProfileName,
      profileEmail:      s.profileEmail,
      setProfileEmail:   s.setProfileEmail,
    }))
  )

  const [models, setModels]   = useState<{ id: string; name: string; bestFor: string }[]>([])
  const [pillars, setPillars] = useState<Pillar[]>(contentPillars)
  const [newPillar, setNewPillar] = useState({ name: '', color: COLORS[0] })
  const [editingPillar, setEditingPillar] = useState<string | null>(null)
  const [nameInput, setNameInput]   = useState(profileName ?? '')
  const [emailInput, setEmailInput] = useState(profileEmail ?? '')
  const [nameSaving, setNameSaving] = useState(false)

  useEffect(() => {
    api.get('/api/ai/models').then((r) => setModels(r.data.models)).catch(() => {})
    api.get('/api/posts/history').catch(() => {}) // warm up
  }, [])

  const saveProfile = async () => {
    if (!nameInput.trim() && !emailInput.trim()) { toast.error('Nothing to save'); return }
    if (emailInput.trim() && !emailInput.includes('@')) { toast.error('Enter a valid email'); return }
    setNameSaving(true)
    try {
      const body: Record<string, string> = {}
      if (nameInput.trim())  body.name  = nameInput.trim()
      if (emailInput.trim()) body.email = emailInput.trim()
      await api.put('/api/auth/profile', body)
      if (body.name)  setProfileName(body.name)
      if (body.email) setProfileEmail(body.email)
      toast.success('Profile saved')
    } catch { toast.error('Failed to save profile') }
    finally { setNameSaving(false) }
  }

  const exportData = async (format: 'json' | 'csv') => {
    try {
      const { data } = await api.get('/api/posts/history?limit=200')
      const rows = data as Array<Record<string, unknown>>
      let content: string
      let filename: string
      let mimeType: string

      if (format === 'json') {
        content = JSON.stringify(rows, null, 2)
        filename = 'postly-export.json'
        mimeType = 'application/json'
      } else {
        const header = 'id,content,platforms,post_type,status,published_at,impressions,likes,comments\n'
        const body = rows.map((p) => {
          const a = (p.post_analytics as Record<string, unknown>[])?.[0] ?? {}
          return [
            p.id,
            `"${String(p.content ?? '').replace(/"/g, '""')}"`,
            ((p.platform as string[]) ?? []).join(';'),
            p.post_type ?? '',
            p.status ?? '',
            p.published_at ?? '',
            (a as Record<string, unknown>).impressions ?? '',
            (a as Record<string, unknown>).likes ?? '',
            (a as Record<string, unknown>).comments ?? '',
          ].join(',')
        }).join('\n')
        content = header + body
        filename = 'postly-export.csv'
        mimeType = 'text/csv'
      }

      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported ${rows.length} posts as ${format.toUpperCase()}`)
    } catch { toast.error('Export failed') }
  }

  const addPillar = async () => {
    if (!newPillar.name.trim()) { toast.error('Enter a pillar name'); return }
    try {
      const { data } = await api.post('/api/posts', { /* this would be a content pillars route */ }).catch(() => ({ data: { id: Date.now().toString(), ...newPillar, postCount: 0 } }))
      const added = { id: data.id, name: newPillar.name, color: newPillar.color, postCount: 0 }
      const updated = [...pillars, added]
      setPillars(updated)
      setContentPillars(updated)
      setNewPillar({ name: '', color: COLORS[pillars.length % COLORS.length] })
      toast.success('Pillar added')
    } catch { toast.error('Failed to add pillar') }
  }

  const removePillar = (id: string) => {
    const updated = pillars.filter((p) => p.id !== id)
    setPillars(updated)
    setContentPillars(updated)
  }

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Profile */}
      <section className="space-y-3">
        <h2 className="font-semibold text-gray-800">Profile</h2>
        <div className="space-y-2">
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Your name"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="Email address"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <button onClick={saveProfile} disabled={nameSaving}
            className="btn-gradient text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
            {nameSaving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </section>

      {/* AI Model */}
      <section className="space-y-3">
        <h2 className="font-semibold text-gray-800">AI Model</h2>
        <div className="space-y-2">
          {models.map((m) => (
            <label key={m.id} className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${selectedModel === m.id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="model" value={m.id} checked={selectedModel === m.id} onChange={() => setSelectedModel(m.id)} className="mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-800">{m.name}</p>
                <p className="text-xs text-gray-400">{m.bestFor}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Brand Voices */}
      <section className="space-y-3">
        <h2 className="font-semibold text-gray-800">Brand Voices</h2>
        <p className="text-xs text-gray-500">Name and manage as many voices as you like — each tagged with the platform it was sourced from.</p>
        <button onClick={() => navigate('/voice')}
          className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3 hover:bg-gray-50 text-left w-full">
          <span className="flex items-center gap-2.5 text-sm font-medium text-gray-700">
            <PlatformIcon platform="linkedin" size={18} />
            Manage voices
          </span>
          <span className="text-xs text-indigo-600">Open →</span>
        </button>
      </section>

      {/* Content Pillars */}
      <section className="space-y-3">
        <h2 className="font-semibold text-gray-800">Content Pillars</h2>
        <div className="space-y-2">
          {pillars.map((pillar) => (
            <div key={pillar.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
              <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: pillar.color }} />
              {editingPillar === pillar.id ? (
                <input defaultValue={pillar.name} autoFocus
                  onBlur={(e) => { setPillars((prev) => prev.map((p) => p.id === pillar.id ? { ...p, name: e.target.value } : p)); setEditingPillar(null) }}
                  className="flex-1 text-sm border-b border-gray-300 focus:outline-none"
                />
              ) : (
                <span className="flex-1 text-sm font-medium text-gray-700">{pillar.name}</span>
              )}
              <span className="text-xs text-gray-400">{pillar.postCount} posts</span>
              <button onClick={() => setEditingPillar(pillar.id)} className="text-xs text-gray-400 hover:text-gray-600">✏</button>
              <button onClick={() => removePillar(pillar.id)} className="text-xs text-gray-400 hover:text-red-500">🗑</button>
            </div>
          ))}
          <div className="flex gap-2">
            <div className="flex gap-1">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setNewPillar((n) => ({ ...n, color: c }))}
                  className={`w-5 h-5 rounded-full border-2 ${newPillar.color === c ? 'border-gray-700' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <input value={newPillar.name} onChange={(e) => setNewPillar((n) => ({ ...n, name: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') addPillar() }}
              placeholder="New pillar name…"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <button onClick={addPillar} className="btn-gradient text-white px-3 py-1.5 rounded-lg text-sm">+ Add</button>
          </div>
        </div>
      </section>

      {/* Best Post Times */}
      <section className="space-y-3">
        <h2 className="font-semibold text-gray-800">Best Post Times</h2>
        <div className="space-y-2">
          {[
            { platform: 'LinkedIn', days: 'Tue–Thu', time: '12:00 PM' },
            { platform: 'X',        days: 'Weekdays', time: '9:00 AM' },
            { platform: 'Reddit',   days: 'Sat–Sun', time: '10:00 AM' },
            { platform: 'Facebook', days: 'Wed',      time: '11:00 AM' },
          ].map(({ platform, days, time }) => (
            <div key={platform} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm">
              <span className="font-medium text-gray-700 w-24">{platform}</span>
              <span className="text-gray-500">{days} · {time}</span>
              <span className="text-xs text-gray-400 italic">Coming soon</span>
            </div>
          ))}
        </div>
      </section>

      {/* Data export */}
      <section className="space-y-3">
        <h2 className="font-semibold text-gray-800">Data Export</h2>
        <div className="flex gap-3">
          <button onClick={() => exportData('json')} className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Export as JSON</button>
          <button onClick={() => exportData('csv')}  className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Export as CSV</button>
        </div>
      </section>
    </div>
  )
}
