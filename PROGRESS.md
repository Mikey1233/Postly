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
- [x] All 7 route stubs created and returning 200 JSON responses (`ai`, `posts`, `platforms`, `voice`, `media`, `carousel`, `schedule`)
- [x] `/health` endpoint live on Express server
- [x] `server/db/supabase.js` — Supabase client using `service_role_key`
- [x] `server/db/index.js` — DB index exporting all 11 table helpers
- [x] `server/db/` stub files — one per table: `posts.js`, `media.js`, `carousels.js`, `carouselTemplates.js`, `voiceProfiles.js`, `platformConnections.js`, `postAnalytics.js`, `aiSessions.js`, `platformGroups.js`, `contentPillars.js`, `publishLogs.js`
- [x] `client/src/lib/api.js` — Axios instance pointing at backend
- [x] `client/src/lib/platformLimits.js` — all platform limits centralised (LinkedIn, Facebook, X, Reddit)
- [x] `client/src/lib/utils.js` — date formatting, truncate, classNames helpers
- [x] `client/src/store/useAppStore.js` — Zustand store (draft, platform statuses, selected model, voice profiles, dark mode)
- [x] `client/src/App.jsx` — React Router v6 shell with sidebar nav and all 10 routes wired
- [x] Page stubs created: `Dashboard`, `Composer`, `CarouselBuilder`, `Calendar`, `Analytics`, `Platforms`, `VoiceSetup`, `Groups`, `MediaLibrary`, `Settings`
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
- [x] `posts` table — content, platform[], post_type, status, scheduled_at, platform_post_ids, carousel_id, target_group, metadata
- [x] `media_assets` table — storage_path, thumbnail_path, dimensions, alt_text, platform_media_ids, sort_order
- [x] `carousels` table — slides JSONB, theme JSONB, pdf_storage_path
- [x] `carousel_templates` table — 4 built-in templates seeded (5 Lessons, How I Did X, Myth vs Reality, Step-by-Step Guide)
- [x] `voice_profiles` table — sample_posts[], analysis JSONB, system_prompt
- [x] `platform_connections` table — access_token (encrypted), refresh_token, token_expires_at, scopes
- [x] `post_analytics` table — UNIQUE(post_id, platform), carousel_page_views JSONB
- [x] `ai_sessions` table — messages JSONB, model, session_type
- [x] `platform_groups` table — UNIQUE(platform, group_id)
- [x] `content_pillars` table — name, color, post_count
- [x] `publish_logs` table — status, response JSONB, error
- [x] Schema applied in Supabase SQL Editor
- [x] Supabase Storage buckets created: `postly-media` (private), `postly-carousels` (private)
- [x] All `server/db/` stub files replaced with real Supabase query implementations
  - `posts.js` — create, update, getById, getDue, markPublished, markFailed, getScheduled, getHistory, remove
  - `media.js` — create, getForPost, getById, updateAltText, updatePlatformMediaIds, remove, getLibrary
  - `carousels.js` — create, getById, update, remove
  - `carouselTemplates.js` — getAll, getById, create, remove
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
- [x] `server/services/ai/carouselPDF.js` — pdf-lib 1080×1080 PDF: cover/content/stat/quote/cta renderers, logo embed, Supabase upload
- [x] `POST /api/carousel/generate` — AI generates slide JSON from topic + voice profile
- [x] `POST /api/carousel` — create carousel
- [x] `GET /api/carousel/:id` — fetch carousel by ID
- [x] `PUT /api/carousel/:id` — update slides/theme/title
- [x] `GET /api/carousel/templates` — list templates (built-in first)
- [x] `POST /api/carousel/:id/pdf` — generate PDF → upload to postly-carousels → return signed URL
- [x] `POST /api/carousel/:id/publish` — download PDF → LinkedIn 2-step document upload → ugcPost
- [x] `POST /api/carousel/:id/save-template` — strip content, save structure as template

**Status: Completed**

---

