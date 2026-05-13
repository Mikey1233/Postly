import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import useAppStore from '../store/useAppStore'

export default function SignUp() {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate       = useNavigate()
  const setAuth        = useAppStore((s) => s.setAuth)
  const setProfileName = useAppStore((s) => s.setProfileName)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.includes('@'))        { setError('Enter a valid email address'); return }
    if (password !== confirm)        { setError('Passwords do not match'); return }
    if (password.length < 8)         { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      await api.post('/api/auth/register', { email, password, name: name.trim() || undefined })
      setAuth({ authenticated: true, setupDone: true })
      if (name.trim()) setProfileName(name.trim())
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <form onSubmit={handleSubmit} className="bg-gray-900 p-8 rounded-2xl w-full max-w-sm space-y-4 shadow-2xl">
        <div className="flex items-center gap-2.5 mb-1">
          <img src="/icon.svg" alt="" className="w-8 h-8" />
          <span className="text-white text-2xl font-bold tracking-tight">Postly</span>
        </div>
        <p className="text-gray-400 text-sm">Create your account to get started.</p>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
          autoFocus
          autoComplete="name"
          className="w-full bg-gray-800 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          className="w-full bg-gray-800 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (8+ characters)"
          autoComplete="new-password"
          className="w-full bg-gray-800 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm password"
          autoComplete="new-password"
          className="w-full bg-gray-800 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !email || !password || !confirm}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition-colors"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-center text-xs text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
