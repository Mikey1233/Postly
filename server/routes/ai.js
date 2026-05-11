const router = require('express').Router();

router.post('/compose',    (_req, res) => res.json({ stub: 'POST /api/ai/compose' }));
router.post('/autocomplete', (_req, res) => res.json({ stub: 'POST /api/ai/autocomplete' }));
router.post('/rephrase',   (_req, res) => res.json({ stub: 'POST /api/ai/rephrase' }));
router.post('/adapt',      (_req, res) => res.json({ stub: 'POST /api/ai/adapt' }));
router.post('/score',      (_req, res) => res.json({ stub: 'POST /api/ai/score' }));
router.post('/hashtags',   (_req, res) => res.json({ stub: 'POST /api/ai/hashtags' }));
router.post('/caption',    (_req, res) => res.json({ stub: 'POST /api/ai/caption' }));
router.post('/alt-text',   (_req, res) => res.json({ stub: 'POST /api/ai/alt-text' }));
router.post('/hooks',      (_req, res) => res.json({ stub: 'POST /api/ai/hooks' }));
router.post('/repurpose',  (_req, res) => res.json({ stub: 'POST /api/ai/repurpose' }));
router.post('/comment',    (_req, res) => res.json({ stub: 'POST /api/ai/comment' }));
router.get('/models',      (_req, res) => res.json({
  models: [
    { id: 'anthropic/claude-sonnet-4-5', name: 'Claude Sonnet 4.5', bestFor: 'Long-form posts, carousels, voice analysis' },
    { id: 'openai/gpt-4o',              name: 'GPT-4o',             bestFor: 'General writing, image captions' },
    { id: 'openai/gpt-4o-mini',         name: 'GPT-4o Mini',        bestFor: 'Autocomplete (low latency)' },
    { id: 'google/gemini-pro-1.5',      name: 'Gemini Pro 1.5',     bestFor: 'Voice analysis with many sample posts' },
    { id: 'meta-llama/llama-3.1-70b',   name: 'Llama 3.1 70B',     bestFor: 'Alternative general-purpose' },
  ],
}));

module.exports = router;
