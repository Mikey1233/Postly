# Progress

Track your progress through the Postly build. Update this file as you complete stages — Claude reads this to understand where you are in the project.

## Convention
- `[ ]` = Not started
- `[-]` = In progress
- `[x]` = Completed

## Stages

### Stage 1: Project Setup & Architecture
- [x] Repository structure created (`client/` and `server/` directories)
- [x] React frontend initialised with Vite (`client/` scaffolded via `npm create vite@latest`)
- [x] Express backend initialised (`server/index.js` with CORS, JSON body parser, global error handler)
- [x] All frontend dependencies installed (Zustand, React Router v6, Axios, Tailwind CSS, Fabric.js, react-dropzone, react-player, react-hot-toast, date-fns)
- [x] All backend dependencies installed (cors, dotenv, multer, @supabase/supabase-js, openai, sharp, fluent-ffmpeg, pdf-lib, node-cron)
- [x] All 6 route stubs created and returning 200 JSON responses (`ai`, `posts`, `platforms`, `voice`, `media`, `schedule`)
- [x] `/health` endpoint live on Express server
- [x] `server/db/supabase.js` — Supabase client using `service_role_key`
- [x] `server/db/index.js` — DB index exporting all 11 table helpers
- [x] `server/db/` stub files — one per table: `posts.js`, `media.js`, `voiceProfiles.js`, `platformConnections.js`, `postAnalytics.js`, `aiSessions.js`, `platformGroups.js`, `contentPillars.js`, `publishLogs.js`
- [x] `client/src/lib/api.js` — Axios instance pointing at backend
- [x] `client/src/lib/platformLimits.js` — all platform limits centralised (LinkedIn, Facebook, X, Reddit)
- [x] `client/src/lib/utils.js` — date formatting, truncate, classNames helpers
- [x] `client/src/store/useAppStore.js` — Zustand store (draft, platform statuses, selected model, voice profiles, dark mode)
- [x] `client/src/App.jsx` — React Router v6 shell with sidebar nav and all 10 routes wired
- [x] Page stubs created: `Dashboard`, `Composer`, `Calendar`, `Analytics`, `Platforms`, `VoiceSetup`, `Groups`, `MediaLibrary`, `Settings`
- [x] Tailwind CSS configured via `@tailwindcss/vite` plugin
- [x] `client/vite.config.js` updated — Tailwind plugin + `/api` proxy to `localhost:3001`
- [x] `server/.env.example` — full backend env variable template
- [x] `client/.env.example` — frontend env variable template
- [x] Root `package.json` — `npm run dev` starts both client and server concurrently
- [x] `server/package.json` — `npm run dev` uses `node --watch`
- [x] Client production build verified (`vite build` — 0 errors, 246 kB JS bundle)
- [x] Server boot verified — all route stubs returning correct JSON

**Status: Completed**

---

### Stage 2: Database Schema & Data Layer
- [x] Full SQL schema written — `server/db/schema.sql` (run in Supabase SQL Editor to apply)
- [x] `posts` table — content, platform[], post_type, status, scheduled_at, platform_post_ids, target_group, metadata
- [x] `media_assets` table — storage_path, thumbnail_path, dimensions, alt_text, platform_media_ids, sort_order
- [x] `voice_profiles` table — sample_posts[], analysis JSONB, system_prompt
- [x] `platform_connections` table — access_token (encrypted), refresh_token, token_expires_at, scopes
- [x] `post_analytics` table — UNIQUE(post_id, platform)
- [x] `ai_sessions` table — messages JSONB, model, session_type
- [x] `platform_groups` table — UNIQUE(platform, group_id)
- [x] `content_pillars` table — name, color, post_count
- [x] `publish_logs` table — status, response JSONB, error
- [x] Schema applied in Supabase SQL Editor
- [x] Supabase Storage buckets created: `postly-media` (private)
- [x] All `server/db/` stub files replaced with real Supabase query implementations
  - `posts.js` — create, update, getById, getDue, markPublished, markFailed, getScheduled, getHistory, remove
  - `media.js` — create, getForPost, getById, updateAltText, updatePlatformMediaIds, remove, getLibrary
  - `voiceProfiles.js` — getByPlatform, upsert
  - `platformConnections.js` — getAll, getByPlatform, upsert, remove
  - `postAnalytics.js` — getForPost, upsert
  - `aiSessions.js` — create, getForPost, appendMessage
  - `platformGroups.js` — getByPlatform, upsert (bulk)
  - `contentPillars.js` — getAll, create, update, remove, incrementPostCount
  - `publishLogs.js` — record, getForPost

