import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useShallow } from 'zustand/react/shallow'
import useAppStore from '../store/useAppStore'
import PlatformIcon from '../components/ui/PlatformIcon'
import { useConfirm } from '../components/ui/ConfirmDialog'

interface Pillar { id: string; name: string; color: string; postCount: number }

interface PillarRow { id: string; name: string; color: string | null; post_count: number | null }
function rowToPillar(r: PillarRow): Pillar {
  return { id: r.id, name: r.name, color: r.color || '#3B82F6', postCount: r.post_count ?? 0 }
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4']

export default function Settings() {
  const navigate = useNavigate()
  const confirm  = useConfirm()
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

  interface ModelRow { id: string; dbId: string; name: string; bestFor: string | null }
  const [models, setModels]       = useState<ModelRow[]>([])
  const [newModel, setNewModel]   = useState({ openrouter_id: '', name: '', best_for: '' })
  const [modelSaving, setModelSaving] = useState(false)
  const [pillars, setPillars] = useState<Pillar[]>(contentPillars)
  const [newPillar, setNewPillar] = useState({ name: '', color: COLORS[0] })
  const [editingPillar, setEditingPillar] = useState<string | null>(null)
  const [nameInput, setNameInput]   = useState(profileName ?? '')
  const [emailInput, setEmailInput] = useState(profileEmail ?? '')
  const [nameSaving, setNameSaving] = useState(false)

  useEffect(() => {
    api.get('/api/ai/models').then((r) => setModels(r.data.models)).catch(() => {})
    api.get('/api/posts/history').catch(() => {}) // warm up
    api.get<PillarRow[]>('/api/pillars').then(({ data }) => {
      const next = data.map(rowToPillar)
      setPillars(next)
      setContentPillars(next)
    }).catch(() => { /* silent — empty list is fine */ })
  // setContentPillars is stable from Zustand; intentionally run once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addModel = async () => {
    const openrouter_id = newModel.openrouter_id.trim()
    const name          = newModel.name.trim()
    if (!openrouter_id) { toast.error('OpenRouter ID required (e.g. anthropic/claude-opus-4-7)'); return }
    if (!name)          { toast.error('Display name required'); return }
    setModelSaving(true)
    try {
      const { data } = await api.post<ModelRow>('/api/ai/models', {
        openrouter_id,
        name,
        best_for: newModel.best_for.trim() || null,
      })
      setModels((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewModel({ openrouter_id: '', name: '', best_for: '' })
      toast.success('Model added')
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg || 'Failed to add model')
    } finally { setModelSaving(false) }
  }

  const removeModel = async (m: ModelRow) => {
    if (!(await confirm({ title: `Remove ${m.name}?`, body: m.id, destructive: true }))) return
    const previous = models
    setModels(models.filter((x) => x.dbId !== m.dbId))
    // If the deleted model was the selected one, fall back to the first remaining.
    if (selectedModel === m.id) {
      const fallback = previous.find((x) => x.dbId !== m.dbId)
      if (fallback) setSelectedModel(fallback.id)
    }
    try {
      await api.delete(`/api/ai/models/${m.dbId}`)
      toast.success('Model removed')
    } catch {
      toast.error('Failed to remove model')
      setModels(previous)
    }
  }

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
      const { data } = await api.post<PillarRow>('/api/pillars', {
        name:  newPillar.name.trim(),
        color: newPillar.color,
      })
      const updated = [...pillars, rowToPillar(data)]
      setPillars(updated)
      setContentPillars(updated)
      setNewPillar({ name: '', color: COLORS[pillars.length % COLORS.length] })
      toast.success('Pillar added')
    } catch { toast.error('Failed to add pillar') }
  }

  const renamePillar = async (id: string, name: string) => {
    const trimmed = name.trim()
    const original = pillars.find((p) => p.id === id)
    if (!original || trimmed === original.name) return
    if (!trimmed) { toast.error('Pillar name required'); return }
    // optimistic update; revert on failure
    const optimistic = pillars.map((p) => p.id === id ? { ...p, name: trimmed } : p)
    setPillars(optimistic)
    setContentPillars(optimistic)
    try {
      await api.put(`/api/pillars/${id}`, { name: trimmed })
    } catch {
      toast.error('Failed to rename pillar')
      setPillars(pillars)
      setContentPillars(pillars)
    }
  }

  const removePillar = async (id: string) => {
    const previous = pillars
    const updated = pillars.filter((p) => p.id !== id)
    setPillars(updated)
    setContentPillars(updated)
    try {
      await api.delete(`/api/pillars/${id}`)
    } catch {
      toast.error('Failed to delete pillar')
      setPillars(previous)
      setContentPillars(previous)
    }
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
        <p className="text-xs text-gray-500">Add or remove OpenRouter model IDs. The selected one is used for all AI generation calls.</p>
        <div className="space-y-2">
          {models.map((m) => (
            <div key={m.dbId} className={`flex items-start gap-3 p-3 border rounded-xl transition-colors ${selectedModel === m.id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <label className="flex items-start gap-3 flex-1 cursor-pointer min-w-0">
                <input type="radio" name="model" value={m.id} checked={selectedModel === m.id} onChange={() => setSelectedModel(m.id)} className="mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{m.name}</p>
                  <p className="text-xs text-gray-400 truncate">{m.bestFor || m.id}</p>
                  <p className="text-[10px] text-gray-400 font-mono truncate">{m.id}</p>
                </div>
              </label>
              <button onClick={() => removeModel(m)} title="Remove model"
                className="text-xs text-gray-400 hover:text-red-500 shrink-0 px-1">🗑</button>
            </div>
          ))}
        </div>

        {/* Add new model */}
        <div className="border border-dashed border-gray-300 rounded-xl p-3 space-y-2">
          <p className="text-xs font-medium text-gray-600">Add a model</p>
          <input value={newModel.openrouter_id}
            onChange={(e) => setNewModel((n) => ({ ...n, openrouter_id: e.target.value }))}
            placeholder="OpenRouter ID (e.g. anthropic/claude-opus-4-7)"
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <input value={newModel.name}
            onChange={(e) => setNewModel((n) => ({ ...n, name: e.target.value }))}
            placeholder="Display name (e.g. Claude Opus 4.7)"
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <input value={newModel.best_for}
            onChange={(e) => setNewModel((n) => ({ ...n, best_for: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') addModel() }}
            placeholder="Best for… (optional)"
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <button onClick={addModel} disabled={modelSaving}
            className="btn-gradient text-white px-3 py-1.5 rounded-lg text-sm disabled:opacity-60">
            {modelSaving ? 'Adding…' : '+ Add model'}
          </button>
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
                  onBlur={(e) => { renamePillar(pillar.id, e.target.value); setEditingPillar(null) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
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
