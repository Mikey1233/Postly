-- Postly — Stage 2 Schema
-- Run these in order in the Supabase SQL Editor.

-- Brand voice profiles per platform
CREATE TABLE voice_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  sample_posts TEXT[] NOT NULL,
  analysis JSONB,
  system_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- All posts: drafts, scheduled, published, failed
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  platform TEXT[] NOT NULL,
  post_type TEXT DEFAULT 'text',
  status TEXT DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  platform_post_ids JSONB,
  ai_generated BOOLEAN DEFAULT FALSE,
  voice_profile_id UUID REFERENCES voice_profiles(id),
  carousel_id UUID,
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

-- LinkedIn carousels
CREATE TABLE carousels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slides JSONB NOT NULL,
  theme JSONB,
  pdf_storage_path TEXT,
  slide_count INTEGER,
  template_name TEXT,
  ai_generated BOOLEAN DEFAULT FALSE,
  voice_profile_id UUID REFERENCES voice_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Carousel templates (structure only)
CREATE TABLE carousel_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  slide_structure JSONB NOT NULL,
  theme JSONB,
  is_builtin BOOLEAN DEFAULT FALSE,
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
  carousel_page_views JSONB,
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
  post_id UUID REFERENCES posts(id),
  platform TEXT NOT NULL,
  status TEXT,
  response JSONB,
  error TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Seed Data ────────────────────────────────────────────────────────────────

INSERT INTO carousel_templates (name, description, slide_structure, is_builtin) VALUES
(
  '5 Lessons',
  'Share five key lessons you learned from a topic or experience.',
  '[
    {"order":1,"type":"cover"},
    {"order":2,"type":"content"},
    {"order":3,"type":"content"},
    {"order":4,"type":"content"},
    {"order":5,"type":"content"},
    {"order":6,"type":"content"},
    {"order":7,"type":"cta"}
  ]',
  true
),
(
  'How I Did X',
  'Walk through how you accomplished something step by step.',
  '[
    {"order":1,"type":"cover"},
    {"order":2,"type":"content"},
    {"order":3,"type":"content"},
    {"order":4,"type":"content"},
    {"order":5,"type":"content"},
    {"order":6,"type":"stat"},
    {"order":7,"type":"cta"}
  ]',
  true
),
(
  'Myth vs Reality',
  'Bust common misconceptions in your industry.',
  '[
    {"order":1,"type":"cover"},
    {"order":2,"type":"quote"},
    {"order":3,"type":"content"},
    {"order":4,"type":"quote"},
    {"order":5,"type":"content"},
    {"order":6,"type":"quote"},
    {"order":7,"type":"content"},
    {"order":8,"type":"cta"}
  ]',
  true
),
(
  'Step-by-Step Guide',
  'Teach your audience a process from start to finish.',
  '[
    {"order":1,"type":"cover"},
    {"order":2,"type":"content"},
    {"order":3,"type":"content"},
    {"order":4,"type":"content"},
    {"order":5,"type":"content"},
    {"order":6,"type":"content"},
    {"order":7,"type":"stat"},
    {"order":8,"type":"cta"}
  ]',
  true
);

-- ── Storage Buckets ───────────────────────────────────────────────────────────
-- Run these in the Supabase Storage section (or via API):
--   bucket: postly-media    (private)
--   bucket: postly-carousels (private)
