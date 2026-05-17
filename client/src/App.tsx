import { useEffect, useState, lazy, Suspense, useRef } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useAppStore from './store/useAppStore'
import { PLATFORM_LABELS } from './lib/platformLimits'
import type { Platform } from './lib/platformLimits'
import PlatformIcon from './components/ui/PlatformIcon'
import api from './lib/api'
import { useDarkMode } from './hooks/useDarkMode'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import {
  requestNotificationPermission,
  notifyPostPublished,
  notifyPostFailed,
  notifyTokenExpiringSoon,
} from './lib/notifications'

import Login             from './pages/Login'
import SignUp            from './pages/SignUp'
import Dashboard     from './pages/Dashboard'
import Composer      from './pages/Composer'
import Drafts        from './pages/Drafts'
import Platforms     from './pages/Platforms'
import VoiceSetup    from './pages/VoiceSetup'
import Recipients    from './pages/Recipients'
import Settings      from './pages/Settings'

// Lazy-loaded heavy pages
const Calendar     = lazy(() => import('./pages/Calendar'))
const Analytics    = lazy(() => import('./pages/Analytics'))
const MediaLibrary = lazy(() => import('./pages/MediaLibrary'))

// ── SVG Icons ────────────────────────────────────────────────────────────────

function Icon({ d, d2 }: { d: string; d2?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.6} stroke="currentColor" className="w-[18px] h-[18px] shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
      {d2 && <path strokeLinecap="round" strokeLinejoin="round" d={d2} />}
    </svg>
  )
}

const NAV_ICONS: Record<string, React.ReactNode> = {
  dashboard: <Icon d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />,

  compose: <Icon d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />,

  calendar: <Icon d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H18v-.008zm0 2.25h.008v.008H18V15z" />,

  analytics: <Icon d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />,

  voice: <Icon d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />,

  groups: <Icon d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />,

  media: <Icon d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />,

  drafts: <Icon d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />,

  platforms: <Icon d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />,

  settings: <Icon d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" d2="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
}

// ── Sidebar toggle icon ───────────────────────────────────────────────────────

function SidebarToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
      className="w-[18px] h-[18px]">
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <line x1="9" y1="4" x2="9" y2="20" />
      {collapsed
        ? <polyline points="13.5 9 16.5 12 13.5 15" />
        : <polyline points="16.5 9 13.5 12 16.5 15" />}
    </svg>
  )
}

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

// ── Nav components ────────────────────────────────────────────────────────────

// Platforms we can actually connect to and publish on. Facebook and Reddit
// stay supported as AI generation targets (see Composer & VoiceSetup) but are
// not represented in connection status indicators.
const CONNECTABLE_PLATFORMS: Platform[] = ['linkedin', 'x', 'gmail']

interface NavItemProps { to: string; label: string; iconKey: string; collapsed: boolean; end?: boolean }

