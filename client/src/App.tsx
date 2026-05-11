import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import Dashboard       from './pages/Dashboard'
import Composer        from './pages/Composer'
import CarouselBuilder from './pages/CarouselBuilder'
import Calendar        from './pages/Calendar'
import Analytics       from './pages/Analytics'
import Platforms       from './pages/Platforms'
import VoiceSetup      from './pages/VoiceSetup'
import Groups          from './pages/Groups'
import MediaLibrary    from './pages/MediaLibrary'
import Settings        from './pages/Settings'

interface NavItem {
  to: string
  label: string
}

const NAV_LINKS: NavItem[] = [
  { to: '/',                  label: 'Dashboard' },
  { to: '/compose',           label: 'Compose' },
  { to: '/compose/carousel',  label: 'Carousel' },
  { to: '/calendar',          label: 'Calendar' },
  { to: '/analytics',         label: 'Analytics' },
  { to: '/platforms',         label: 'Platforms' },
  { to: '/voice',             label: 'Voice' },
  { to: '/groups',            label: 'Groups' },
  { to: '/media',             label: 'Media' },
  { to: '/settings',          label: 'Settings' },
]

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <aside className="w-52 shrink-0 border-r border-gray-200 bg-white flex flex-col py-6 px-4 gap-1">
        <div className="flex items-center gap-2 mb-6 px-2">
          <img src="/icon.svg" alt="" className="w-7 h-7" />
          <span className="text-xl font-bold text-indigo-600">Postly</span>
        </div>
        {NAV_LINKS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Layout>
        <Routes>
          <Route path="/"                 element={<Dashboard />} />
          <Route path="/compose"          element={<Composer />} />
          <Route path="/compose/carousel" element={<CarouselBuilder />} />
          <Route path="/calendar"         element={<Calendar />} />
          <Route path="/analytics"        element={<Analytics />} />
          <Route path="/platforms"        element={<Platforms />} />
          <Route path="/voice"            element={<VoiceSetup />} />
          <Route path="/groups"           element={<Groups />} />
          <Route path="/media"            element={<MediaLibrary />} />
          <Route path="/settings"         element={<Settings />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
