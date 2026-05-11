# Postly ⚡

> Personal social media manager — write, schedule, and publish across LinkedIn, Facebook, X, and Reddit from one place.

---

## What It Does

Postly is a personal productivity tool built for one person. No sign-ups, no other users, no SaaS overhead. Just a fast, AI-powered interface for managing your social media presence without switching between four different apps.

- **Write once** — AI adapts your post for each platform's tone and format
- **LinkedIn-first** — carousel builder, hook generator, voice analyzer, and autocomplete all tuned for LinkedIn
- **Fully scheduled** — posts go out automatically, even when you're not at your computer
- **Media handled** — upload images, videos, and GIFs once; platform formatting is done server-side
- **Your voice, not AI voice** — paste your past posts, the AI learns your writing style and applies it to every draft

---

## Platforms

| Platform | Post | Schedule | Images | Videos | Carousels | Groups |
|---|---|---|---|---|---|---|
| LinkedIn | ✅ | ✅ | ✅ Up to 9 | ✅ | ✅ PDF | ❌ |
| Facebook | ✅ | ✅ | ✅ Up to 10 | ✅ | ✅ Album | ✅ |
| X (Twitter) | ✅ | ✅ | ✅ Up to 4 | ✅ | ❌ | ❌ |
| Reddit | ✅ | ✅ | ✅ Up to 20 | ✅ | ❌ | ✅ Subreddits |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript, Zustand, TailwindCSS |
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL) |
| File Storage | Supabase Storage |
| AI | OpenRouter (Claude, GPT-4o, Gemini, Llama) |
| Image processing | Sharp |
| Video processing | fluent-ffmpeg |
| PDF generation | pdf-lib (LinkedIn carousels) |
| Scheduler | node-cron (always-on via Railway/Render) |
| Frontend hosting | Vercel |
| Backend hosting | Railway or Render |

---

## Project Structure

```
postly/
├── client/                     # React frontend (deployed to Vercel)
│   ├── src/
│   │   ├── components/
│   │   │   ├── composer/       # Post editor, autocomplete, media zone
│   │   │   ├── carousel/       # LinkedIn carousel builder
│   │   │   ├── media/          # Upload zone, preview grid, video player
│   │   │   └── ui/             # Shared buttons, modals, badges
│   │   ├── pages/              # One file per route
│   │   ├── hooks/              # Custom hooks
│   │   ├── store/              # Zustand global state
│   │   └── lib/                # Axios instance, platform limits, utils
│   └── vite.config.js
│
└── server/                     # Express backend (deployed to Railway/Render)
    ├── routes/
    ├── controllers/
    ├── services/
    │   ├── ai/                 # OpenRouter, voice analyzer, carousel PDF
    │   ├── platforms/          # LinkedIn, Twitter, Facebook, Reddit
    │   ├── media/              # Image/video processing, Supabase Storage
    │   └── scheduler/          # Cron job
    ├── middleware/              # Token encryption, platform auth
    ├── db/                     # All Supabase queries (one file per table)
    └── index.js
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- An [OpenRouter](https://openrouter.ai) account and API key
- Developer app credentials for each platform you want to connect (see Platform Setup below)

### 1. Clone and install

```bash
git clone https://github.com/yourusername/postly.git
cd postly

# Install frontend dependencies
cd client && npm install

# Install backend dependencies
cd ../server && npm install
```

### 2. Set up environment variables

**Backend** — create `server/.env`:

```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenRouter
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=http://localhost:3001/api/platforms/linkedin/callback

# Facebook OAuth
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_REDIRECT_URI=http://localhost:3001/api/platforms/facebook/callback

# X (Twitter) OAuth
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
TWITTER_REDIRECT_URI=http://localhost:3001/api/platforms/x/callback

# Reddit OAuth
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_REDIRECT_URI=http://localhost:3001/api/platforms/reddit/callback

# Token encryption — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your_32_byte_hex_string
```

**Frontend** — create `client/.env`:

```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Set up the database

Open your Supabase project → SQL Editor → paste and run the full schema from `docs/02_Database_Schema.md`.

