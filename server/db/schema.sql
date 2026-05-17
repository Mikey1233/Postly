-- Postly — Stage 2 Schema
-- Run these in order in the Supabase SQL Editor.

-- Brand voice profiles — many per platform, each with a user-chosen name.
-- Exactly one row per platform should have is_default = TRUE; the app uses
-- that row when an AI call doesn't pass an explicit voiceId.
CREATE TABLE voice_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  sample_posts TEXT[] NOT NULL,
  analysis JSONB,
  system_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX voice_profiles_platform_idx ON voice_profiles (platform);

-- All posts: drafts, scheduled, published, failed
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  context TEXT,
  platform TEXT[] NOT NULL,
  post_type TEXT DEFAULT 'text',
  status TEXT DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  platform_post_ids JSONB,
  ai_generated BOOLEAN DEFAULT FALSE,
  voice_profile_id UUID REFERENCES voice_profiles(id),
  target_group JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media assets: images, videos, GIFs attached to posts
CREATE TABLE media_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  dimensions JSONB,
  duration_seconds NUMERIC,
  thumbnail_path TEXT,
  alt_text TEXT,
  platform_media_ids JSONB,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social platform OAuth tokens
CREATE TABLE platform_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  account_name TEXT,
  account_id TEXT,
  scopes TEXT[],
  metadata JSONB,
  connected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post analytics fetched from platform APIs
CREATE TABLE post_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  video_views INTEGER DEFAULT 0,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, platform)
);

-- AI conversation history per post session
CREATE TABLE ai_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  session_type TEXT,
  messages JSONB NOT NULL,
  model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Groups and subreddits synced from platform APIs
CREATE TABLE platform_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  group_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  member_count INTEGER,
  metadata JSONB,
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, group_id)
);

-- LinkedIn content pillars
CREATE TABLE content_pillars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Publishing attempt logs
CREATE TABLE publish_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  status TEXT,
  response JSONB,
  error TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── App config (added Stage 8) ───────────────────────────────────────────────
-- Stores server-side configuration that must survive deploys.
-- Currently holds the bcrypt password hash set via the /signup page.
CREATE TABLE IF NOT EXISTS app_config (
  key        TEXT PRIMARY KEY,
  value      TEXT        NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Storage Buckets ───────────────────────────────────────────────────────────
-- Run these in the Supabase Storage section (or via API):
--   bucket: postly-media    (private)
