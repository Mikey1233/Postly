import axios from 'axios'

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

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
