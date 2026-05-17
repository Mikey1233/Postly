-- Posts: add a free-text `context` column for the story/intent behind the post.
-- The composer surfaces this as a "Context" input above the draft. Every AI
-- generation route (compose, edit, hooks, rephrase, score, repurpose) reads
-- this field so suggestions are grounded in the writer's actual intent.
--
-- Apply once in the Supabase SQL Editor.

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS context TEXT;
