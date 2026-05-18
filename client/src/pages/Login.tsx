import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import api from '../lib/api'
import useAppStore from '../store/useAppStore'

// Render's free tier sleeps after inactivity; the first request after a cold
// start often returns 502/503 from the proxy before the Node app is ready.
// Retry transient failures with backoff so the user doesn't have to manually
// re-submit. Real auth failures (400/401) are returned immediately.
async function postLoginWithRetry(email: string, password: string) {
  const delays = [0, 1500, 3000]
  let lastErr: unknown
  for (const delay of delays) {
    if (delay) await new Promise((r) => setTimeout(r, delay))
    try {
      return await api.post('/api/auth/login', { email, password })
    } catch (err) {
      lastErr = err
      const status = axios.isAxiosError(err) ? err.response?.status : null
      if (status && status >= 400 && status < 500) throw err
    }
  }
  throw lastErr
}

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()
  const setAuth  = useAppStore((s) => s.setAuth)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await postLoginWithRetry(email, password)
      setAuth({ authenticated: true, setupDone: true })
      navigate('/', { replace: true })
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        const serverMsg = (err.response?.data as { error?: string } | undefined)?.error
        if (status === 401 || status === 400) setError(serverMsg || 'Incorrect email or password')
        else if (!err.response) setError('Could not reach the server. Try again.')
        else setError(serverMsg || `Login failed (${status}).`)
      } else {
        setError('Login failed.')
      }
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
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="w-full bg-gray-800 text-white rounded-xl pl-4 pr-11 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            title={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-200"
          >
            {showPassword ? (
              // eye-off
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"
                className="w-5 h-5">
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.5 19.5 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.55 19.55 0 0 1-3.22 4.31" />
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              // eye
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"
                className="w-5 h-5">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

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