function NavItem({ to, label, iconKey, collapsed, end }: NavItemProps) {
  return (
    <NavLink
      to={to} end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 py-2 rounded-xl text-sm font-medium transition-all duration-150
        ${collapsed ? 'justify-center px-2' : 'px-3'}
        ${isActive
          ? 'bg-indigo-50 text-indigo-700'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        }`
      }
    >
      <span className="shrink-0">{NAV_ICONS[iconKey]}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  )
}

interface NavGroupProps { label: string; collapsed: boolean; children: React.ReactNode }

function NavGroup({ label, collapsed, children }: NavGroupProps) {
  return (
    <div className="mt-3">
      {!collapsed && (
        <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      )}
      {collapsed && <div className="border-t border-gray-100 my-2 mx-2" />}
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 900)
  const userToggled = useRef(false)
  const connections    = useAppStore((s) => s.platformConnections)
  const darkMode       = useAppStore((s) => s.darkMode)
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode)
  const setAuth        = useAppStore((s) => s.setAuth)
  const profileName    = useAppStore((s) => s.profileName)

  useEffect(() => {
    const onResize = () => {
      if (userToggled.current) return
      setCollapsed(window.innerWidth < 900)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const onToggle = () => { userToggled.current = true; setCollapsed((c) => !c) }

  const logout = async () => {
    try { await api.post('/api/auth/logout') } catch { /* ignore */ }
    setAuth({ authenticated: false })
    window.location.replace('/login')
  }

  return (
    <aside
      className={`scrollbar-none h-full shrink-0 border-r border-gray-200 bg-white flex flex-col py-4 overflow-y-auto transition-all duration-200 ease-in-out ${
        collapsed ? 'w-[60px] px-2' : 'w-56 px-3'
      }`}
    >
      {/* Logo + collapse button */}
      <div className={`flex items-center mb-5 ${collapsed ? 'justify-center' : 'justify-between px-1'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src="/icon.svg" alt="" className="w-7 h-7" />
            <span className="text-lg font-bold tracking-tight text-indigo-600">Postly</span>
          </div>
        )}
        <button onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-indigo-600 transition-colors ${collapsed ? 'mt-1' : ''}`}
        >
          <SidebarToggleIcon collapsed={collapsed} />
        </button>
      </div>

      {/* Nav links */}
      <div className="flex flex-col gap-0.5">
        <NavItem to="/"          label="Dashboard" iconKey="dashboard" collapsed={collapsed} end />
        <NavItem to="/compose"   label="Compose"   iconKey="compose"   collapsed={collapsed} />
        <NavItem to="/drafts"    label="Drafts"    iconKey="drafts"    collapsed={collapsed} />
        <NavItem to="/calendar"  label="Calendar"  iconKey="calendar"  collapsed={collapsed} />
        <NavItem to="/analytics" label="Analytics" iconKey="analytics" collapsed={collapsed} />

        <NavGroup label="LinkedIn" collapsed={collapsed}>
          <NavItem to="/voice" label="Voice Profile" iconKey="voice" collapsed={collapsed} />
        </NavGroup>

        <NavGroup label="Content" collapsed={collapsed}>
          <NavItem to="/media"      label="Media Library" iconKey="media"  collapsed={collapsed} />
          <NavItem to="/recipients" label="Recipients"    iconKey="groups" collapsed={collapsed} />
        </NavGroup>

        <NavGroup label="Account" collapsed={collapsed}>
          <NavItem to="/platforms" label="Platforms" iconKey="platforms" collapsed={collapsed} />
          <NavItem to="/settings"  label="Settings"  iconKey="settings"  collapsed={collapsed} />
        </NavGroup>
      </div>

      {/* Footer: dark mode toggle + logout + platform status */}
      <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col gap-2">
        <button onClick={toggleDarkMode}
          title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
          className={`flex items-center gap-2 rounded-lg text-sm text-gray-500 hover:text-indigo-600 hover:bg-gray-100 transition-colors ${collapsed ? 'justify-center p-2' : 'px-3 py-2'}`}
        >
          {darkMode ? <SunIcon /> : <MoonIcon />}
          {!collapsed && <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>}
        </button>

        {!collapsed && profileName && (
          <p className="text-xs font-medium text-gray-700 px-1 truncate" title={profileName}>{profileName}</p>
        )}

        <button onClick={logout}
          title="Sign out"
          aria-label="Sign out"
          className={`flex items-center gap-2 rounded-lg text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors ${collapsed ? 'justify-center p-2' : 'px-3 py-2'}`}
        >
          <LogoutIcon />
          {!collapsed && <span>Sign out</span>}
        </button>

        <div className={`flex gap-1.5 pt-1 ${collapsed ? 'flex-col items-center' : 'flex-wrap px-1'}`}>
          {CONNECTABLE_PLATFORMS.map((p) => {
            const conn = connections[p]
            const connected = conn?.connected && conn?.state !== 'expired'
            return (
              <div key={p} title={`${PLATFORM_LABELS[p]}: ${connected ? 'Connected' : 'Not connected'}`}>
                <PlatformIcon platform={p} size={14} className={connected ? '' : 'opacity-40 grayscale'} />
              </div>
            )
          })}
        </div>
        {!collapsed && <p className="text-[10px] text-gray-400 px-1">Platform status</p>}
      </div>
    </aside>
  )
}

// ── RequireAuth ───────────────────────────────────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  const auth = useAppStore((s) => s.auth)
  if (!auth.checked) return <div className="flex items-center justify-center h-screen text-gray-400 text-sm">Loading…</div>
  if (!auth.setupDone) return <Navigate to="/signup" replace />
  if (!auth.authenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

// ── AppShell ──────────────────────────────────────────────────────────────────

function PageLoader() {
  return <div className="p-6 text-gray-400 text-sm">Loading…</div>
}

interface RecentPost { id: string; status: string; platform: string[] }

function AppShell() {
  useKeyboardShortcuts()
  const navigate = useNavigate()
  const setPlatformConnections = useAppStore((s) => s.setPlatformConnections)
  const setVoiceProfiles       = useAppStore((s) => s.setVoiceProfiles)
  const setProfileName         = useAppStore((s) => s.setProfileName)
  const setProfileEmail        = useAppStore((s) => s.setProfileEmail)
  const setContentPillars      = useAppStore((s) => s.setContentPillars)
  const platformConnections    = useAppStore((s) => s.platformConnections)
  const seenPostStatus = useRef<Record<string, string>>({})

  useEffect(() => {
    requestNotificationPermission()
    api.get('/api/platforms/status').then((r) => setPlatformConnections(r.data)).catch(() => {})
    api.get('/api/auth/profile').then(({ data }) => {
      setProfileName(data.name)
      setProfileEmail(data.email)
    }).catch(() => {})
    api.get('/api/voice').then(({ data }) => {
      setVoiceProfiles((data as Array<{ id: string; name: string; platform: Platform; system_prompt: string; analysis: Record<string, unknown>; is_default: boolean }>)
        .filter((row) => row.system_prompt)
        .map((row) => ({
          id: row.id,
          name: row.name || `${row.platform} voice`,
          platform: row.platform,
          systemPrompt: row.system_prompt,
          analysis: row.analysis,
          isDefault: !!row.is_default,
        })))
    }).catch(() => {})
    api.get<Array<{ id: string; name: string; color: string | null; post_count: number | null }>>('/api/pillars').then(({ data }) => {
      setContentPillars(data.map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color || '#3B82F6',
        postCount: r.post_count ?? 0,
      })))
    }).catch(() => {})
  }, [setPlatformConnections, setVoiceProfiles, setProfileName, setProfileEmail, setContentPillars])

  // Token-expiry OS notifications — once per session per platform
  useEffect(() => {
    const fired: Record<string, boolean> = {}
    for (const [platform, conn] of Object.entries(platformConnections)) {
      if (!conn?.expiresAt || !conn.connected) continue
      const daysLeft = Math.floor((new Date(conn.expiresAt).getTime() - Date.now()) / 86_400_000)
      if (daysLeft > 0 && daysLeft <= 7 && !fired[platform]) {
        fired[platform] = true
        notifyTokenExpiringSoon(PLATFORM_LABELS[platform as Platform] || platform, daysLeft)
      }
    }
  }, [platformConnections])

  // Poll for post status transitions every 30s → OS notifications
  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      try {
        const { data } = await api.get<RecentPost[]>('/api/posts/recent')
        if (cancelled) return
        for (const post of data) {
          const prev = seenPostStatus.current[post.id]
          seenPostStatus.current[post.id] = post.status
          if (prev && prev !== post.status) {
            if (post.status === 'published') notifyPostPublished(post.platform)
            if (post.status === 'failed' || post.status === 'partial') notifyPostFailed(post.platform)
          }
        }
      } catch { /* swallow polling errors */ }
    }
    poll()
    const id = setInterval(poll, 30_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [navigate])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900">
      <Sidebar />
      <main className="flex-1 min-h-0 overflow-y-auto scrollbar-slim">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"                 element={<Dashboard />} />
            <Route path="/compose"          element={<Composer />} />
            <Route path="/drafts"           element={<Drafts />} />
            <Route path="/calendar"         element={<Calendar />} />
            <Route path="/analytics"        element={<Analytics />} />
            <Route path="/platforms"        element={<Platforms />} />
            <Route path="/voice"            element={<VoiceSetup />} />
            <Route path="/media"            element={<MediaLibrary />} />
            <Route path="/recipients"       element={<Recipients />} />
            <Route path="/settings"         element={<Settings />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  useDarkMode()
  const setAuth = useAppStore((s) => s.setAuth)

  // Run verify + setup-status in parallel on every page load.
  // Both must resolve before RequireAuth renders the app (auth.checked gate).
  useEffect(() => {
    Promise.all([
      api.get('/api/auth/verify'),
      api.get('/api/auth/setup-status'),
    ])
      .then(([verifyRes, setupRes]) =>
        setAuth({
          checked:       true,
          authenticated: verifyRes.data.authenticated,
          setupDone:     setupRes.data.configured,
        })
      )
      .catch(() => setAuth({ authenticated: false, setupDone: false }))
  }, [setAuth])

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/login"              element={<Login />} />
        <Route path="/signup"             element={<SignUp />} />
        <Route path="/*" element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        } />
      </Routes>
    </BrowserRouter>
  )
}
