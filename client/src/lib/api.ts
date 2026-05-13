import axios from 'axios'
import useAppStore from '../store/useAppStore'

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// In development all requests go through the Vite proxy (/api/* → localhost:3001)
// so the session cookie is always same-origin. In production VITE_API_URL is the
// Railway/Render URL; withCredentials lets the browser send the httpOnly cookie
// cross-origin (works when the server returns Access-Control-Allow-Credentials).
const api = axios.create({
  baseURL:         import.meta.env.DEV ? '' : BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Redirect to /login whenever any API call gets a 401 (session expired or never set)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
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
