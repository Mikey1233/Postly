// MCP HTTP client — streamable-HTTP transport (MCP spec 2025-03-26).
//
// Per spec, clients MUST send:  Accept: application/json, text/event-stream
// The server may respond with either plain JSON or an SSE stream.
// Both response types are handled here.

const TIMEOUT_MS = 12_000

// Read a JSON-RPC result from an SSE stream.
// MCP sends:  event: message\ndata: <json>\n\n
// We accept any `data:` line that contains a JSON-RPC envelope.
async function readSseResult(response) {
  const reader  = response.body.getReader()
  const decoder = new TextDecoder()
  let   buf     = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })

      const lines = buf.split('\n')
      buf = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const text = line.slice(5).trim()
        if (!text || text === '[DONE]') continue
        let msg
        try { msg = JSON.parse(text) } catch { continue }
        if (msg.result !== undefined || msg.error !== undefined) {
          reader.cancel().catch(() => {})
          if (msg.error) throw new Error(msg.error.message || JSON.stringify(msg.error))
          return msg.result
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {})
  }

  throw new Error('SSE stream ended without a JSON-RPC result')
}

async function jsonRpc(serverUrl, method, params = {}, token) {
  const controller = new AbortController()
  const timer      = setTimeout(() => controller.abort(), TIMEOUT_MS)

  // Accept both plain JSON and SSE — the server decides which to send.
  const headers = {
    'Content-Type': 'application/json',
    'Accept':       'application/json, text/event-stream',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res
  try {
    res = await fetch(serverUrl, {
      method:  'POST',
      headers,
      body:    JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
      signal:  controller.signal,
    })
    clearTimeout(timer)
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') throw new Error(`Timed out connecting to ${serverUrl}`)
    throw err
  }

  if (!res.ok) {
    const err    = new Error(`HTTP ${res.status} ${res.statusText}`)
    err.status   = res.status
    err.headers  = res.headers
    throw err
  }

  const ct = res.headers.get('content-type') || ''

  if (ct.includes('text/event-stream')) {
    return readSseResult(res)
  }

  const data = await res.json()
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
  return data.result
}

async function listTools(serverUrl, token) {
  const result = await jsonRpc(serverUrl, 'tools/list', {}, token)
  return result?.tools ?? []
}

// Match http(s) URLs that look like images/videos by extension, or generic CDN URLs that
// Higgsfield-style services use (no extension, signed query string). The agent route can
// further filter based on the calling tool's name if needed.
const IMG_EXT_RE = /\.(?:png|jpe?g|gif|webp|avif|svg)(?:\?[^\s)"']*)?/i
const VID_EXT_RE = /\.(?:mp4|webm|mov|m4v)(?:\?[^\s)"']*)?/i
const URL_RE     = /https?:\/\/[^\s)"'<>\]]+/g

function classifyUrl(url, hint) {
  if (VID_EXT_RE.test(url)) return 'video'
  if (IMG_EXT_RE.test(url)) return 'image'
  // Heuristic for hint-passed media tools (e.g. generate_image / generate_video)
  if (hint === 'video') return 'video'
  if (hint === 'image') return 'image'
  return null
}

// Walk any nested JSON looking for url/image_url/video_url string fields.
function harvestUrls(value, out) {
  if (!value) return
  if (typeof value === 'string') {
    const matches = value.match(URL_RE)
    if (matches) for (const m of matches) out.push(m)
    return
  }
  if (Array.isArray(value)) { for (const v of value) harvestUrls(v, out); return }
  if (typeof value === 'object') {
    for (const k of Object.keys(value)) {
      if (/url$/i.test(k) && typeof value[k] === 'string') out.push(value[k])
      else harvestUrls(value[k], out)
    }
  }
}

// Returns { text, media: [{ url, kind: 'image' | 'video' }] }.
// Text is what the model sees as the tool result; media is what the UI renders.
async function callTool(serverUrl, toolName, args = {}, token) {
  const result  = await jsonRpc(serverUrl, 'tools/call', { name: toolName, arguments: args }, token)
  const content = result?.content ?? []

  // Tool name hint — e.g. `generate_image` → treat URLs as images even without an extension.
  const hint =
    /image|photo|picture|thumb/i.test(toolName) ? 'image'
    : /video|clip|movie/i.test(toolName)        ? 'video'
    : null

  const textParts = []
  const media     = []
  const seen      = new Set()

  const pushMedia = (url, kind) => {
    if (!url || seen.has(url)) return
    seen.add(url)
    media.push({ url, kind })
  }

  for (const block of content) {
    if (block.type === 'text') {
      const t = block.text ?? ''
      textParts.push(t)
      // 1) plain URLs in the text
      const urls = t.match(URL_RE) ?? []
      for (const u of urls) {
        const kind = classifyUrl(u, hint)
        if (kind) pushMedia(u, kind)
      }
      // 2) JSON-shaped payloads inside the text
      const trimmed = t.trim()
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed)
          const harvested = []
          harvestUrls(parsed, harvested)
          for (const u of harvested) {
            const kind = classifyUrl(u, hint)
            if (kind) pushMedia(u, kind)
          }
        } catch { /* not JSON, ignore */ }
      }
    } else if (block.type === 'image' && block.data) {
      const mime = block.mimeType || 'image/png'
      pushMedia(`data:${mime};base64,${block.data}`, 'image')
      textParts.push(`[image: ${mime}, ${block.data.length} bytes base64]`)
    } else if (block.type === 'resource' && block.resource) {
      const r = block.resource
      const mime = r.mimeType || ''
      if (typeof r.uri === 'string') {
        const kind = mime.startsWith('video/') ? 'video'
                   : mime.startsWith('image/') ? 'image'
                   : classifyUrl(r.uri, hint)
        if (kind) pushMedia(r.uri, kind)
        textParts.push(r.text || r.uri)
      } else if (r.blob && r.mimeType) {
        pushMedia(`data:${r.mimeType};base64,${r.blob}`, r.mimeType.startsWith('video/') ? 'video' : 'image')
      }
    } else {
      textParts.push(JSON.stringify(block))
    }
  }

  const text = textParts.filter(Boolean).join('\n').trim() || 'Done'
  return { text, media }
}