**Status: Completed**

---

### Stage 3: OAuth & Platform Connections
- [x] Token encryption middleware (`server/middleware/tokenCrypto.js`) — AES-256-CBC encrypt/decrypt
- [x] `requirePlatformAuth` middleware — decrypts token, auto-refreshes if within 5 min of expiry
- [x] LinkedIn OAuth flow — `getAuthUrl`, `exchangeCode`, `refreshToken`, `getProfile`; 2-step `registerUpload` + `uploadBinary`
- [x] Facebook OAuth flow — `exchangeCode`, `getLongLivedToken`, `getProfile`, `getGroups`; no refresh (re-auth on expiry)
- [x] X (Twitter) OAuth 2.0 + PKCE flow — `generatePKCE`, in-memory PKCE store, `exchangeCode(code, state)`, `refreshToken`, chunked `uploadMediaChunked`
- [x] Reddit OAuth flow — `exchangeCode` (HTTP Basic auth), `refreshToken`, `getProfile`, `getSubreddits`
- [x] `GET /api/platforms/status` — connected/expiring/expired/disconnected state for all 4 platforms
- [x] `GET /api/platforms/:platform/auth` — redirects to OAuth consent screen
- [x] `GET /api/platforms/:platform/callback` — exchanges code, saves encrypted tokens, redirects to frontend
- [x] `DELETE /api/platforms/:platform` — disconnect and remove token
- [x] `GET /api/platforms/:platform/groups` — Facebook groups + Reddit subreddits (synced to `platform_groups` table)
- [x] `server/config/platformLimits.js` — server-side limits for all 4 platforms
- [x] `server/services/media/storage.js` — Supabase Storage upload/getSignedUrl/remove/download
- [x] `POST /api/media/upload` — multer memory → platform limit validation → Supabase Storage → DB record
- [x] `DELETE /api/media/:id` — removes from Storage + DB
- [x] `GET /api/media/post/:postId` — all assets for a post (sorted by sort_order)
- [x] `GET /api/media/library` — paginated media library
- [x] `POST /api/media/:id/alt-text` — saves alt text (AI generation wired in Stage 4)
- [ ] Live OAuth flows tested end-to-end (requires platform app credentials in .env)

**Status: Code complete — requires .env credentials to test OAuth flows live**

---

### Stage 4: AI Engine & LinkedIn Features
- [x] `server/services/ai/openrouter.js` — OpenAI-compatible client (chat/stream/complete/visionComplete)
- [x] `POST /api/ai/compose` — streaming, voice profile injected for linkedin automatically
- [x] `POST /api/ai/autocomplete` — streaming, uses gpt-4o-mini for low latency
- [x] `POST /api/ai/rephrase` — streaming rephrase with optional instruction
- [x] `POST /api/ai/adapt` — streaming adaptation with platform-specific instructions
- [x] `POST /api/ai/score` — JSON: hookStrength, clarity, structure, predictedEngagement, suggestions
- [x] `POST /api/ai/hashtags` — JSON array of hashtag strings
- [x] `POST /api/ai/caption` — GPT-4o vision, generates caption from signed Supabase URL
- [x] `POST /api/ai/alt-text` — GPT-4o vision, generates screen-reader alt text
- [x] `POST /api/ai/hooks` — JSON: 5 hooks (question/bold-claim/statistic/personal-story/contrarian)
- [x] `POST /api/ai/repurpose` — streaming: longform | x-thread | reddit
- [x] `POST /api/ai/comment` — JSON: 3 comment styles (insightful/personal/open-question)
- [x] `POST /api/ai/suggest-pillar` — JSON: best content pillar for a draft
- [x] `GET /api/ai/models` — returns MODELS array with bestFor labels
- [x] `server/services/ai/voiceAnalyzer.js` — VOICE_ANALYSIS_SYSTEM_PROMPT + buildVoiceSystemPrompt helper
- [x] `POST /api/voice/analyze` — calls AI, parses JSON, saves to voice_profiles table
- [x] `GET /api/voice/:platform` — retrieve saved voice profile

**Status: Completed**

---

