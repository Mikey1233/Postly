import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api, { BASE_URL } from '../lib/api'
import { PLATFORM_LABELS } from '../lib/platformLimits'
import type { Platform } from '../lib/platformLimits'
import { useShallow } from 'zustand/react/shallow'
import useAppStore from '../store/useAppStore'
import PlatformIcon from '../components/ui/PlatformIcon'

const PLATFORMS: Platform[] = ['linkedin', 'x', 'facebook', 'reddit']

interface PlatformStatus {
  configured: boolean
  connected: boolean
  state?: 'connected' | 'expiring' | 'expired'
  accountName?: string
  expiresAt?: string
  redirectUri?: string
}

export default function Platforms() {
  const [searchParams] = useSearchParams()
  const setPlatformConnections = useAppStore((s) => s.setPlatformConnections)

  const [status, setStatus]             = useState<Partial<Record<Platform, PlatformStatus>>>({})
  const [credForms, setCredForms]       = useState<Partial<Record<Platform, { clientId: string; clientSecret: string }>>>({})
  const [showForm, setShowForm]         = useState<Platform | null>(null)
  const [redirectUris, setRedirectUris] = useState<Partial<Record<Platform, string>>>({})
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState<Platform | null>(null)

  const load = async () => {
    const [statusRes, ...credResps] = await Promise.all([
      api.get('/api/platforms/status'),
      ...PLATFORMS.map((p) => api.get(`/api/platforms/${p}/credentials`).catch(() => ({ data: { configured: false, redirectUri: '' } }))),
    ])
    setStatus(statusRes.data)
    setPlatformConnections(statusRes.data)
    const uris: Partial<Record<Platform, string>> = {}
    PLATFORMS.forEach((p, i) => { uris[p] = credResps[i].data.redirectUri })
    setRedirectUris(uris)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const connected = searchParams.get('connected')
    const error     = searchParams.get('error')
    if (connected) toast.success(`${PLATFORM_LABELS[connected as Platform] || connected} connected!`)
    if (error) toast.error(`OAuth error: ${error}`)
  }, [])

  const saveCredentials = async (platform: Platform) => {
    const form = credForms[platform]
    if (!form?.clientId || !form?.clientSecret) { toast.error('Both fields required'); return }
    setSaving(platform)
    try {
      await api.post(`/api/platforms/${platform}/credentials`, { clientId: form.clientId, clientSecret: form.clientSecret })
      toast.success('Credentials saved')
      setShowForm(null)
      await load()
    } catch {
      toast.error('Failed to save credentials')
    } finally {
      setSaving(null)
    }
  }

  const connect = (platform: Platform) => {
    window.location.href = `${BASE_URL}/api/platforms/${platform}/auth`
  }

  const disconnect = async (platform: Platform) => {
    if (!confirm(`Disconnect ${PLATFORM_LABELS[platform]}?`)) return
    try {
      await api.delete(`/api/platforms/${platform}`)
      toast.success('Disconnected')
      await load()
    } catch {
      toast.error('Failed to disconnect')
    }
  }

  const removeCredentials = async (platform: Platform) => {
    if (!confirm(`Remove credentials for ${PLATFORM_LABELS[platform]}? This will also disconnect it.`)) return
    try {
      await api.delete(`/api/platforms/${platform}/credentials`)
      toast.success('Credentials removed')
      await load()
    } catch {
      toast.error('Failed to remove credentials')
    }
  }

  if (loading) return <div className="p-6 text-gray-400">Loading…</div>

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Connected Platforms</h1>
        <p className="text-sm text-gray-500 mt-1">Add your app credentials, then connect each platform via OAuth.</p>
      </div>

      {PLATFORMS.map((platform) => {
        const conn = status[platform] || { configured: false, connected: false }
        const isOpen = showForm === platform
        const form = credForms[platform] || { clientId: '', clientSecret: '' }

        return (
          <div key={platform} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                  <PlatformIcon platform={platform} size={24} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{PLATFORM_LABELS[platform]}</p>
                  {conn.connected ? (
                    <p className="text-sm text-gray-500">
                      {conn.accountName} ·{' '}
                      {conn.state === 'expiring'
                        ? <span className="text-amber-600">Token expiring soon</span>
                        : conn.state === 'expired'
                        ? <span className="text-red-600">Token expired</span>
                        : <span className="text-green-600">Connected</span>}
                    </p>
                  ) : conn.configured ? (
                    <p className="text-sm text-gray-500">Credentials saved — ready to connect</p>
                  ) : (
                    <p className="text-sm text-gray-400">Not configured</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {conn.connected ? (
                  <>
                    <button onClick={() => connect(platform)} className="text-sm text-indigo-600 hover:underline">Reconnect</button>
                    <button onClick={() => disconnect(platform)} className="text-sm text-gray-400 hover:text-red-500">Disconnect</button>
                  </>
                ) : conn.configured ? (
                  <>
                    <button onClick={() => connect(platform)} className="btn-gradient text-white px-3 py-1.5 rounded-lg text-sm font-medium">Connect</button>
                    <button onClick={() => setShowForm(isOpen ? null : platform)} className="text-sm text-gray-400 hover:text-gray-600">Edit</button>
                  </>
                ) : (
                  <button onClick={() => setShowForm(isOpen ? null : platform)} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-200">Configure</button>
                )}
              </div>
            </div>

            {/* Credential form */}
            {isOpen && (
              <div className="border-t border-gray-100 p-5 bg-gray-50 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                  <p className="font-medium mb-1">Redirect URI — copy this into your {PLATFORM_LABELS[platform]} developer console:</p>
                  <code className="break-all select-all">{redirectUris[platform]}</code>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Client ID</label>
                    <input
                      type="text"
                      value={form.clientId}
                      onChange={(e) => setCredForms((f) => ({ ...f, [platform]: { ...form, clientId: e.target.value } }))}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder="Client ID"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Client Secret</label>
                    <input
                      type="password"
                      value={form.clientSecret}
                      onChange={(e) => setCredForms((f) => ({ ...f, [platform]: { ...form, clientSecret: e.target.value } }))}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder="Client Secret"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => saveCredentials(platform)}
                    disabled={saving === platform}
                    className="btn-gradient text-white px-4 py-1.5 rounded-lg text-sm font-medium"
                  >
                    {saving === platform ? 'Saving…' : 'Save Credentials'}
                  </button>
                  {conn.configured && (
                    <button onClick={() => removeCredentials(platform)} className="text-sm text-red-500 hover:underline px-2">Remove</button>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