// Discover OAuth 2.0 metadata for an MCP server that returns 401.
// Algorithm (MCP spec):
//   1. /.well-known/oauth-authorization-server at the server origin
//   2. WWW-Authenticate header from the 401 (resource_metadata / realm)
async function discoverOAuth(serverUrl) {
  // 1 — well-known at origin
  try {
    const origin = new URL(serverUrl).origin
    const res    = await fetch(`${origin}/.well-known/oauth-authorization-server`, {
      headers: { Accept: 'application/json' },
      signal:  AbortSignal.timeout(5000),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.authorization_endpoint) return data
    }
  } catch { /* continue */ }

  // 2 — trigger 401 and read WWW-Authenticate
  try {
    const res = await fetch(serverUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body:    JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
      signal:  AbortSignal.timeout(5000),
    })
    if (res.status !== 401) return null

    const wwwAuth = res.headers.get('WWW-Authenticate') || ''

    // resource_metadata (MCP spec preferred path)
    const metaMatch = wwwAuth.match(/resource_metadata="([^"]+)"/)
    if (metaMatch) {
      try {
        const metaRes = await fetch(metaMatch[1], { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000) })
        if (metaRes.ok) {
          const meta   = await metaRes.json()
          const asBase = meta.authorization_servers?.[0] ?? meta.authorization_server
          if (asBase) {
            const asRes = await fetch(`${asBase}/.well-known/oauth-authorization-server`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000) })
            if (asRes.ok) return await asRes.json()
          }
          if (meta.authorization_endpoint) return meta
        }
      } catch { /* skip */ }
    }

    // realm fallback
    const realmMatch = wwwAuth.match(/realm="([^"]+)"/)
    if (realmMatch) {
      try {
        const realmRes = await fetch(`${realmMatch[1]}/.well-known/oauth-authorization-server`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000) })
        if (realmRes.ok) {
          const data = await realmRes.json()
          if (data.authorization_endpoint) return data
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  return null
}

// Register Postly as an OAuth client (RFC 7591 dynamic client registration).
// Returns the issued client_id.
async function registerClient(registrationEndpoint, redirectUri, scopesSupported = []) {
  const res = await fetch(registrationEndpoint, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body:    JSON.stringify({
      client_name:                'Postly',
      redirect_uris:              [redirectUri],
      grant_types:                ['authorization_code'],
      response_types:             ['code'],
      token_endpoint_auth_method: 'none',
      ...(scopesSupported.length > 0 ? { scope: scopesSupported.join(' ') } : {}),
    }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => res.status.toString())
    throw new Error(`Registration failed (${res.status}): ${body}`)
  }
  const data = await res.json()
  if (!data.client_id) throw new Error('Registration response missing client_id')
  return data.client_id
}

module.exports = { listTools, callTool, discoverOAuth, registerClient }