### Stage 5: React UI
- [x] `useAppStore.ts` — full state: currentPost, voiceProfiles, platformConnections, score, autocomplete
- [x] `lib/api.ts` — exports BASE_URL + `streamSSE()` helper for reading SSE streams
- [x] `lib/platformLimits.ts` — added `validateMediaForPlatforms`, `PLATFORM_COLORS`, `PLATFORM_LABELS`
- [x] `App.tsx` — grouped sidebar (Main / LinkedIn / Content / Account), platform dots at bottom
- [x] `components/media/MediaUploadZone.tsx` — react-dropzone, per-file upload, platform validation, alt-text inputs
- [x] `Dashboard.tsx` — stat cards, platform status, upcoming posts, quick compose
- [x] `Composer.tsx` — split panel: platform chips, textarea, ghost autocomplete (Tab to accept), character counters, media upload, AI chat panel with streaming, score card (auto after 1.5s), schedule modal
- [x] `Calendar.tsx` — month grid (date-fns), color-coded pills per platform, click-to-view side drawer, delete
- [x] `Analytics.tsx` — summary cards, CSS bar chart, sortable post table with engagement metrics
- [x] `Platforms.tsx` — configure credentials (clientId/secret + redirect URI shown), connect via OAuth redirect, disconnect, expiry states
- [x] `VoiceSetup.tsx` — platform tabs, sample posts textarea, analyze → display all 7 dimensions, save profile
- [x] `Groups.tsx` — sync Facebook groups + Reddit subreddits, Compose-for-group flow (pre-fills targetGroup in store)
- [x] `MediaLibrary.tsx` — paginated grid, filter by type, detail panel with delete
- [x] `Settings.tsx` — model selector, voice profile links, content pillars CRUD, best times, data export
- [x] TypeScript typecheck: 0 errors

**Status: Completed**

---

### Stage 6: Media, Scheduling & Publishing
- [x] `server/services/media/imageProcessor.js` — Sharp resize, HEIC→JPEG, thumbnail generation
- [x] `server/services/media/videoProcessor.js` — FFmpeg thumbnail extraction, duration validation
- [x] `server/services/media/storage.js` — Supabase Storage upload/download/delete helpers
- [x] `POST /api/media/upload` — full upload pipeline (multer → process → store → record)
- [x] `server/services/platforms/linkedin.js` — 2-step media upload + ugcPost publish
- [x] `server/services/platforms/twitter.js` — chunked media upload + tweet publish
- [x] `server/services/platforms/facebook.js` — photo/video upload + post publish
- [x] `server/services/platforms/reddit.js` — media upload + submission publish
- [x] `server/services/scheduler/cron.js` — node-cron every-minute scheduler
- [x] `POST /api/posts/:id/publish` — immediate publish flow
- [x] `POST /api/posts/:id/retry` — retry failed post
- [x] `server/services/publisher.js` — central publish coordinator: per-platform token refresh, per-platform media reprocessing, `publish_logs`, status rollup
- [x] `server/config/bestPostTimes.js` — default best-time suggestions per platform (6.8)
- [x] `server/routes/posts.js` — full CRUD: GET scheduled/history/:id, POST, PUT, DELETE, /publish, /retry
- [x] `server/routes/schedule.js` — `POST /trigger` (Supabase Edge Function backup) + `GET /status`
- [x] `server/index.js` — boots `startScheduler()` on listen (skippable via `DISABLE_SCHEDULER=true`)
- [x] `server/db/posts.js` — `getDue()` patched to catch overdue posts after outages (lower bound dropped, in-tick status flip prevents double-fire)
- [x] `server/services/media/storage.js` — `upload()` accepts `{ upsert }` option
- [x] `node --check` clean on all 16 new/changed server files; require-graph smoke-test passes; all 4 platform services expose `uploadMedia` + `publishPost`
- [ ] Live publish round-trips on LinkedIn / X / Facebook / Reddit (needs real OAuth credentials)
- [ ] Live cron firing in deployed environment (Railway/Render)

**Status: Completed (code) — live publish + deployed cron pending real credentials**

---

