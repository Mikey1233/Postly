-- Drop carousel feature — run manually in the Supabase SQL Editor.
-- This DOES NOT delete files from the postly-carousels Storage bucket;
-- delete the bucket separately from the Supabase Storage UI.
--
-- Safe to run multiple times (uses IF EXISTS).

BEGIN;

-- 1. Drop the carousel-specific column on posts.
ALTER TABLE posts DROP COLUMN IF EXISTS carousel_id;

-- 2. Drop the carousel-specific column on post_analytics.
ALTER TABLE post_analytics DROP COLUMN IF EXISTS carousel_page_views;

-- 3. Drop the carousel tables themselves.
DROP TABLE IF EXISTS carousel_templates;
DROP TABLE IF EXISTS carousels;

COMMIT;

-- Manual cleanup (not run by this script):
--   Storage → delete the `postly-carousels` bucket and its contents.
