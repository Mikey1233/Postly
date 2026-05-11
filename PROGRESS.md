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
- [ ] Full SQL schema written and run in Supabase SQL Editor (all 11 tables)
- [ ] `posts` table created with correct columns and constraints
- [ ] `media_assets` table created
- [ ] `carousels` table created (slides JSONB, theme JSONB)
- [ ] `carousel_templates` table created and 4 built-in templates seeded
- [ ] `voice_profiles` table created
- [ ] `platform_connections` table created (encrypted token columns)
- [ ] `post_analytics` table created
- [ ] `ai_sessions` table created
- [ ] `platform_groups` table created (UNIQUE platform+group_id)
- [ ] `content_pillars` table created
- [ ] `publish_logs` table created
- [ ] Supabase Storage buckets created: `postly-media` (private), `postly-carousels` (private)
- [ ] All `server/db/` stub files replaced with real Supabase query implementations

**Status: Not started**

---

### Stage 3: OAuth & Platform Connections
- [ ] Token encryption middleware (`server/middleware/tokenCrypto.js`) — AES-256 encrypt/decrypt
- [ ] `requirePlatformAuth` middleware (`server/middleware/requirePlatformAuth.js`)
- [ ] LinkedIn OAuth flow (`/auth` → `/callback` → token save)
- [ ] Facebook OAuth flow
- [ ] X (Twitter) OAuth 2.0 + PKCE flow
- [ ] Reddit OAuth flow
- [ ] `GET /api/platforms/status` — returns connection state for all 4 platforms
- [ ] `DELETE /api/platforms/:platform` — disconnect and remove token
- [ ] `GET /api/platforms/:platform/groups` — fetch Facebook groups / Reddit subreddits

**Status: Not started**

---

### Stage 4: AI Engine & LinkedIn Features
- [ ] `server/services/ai/openrouter.js` — OpenAI-compatible client pointed at OpenRouter
- [ ] `POST /api/ai/compose` — streaming post generation with voice profile injection
- [ ] `POST /api/ai/autocomplete` — streaming ghost-text with AbortController support
- [ ] `POST /api/ai/rephrase` — streaming rephrase
- [ ] `POST /api/ai/adapt` — adapt post for different platform
- [ ] `POST /api/ai/score` — post scoring (hook, clarity, structure, engagement)
- [ ] `POST /api/ai/hashtags` — hashtag suggestions
- [ ] `POST /api/ai/caption` — image caption (GPT-4o vision)
- [ ] `POST /api/ai/alt-text` — accessibility alt text (GPT-4o vision)
- [ ] `POST /api/ai/hooks` — 5 hook variations
- [ ] `POST /api/ai/repurpose` — repurpose published post
- [ ] `POST /api/ai/comment` — LinkedIn comment suggestions
- [ ] `GET /api/ai/models` — real model list from OpenRouter
- [ ] `server/services/ai/voiceAnalyzer.js` — extract voice profile from sample posts
- [ ] `POST /api/voice/analyze` — voice analysis endpoint
- [ ] `GET /api/voice/:platform` — retrieve saved voice profile
- [ ] `server/services/ai/carouselPDF.js` — LinkedIn carousel PDF generation (pdf-lib)
- [ ] `POST /api/carousel/generate` — AI slide content generation
- [ ] Carousel CRUD endpoints fully implemented

**Status: Not started**

---

### Stage 5: React UI
- [ ] Composer page — rich text editor, platform selector, character counters
- [ ] AI assistant panel in Composer
- [ ] Voice-aware autocomplete (ghost text, Tab to accept, AbortController debounce)
- [ ] Media upload zone in Composer (`react-dropzone`)
- [ ] Carousel Builder — three-panel layout (slide list, canvas, properties)
- [ ] Fabric.js canvas rendering per slide type (cover, content, image, quote, stat, CTA)
- [ ] Dashboard — stats, upcoming posts, failed post alerts
- [ ] Calendar page — month view, color-coded by platform
- [ ] Analytics page — per-post engagement data
- [ ] Platforms page — OAuth connect/disconnect UI
- [ ] Voice Setup page — sample post input + analysis results
- [ ] Groups page — Facebook groups + Reddit subreddits
- [ ] Media Library — grid view, type filter, reuse flow
- [ ] Settings page — models, pillars, themes, best times, API keys

**Status: Not started**

---

### Stage 6: Media, Scheduling & Publishing
- [ ] `server/services/media/imageProcessor.js` — Sharp resize, HEIC→JPEG, thumbnail generation
- [ ] `server/services/media/videoProcessor.js` — FFmpeg thumbnail extraction, duration validation
- [ ] `server/services/media/storage.js` — Supabase Storage upload/download/delete helpers
- [ ] `POST /api/media/upload` — full upload pipeline (multer → process → store → record)
- [ ] `server/services/platforms/linkedin.js` — 2-step media upload + ugcPost publish
- [ ] `server/services/platforms/twitter.js` — chunked media upload + tweet publish
- [ ] `server/services/platforms/facebook.js` — photo/video upload + post publish
- [ ] `server/services/platforms/reddit.js` — media upload + submission publish
- [ ] `server/services/scheduler/cron.js` — node-cron every-minute scheduler
- [ ] `POST /api/posts/:id/publish` — immediate publish flow
- [ ] `POST /api/posts/:id/retry` — retry failed post
- [ ] Carousel PDF publish flow (LinkedIn document post)

**Status: Not started**

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

**Status: Not started**

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
