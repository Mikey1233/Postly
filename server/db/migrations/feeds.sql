-- RSS feeds — surfaces tech/AI/software news on /feeds so the owner can
-- spin articles into LinkedIn posts via the composer. Cron-polled every
-- 20 min by server/services/scheduler/cron.js.

CREATE TABLE IF NOT EXISTS feed_sources (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  url             TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'tech',  -- 'ai' | 'tech' | 'software'
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  last_polled_at  TIMESTAMPTZ,
  last_error      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS feed_sources_url_key ON feed_sources (url);
CREATE INDEX IF NOT EXISTS feed_sources_category_idx ON feed_sources (category) WHERE enabled = TRUE;

CREATE TABLE IF NOT EXISTS feed_items (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id     UUID NOT NULL REFERENCES feed_sources(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  url           TEXT NOT NULL,
  summary       TEXT,
  author        TEXT,
  image_url     TEXT,
  published_at  TIMESTAMPTZ,
  fetched_at    TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS feed_items_url_key ON feed_items (url);
CREATE INDEX IF NOT EXISTS feed_items_published_at_idx ON feed_items (published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS feed_items_source_id_idx ON feed_items (source_id);

-- Starter sources. Safe to re-run — ON CONFLICT keeps the existing row.
INSERT INTO feed_sources (name, url, category) VALUES
  ('Hacker News',         'https://hnrss.org/frontpage',                                    'tech'),
  ('The Verge',           'https://www.theverge.com/rss/index.xml',                         'tech'),
  ('Ars Technica',        'https://feeds.arstechnica.com/arstechnica/index',                'tech'),
  ('TechCrunch AI',       'https://techcrunch.com/category/artificial-intelligence/feed/',  'ai'),
  ('Simon Willison',      'https://simonwillison.net/atom/everything/',                     'ai'),
  ('OpenAI Blog',         'https://openai.com/blog/rss.xml',                                'ai'),
  ('Anthropic News',      'https://www.anthropic.com/news/rss.xml',                         'ai'),
  ('GitHub Blog',         'https://github.blog/feed/',                                      'software')
ON CONFLICT (url) DO NOTHING;