### Stage 5: React UI
- [x] `useAppStore.ts` — full state: currentPost, carouselEditor, voiceProfiles, platformConnections, score, autocomplete
- [x] `lib/api.ts` — exports BASE_URL + `streamSSE()` helper for reading SSE streams
- [x] `lib/platformLimits.ts` — added `validateMediaForPlatforms`, `PLATFORM_COLORS`, `PLATFORM_LABELS`
- [x] `App.tsx` — grouped sidebar (Main / LinkedIn / Content / Account), platform dots at bottom
- [x] `components/media/MediaUploadZone.tsx` — react-dropzone, per-file upload, platform validation, alt-text inputs
- [x] `Dashboard.tsx` — stat cards, platform status, upcoming posts, quick compose
- [x] `Composer.tsx` — split panel: platform chips, textarea, ghost autocomplete (Tab to accept), character counters, media upload, AI chat panel with streaming, score card (auto after 1.5s), schedule modal
- [x] `CarouselBuilder.tsx` — 3-panel: slide list + CSS live preview + slide/theme editor; AI Generate modal, Template picker, Generate PDF, Post to LinkedIn
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
- [x] Carousel PDF publish flow (LinkedIn document post)
- [x] `server/services/publisher.js` — central publish coordinator: per-platform token refresh, carousel routing, per-platform media reprocessing, `publish_logs`, status rollup
- [x] `server/config/bestPostTimes.js` — default best-time suggestions per platform (6.8)
- [x] `server/routes/posts.js` — full CRUD: GET scheduled/history/:id, POST, PUT, DELETE, /publish, /retry
- [x] `server/routes/schedule.js` — `POST /trigger` (Supabase Edge Function backup) + `GET /status`
- [x] `server/index.js` — boots `startScheduler()` on listen (skippable via `DISABLE_SCHEDULER=true`)
- [x] `server/db/posts.js` — `getDue()` patched to catch overdue posts after outages (lower bound dropped, in-tick status flip prevents double-fire)
- [x] `server/services/ai/carouselPDF.js` — PDF upload uses `upsert: true` so retries don't collide
- [x] `server/services/media/storage.js` — `upload()` accepts `{ upsert }` option
- [x] `node --check` clean on all 16 new/changed server files; require-graph smoke-test passes; all 4 platform services expose `uploadMedia` + `publishPost`
- [ ] Live publish round-trips on LinkedIn / X / Facebook / Reddit (needs real OAuth credentials)
- [ ] Live cron firing in deployed environment (Railway/Render)

**Status: Completed (code) — live publish + deployed cron pending real credentials**

---

### Stage 7: Polish & Power Features
- [ ] Keyboard shortcuts (`useKeyboardShortcuts` hook) — Ctrl+N, Ctrl+S, Ctrl+Enter, Tab, Escape, etc.
- [ ] Dark mode toggle + OS-aware default (`useDarkMode` hook)
- [ ] Token expiry warning banner (7-day ahead alert)
- [ ] Post scoring UI in Composer
- [ ] Hook generator UI
- [ ] Repurpose engine UI
- [ ] Content pillars tagging in Composer
- [ ] Post history search (full-text + filter)
- [ ] Data export (JSON/CSV)
- [x] `client/src/components/ui/PlatformIcon.tsx` — shared component rendering brand SVGs (linkedin, round-facebook, sharp-reddit, x-solid) by platform key
- [x] Brand-icon rollout — `Platforms.tsx` (replaced first-letter circle), `Dashboard.tsx` (replaced color dot), `Composer.tsx` (chips with active-state invert), `VoiceSetup.tsx` (tabs), `Settings.tsx` (Brand Voice list), `Groups.tsx` (section headers)
- [x] `client/src/index.css` — `.scrollbar-slim` (indigo-tinted 6px) + `.scrollbar-none` (hide entirely, keep scroll) utilities for WebKit + Firefox
- [x] Sidebar UX — `SidebarToggleIcon` SVG (panel-with-chevron, flips on `collapsed`), `.scrollbar-none` applied to sidebar, app logo hidden in collapsed state (only toggle button shows)

**Status: In progress**

---

### Stage 8: Authentication Layer
- [ ] Single-user password login
- [ ] JWT session cookie
- [ ] Protected routes (server middleware + client guard)

**Status: Not started**

---

### Stage 9: Landing Page
- [ ] Public-facing showcase page
- [ ] Hero section
- [ ] Features section
- [ ] AI / carousel highlights
- [ ] Deployed separately or as Vercel route

**Status: Not started**
