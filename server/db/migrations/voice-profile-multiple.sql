-- Voice profiles: switch from "one row per platform" to "many named voices per platform".
-- Also makes publish_logs cascade so deleting a post from the Analytics page
-- doesn't trip a FK restriction.
--
-- Apply once in the Supabase SQL Editor.

-- 1. Add a name for each voice and a per-platform default flag.
ALTER TABLE voice_profiles
  ADD COLUMN IF NOT EXISTS name       TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Backfill names + mark existing rows as the platform default.
--    Each existing row becomes the default voice for its platform.
UPDATE voice_profiles
SET name       = COALESCE(NULLIF(name, ''), platform || ' voice'),
    is_default = TRUE
WHERE is_default = FALSE;

-- 3. Helpful index for the "pick a voice for this platform" lookup.
CREATE INDEX IF NOT EXISTS voice_profiles_platform_idx ON voice_profiles (platform);

-- 4. Make publish_logs cascade so deleting a post via /analytics also clears
--    its logs. The app helper already deletes them defensively, but cascade
--    makes the schema match the intent.
ALTER TABLE publish_logs
  DROP CONSTRAINT IF EXISTS publish_logs_post_id_fkey;
ALTER TABLE publish_logs
  ADD CONSTRAINT publish_logs_post_id_fkey
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
