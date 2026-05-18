import axios from 'axios'
import useAppStore from '../store/useAppStore'

// Both dev and prod use relative /api URLs so the session cookie is always
// first-party (browsers block/partition third-party cookies, which would log
// the user out on every reload). Dev: Vite proxy → localhost:3001. Prod:
// Vercel rewrite (see vercel.json) → the Render backend.
export const BASE_URL = ''

const api = axios.create({
  baseURL:         '',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Redirect to /login on 401, but NOT when the 401 comes from an auth endpoint
// (e.g. wrong password on /login should show an error, not redirect).
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url ?? ''
    const isAuthEndpoint = url.includes('/api/auth/')
    if (err.response?.status === 401 && !isAuthEndpoint) {
      useAppStore.getState().setAuth({ authenticated: false })
      window.location.replace('/login')
    }
    return Promise.reject(err)
  },
)

export default api

// Stream an SSE response and call onChunk for each text fragment
export async function streamSSE(
  endpoint: string,
  body: Record<string, unknown>,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
    signal,
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const lines = decoder.decode(value).split('\n\n')
    for (const line of lines) {
      if (line.startsWith('data: ') && !line.includes('[DONE]')) {
        try {
          const { text } = JSON.parse(line.slice(6)) as { text: string }
          if (text) onChunk(text)
        } catch { /* partial chunk */ }
      }
    }
  }
}
