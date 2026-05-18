-- Available AI models — DB-backed so the owner can add/remove model IDs
-- from the Settings page without redeploying. Previously hardcoded in
-- server/services/ai/openrouter.js. The /api/ai/models route now reads
-- from here.

CREATE TABLE IF NOT EXISTS ai_models (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  openrouter_id   TEXT NOT NULL,
  name            TEXT NOT NULL,
  best_for        TEXT,
  context_k       INTEGER,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_models_openrouter_id_key
  ON ai_models (openrouter_id);

-- Seed: 4 retained + 4 new. Safe to re-run.
INSERT INTO ai_models (openrouter_id, name, best_for, context_k) VALUES
  ('anthropic/claude-sonnet-4-6',   'Claude Sonnet 4.6',     'Creative writing, structured output (recommended)', 200),
  ('anthropic/claude-sonnet-4-5',   'Claude Sonnet 4.5',     'Long-form posts, voice analysis',                   200),
  ('google/gemini-2.5-pro-preview', 'Gemini 2.5 Pro',        'Deep research, large voice analysis sets',         1000),
  ('openai/gpt-4o',                 'GPT-4o',                'General writing, image captions',                   128),
  ('anthropic/claude-opus-4.7-fast','Claude Opus 4.7 Fast',  'Top-tier reasoning, fast variant',                  200),
  ('google/gemini-3.1-flash-lite',  'Gemini 3.1 Flash Lite', 'High-throughput, low-latency generation',          1000),
  ('x-ai/grok-4.3',                 'Grok 4.3',              'Alternative voice, current-events aware',           128),
  ('openai/gpt-5.5-pro',            'GPT-5.5 Pro',           'Premium OpenAI for complex posts',                  256)
ON CONFLICT (openrouter_id) DO NOTHING;
