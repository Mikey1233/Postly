import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import useAppStore from '../store/useAppStore'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()
  const setAuth  = useAppStore((s) => s.setAuth)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/api/auth/login', { email, password })
      setAuth({ authenticated: true })
      navigate('/', { replace: true })
    } catch {
      setError('Incorrect email or password')
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
        <p className="text-gray-400 text-sm">Sign in to continue.</p>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoFocus
          autoComplete="email"
          className="w-full bg-gray-800 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          className="w-full bg-gray-800 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition-colors"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-center text-xs text-gray-500">
          No account yet?{' '}
          <Link to="/signup" className="text-indigo-400 hover:underline">Set up your account</Link>
        </p>
      </form>
    </div>
  )
}