### Stage 7: Polish & Power Features
- [x] Keyboard shortcuts (`useKeyboardShortcuts` hook) — Ctrl+N new post, Ctrl+Shift+A focus AI, Ctrl+Shift+D dark mode, Ctrl+S save, Ctrl+Enter publish
- [x] Dark mode toggle + OS-aware default (`useDarkMode` hook) — reads `prefers-color-scheme`, persists to localStorage
- [x] Token expiry warning banner (7-day ahead alert) — `ExpiringTokensBanner` in Dashboard + OS notification via `notifications.ts`
- [x] Post scoring UI in Composer — auto-scores after 1.5s idle, `ScoreBar` component, 4 dimensions
- [x] Hook generator UI — "Hooks" toolbar button → modal with 5 hook types, click to prepend to post
- [x] Repurpose engine UI — "Repurpose" toolbar button → modal with X Thread / Reddit / Long-form format picker, streams result, Copy + Use as Post actions
- [x] Content pillars tagging in Composer — pill buttons below platform chips, stored in `currentPost.pillarId`
- [x] Post history search (full-text + filter) — search input + platform dropdown + post-type dropdown in Analytics, debounced re-fetch with query params
- [x] Data export (JSON/CSV) — wired in Settings; fetches history, generates blob, triggers browser download
- [x] `client/src/components/ui/PlatformIcon.tsx` — shared component rendering brand SVGs (linkedin, round-facebook, sharp-reddit, x-solid) by platform key
- [x] Brand-icon rollout — `Platforms.tsx` (replaced first-letter circle), `Dashboard.tsx` (replaced color dot), `Composer.tsx` (chips with active-state invert), `VoiceSetup.tsx` (tabs), `Settings.tsx` (Brand Voice list), `Groups.tsx` (section headers)
- [x] `client/src/index.css` — `.scrollbar-slim` (indigo-tinted 6px) + `.scrollbar-none` (hide entirely, keep scroll) utilities for WebKit + Firefox
- [x] Sidebar UX — `SidebarToggleIcon` SVG (panel-with-chevron, flips on `collapsed`), `.scrollbar-none` applied to sidebar, app logo hidden in collapsed state (only toggle button shows)
- [x] `client/src/lib/notifications.ts` — browser Notification API helpers: `requestNotificationPermission`, `notifyPostPublished`, `notifyPostFailed`, `notifyTokenExpiringSoon`
- [x] `App.tsx` — polls `/api/posts/recent` every 30s for status transitions; fires OS notifications; keyboard shortcut data-* hooks; dark mode applied at root
- [x] TypeScript typecheck: 0 errors

**Status: Completed**

---

### Stage 8: Authentication Layer
- [x] `bcryptjs`, `jsonwebtoken`, `cookie-parser` installed on server
- [x] `server/middleware/authUtils.js` — `verifyPassword` (bcrypt), `signToken` / `verifyToken` (JWT), `setSessionCookie` / `clearSessionCookie` helpers
- [x] `server/middleware/requireAuth.js` — reads `postly_session` httpOnly cookie, verifies JWT, passes 401 on failure
- [x] `server/routes/auth.js` — `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/verify`
- [x] `server/index.js` — `cookie-parser` added, CORS updated with `credentials: true`, `/api/auth` public, all other `/api/*` routes protected by `requireAuth`
- [x] `client/src/pages/Login.tsx` — dark centered password form, calls `/api/auth/login`, redirects to `/` on success
- [x] `useAppStore.ts` — `auth: { checked, authenticated }` state + `setAuth()` action added
- [x] `client/src/App.tsx` — `RequireAuth` guard component, `/login` route (public), session verify `useEffect` on mount, logout button in sidebar footer
- [x] `client/src/lib/api.ts` — axios `withCredentials: true`, dev-mode proxy routing (`baseURL: ''`), 401 interceptor redirects to `/login`; `streamSSE` uses `credentials: 'include'`
- [x] `server/.env.example` — `AUTH_PASSWORD_HASH`, `JWT_SECRET`, `SESSION_DURATION_HOURS` documented with generation commands
- [x] TypeScript typecheck: 0 errors; `node --check` clean on all server files
- [x] `server/middleware/authUtils.js` — `sameSite: 'none'` in production so session cookie is sent cross-origin (Vercel → Railway); fixes production redirect loop
- [x] `client/src/lib/api.ts` — 401 interceptor skips redirect for `/api/auth/*` endpoints; fixes error-disappears-on-wrong-password bug
- [x] `client/src/pages/Login.tsx` — `setAuth({ setupDone: true })` on successful login to prevent edge-case redirect to `/signup`

**Note:** Live auth requires `AUTH_PASSWORD_HASH` and `JWT_SECRET` set in the server environment.

**Status: Completed**

---

### Stage 9: Landing Page
- [ ] Public-facing showcase page
- [ ] Hero section
- [ ] Features section
- [ ] Deployed separately or as Vercel route

**Status: Not started**

---

### Stage 10: Carousel Feature Removed
- [x] Entire carousel feature stripped from frontend and backend (pages, components, services, routes, db helpers, schema, store slices, hotkeys, docs)
- [x] `server/db/migrations/drop-carousel.sql` written — run manually in Supabase SQL Editor to drop `carousels` / `carousel_templates` tables and the `posts.carousel_id` / `post_analytics.carousel_page_views` columns
- [ ] Drop migration executed against Supabase (manual)
- [ ] `postly-carousels` Storage bucket deleted (manual, via Supabase Storage UI)

**Status: Code removed — manual DB / Storage cleanup pending**