Then create two Storage buckets in your Supabase project:
- `postly-media` — set to **private**
- `postly-carousels` — set to **private**

### 4. Run the app

```bash
# From the project root
npm run dev
```

This starts both the React frontend (`localhost:5173`) and Express backend (`localhost:3001`) concurrently.

---

## Platform Setup

You need to create a developer app on each platform you want to use. Since this is a personal app running in development mode, no public app review is required — only your own account needs access.

### LinkedIn
1. Go to [linkedin.com/developers](https://www.linkedin.com/developers/) → Create app
2. Add OAuth 2.0 redirect URL: `http://localhost:3001/api/platforms/linkedin/callback`
3. Request scopes: `r_liteprofile`, `r_emailaddress`, `w_member_social`, `r_organization_social`
4. Copy Client ID and Client Secret to `.env`

### Facebook
1. Go to [developers.facebook.com](https://developers.facebook.com/) → Create app → Consumer type
2. Add Facebook Login product → set redirect URI: `http://localhost:3001/api/platforms/facebook/callback`
3. Permissions needed: `pages_manage_posts`, `groups_access_member_info`, `publish_to_groups`
4. Copy App ID and App Secret to `.env`

### X (Twitter)
1. Go to [developer.twitter.com](https://developer.twitter.com/) → Create project and app
2. Enable OAuth 2.0 → set callback URL: `http://localhost:3001/api/platforms/x/callback`
3. Scopes: `tweet.read tweet.write users.read offline.access media.write`
4. Copy Client ID and Client Secret to `.env`

### Reddit
1. Go to [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps/) → Create another app → type: **web app**
2. Set redirect URI: `http://localhost:3001/api/platforms/reddit/callback`
3. Scopes needed: `submit read identity mysubreddits`
4. Copy Client ID and Secret to `.env`

Once credentials are set, open the app → go to **Platforms** → click Connect for each platform.

---

## Deployment

### Frontend → Vercel

1. Push your repo to GitHub
2. Import the repo in [Vercel](https://vercel.com) → set root directory to `client`
3. Add environment variables in the Vercel dashboard (the `VITE_` prefixed vars)
4. Deploy — every push to `main` auto-deploys

### Backend → Railway or Render

1. Create a new service in [Railway](https://railway.app) or [Render](https://render.com)
2. Connect your GitHub repo → set root directory to `server`
3. Add all backend environment variables in the dashboard
4. Update all `_REDIRECT_URI` vars to use your production backend URL
5. Update `FRONTEND_URL` to your Vercel URL
6. Deploy — every push to `main` auto-deploys

> **Note:** The scheduling cron job runs inside the Express server process. As long as Railway/Render keeps your server running, scheduled posts will fire automatically — no separate worker needed.

---

## Features

### Post Composer
Write posts with a rich editor that shows character counts per platform, platform-specific validation warnings, and ghost-text AI autocomplete as you type.

### AI Writing
Generate full posts from a topic or bullet points using your choice of model (Claude, GPT-4o, Gemini, Llama) via OpenRouter. The AI uses your voice profile so everything sounds like you.

### Brand Voice Analyzer
Paste 5–15 of your best LinkedIn posts → AI extracts your tone, hook style, sentence length, structure, and signature phrases → saves a voice profile that's applied to every future LinkedIn draft.

### LinkedIn Carousel Builder
A three-panel editor: slide list on the left, live 1080×1080 canvas preview in the center, and slide properties on the right. AI generates the full slide content from a topic. Export as PDF and post directly to LinkedIn.

**Slide types:** Cover, Content, Image, Quote, Stat, CTA

**Built-in templates:** 5 Lessons, How I Did X, Myth vs Reality, Step-by-Step Guide

### Scheduling
Pick a date and time for any post. The server's cron job checks every minute and fires posts automatically. Best-time suggestions are shown per platform.

### Media Support
Drag and drop images, videos, or GIFs. They're processed server-side (Sharp for images, FFmpeg for videos) and uploaded to each platform's media API using the correct format and upload protocol.

### Groups & Subreddits
Browse your Facebook Groups and Reddit subreddits. Click any group to open the Composer pre-targeted to that community.

### Post Scoring
Before you publish, score your draft on hook strength, clarity, structure, and predicted engagement (0–10 each) with specific improvement suggestions.

### Hook Generator
Enter a topic → get 5 hook variations in your voice: question, bold claim, statistic, personal story, and contrarian. One click to use any of them as your opener.

### Repurpose Engine
Turn any published post into a carousel, long-form LinkedIn article, X thread, or Reddit post — all adapted to the target platform's tone.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+N` | New post |
| `Ctrl+Shift+C` | New carousel |
| `Ctrl+S` | Save draft |
| `Ctrl+Enter` | Publish / Schedule |
| `Tab` | Accept autocomplete suggestion |
| `Escape` | Dismiss autocomplete |
| `Ctrl+Shift+A` | Trigger AI write |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo (Carousel Builder) |

> On Mac, use `Cmd` instead of `Ctrl`.

---

## Maintenance

### Rotating API keys

**OpenRouter:** Go to Settings → API Key → enter new key. No server restart needed.

**Platform OAuth apps:** Update the secret in the platform's developer portal, then update `LINKEDIN_CLIENT_SECRET` (or equivalent) in your Railway/Render environment variables → redeploy.

### Reconnecting a platform

Platform tokens expire (LinkedIn and Facebook: ~60 days). A warning banner appears on the dashboard 7 days before expiry.

Go to **Platforms** → click **Reconnect** next to the expiring platform → approve OAuth → done. The new token is saved automatically.

### Updating your voice profile

Go to **Voice** → select the platform → paste your latest posts → click **Analyze My Voice** → **Save Profile**. The new profile is active immediately.

### Deploying updates

Push to the `main` branch. Vercel and Railway/Render both auto-deploy within ~2 minutes. No manual steps required.

### Debugging a failed scheduled post

1. Check the **Dashboard** — failed posts show in the red alert banner
2. Check the `publish_logs` table in Supabase — every publish attempt is logged with the full error message
3. Check Railway/Render server logs for any unhandled exceptions
4. Click **Retry** on the failed post once the issue is resolved

### Clearing old media

Go to **Media Library** — it shows your current Supabase Storage usage against the free tier limit (1 GB). Delete unused assets directly from the library. Files are removed from both the `media_assets` table and the Supabase Storage bucket.

---

## Documentation

All detailed documentation lives in the `docs/` folder:

| File | Contents |
|---|---|
| `docs/PRD.md` | Full product requirements document |
| `docs/CLAUDE.md` | AI coding assistant context (read this before asking Claude to code) |
| `docs/00_Index.md` | Build plan overview and stage map |
| `docs/01_Project_Setup.md` | Stage 1: scaffold, hosting, services |
| `docs/02_Database_Schema.md` | Stage 2: full SQL schema + data layer |
| `docs/03_OAuth_And_Platform_Connections.md` | Stage 3: OAuth + media upload APIs |
| `docs/04_AI_Engine_And_LinkedIn_Features.md` | Stage 4: AI engine + LinkedIn features |
| `docs/05_React_UI.md` | Stage 5: all pages and components |
| `docs/06_Media_Scheduling_Publishing.md` | Stage 6: media processing + publisher |
| `docs/07_Polish_And_Power_Features.md` | Stage 7: polish + power features |

---

## Known Limitations

- **LinkedIn groups** — LinkedIn's API does not support posting to groups. Group posts must be done manually on LinkedIn.
- **X free tier** — limited to 500 tweets/month. Sufficient for personal use.
- **No image generation** — Postly does not generate images. It writes captions and alt text for images you upload.
- **Supabase Storage free tier** — 1 GB limit. Shown in the Media Library.
- **LinkedIn token expiry** — tokens expire every 60 days and require a manual reconnect (the UI surfaces this with a 7-day warning).

---

*Postly is yours — built for one person, optimised for daily use, no compromises.*
