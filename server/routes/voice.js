const router   = require('express').Router();
const db       = require('../db');
const openrouter = require('../services/ai/openrouter');
const { VOICE_ANALYSIS_SYSTEM_PROMPT } = require('../services/ai/voiceAnalyzer');

// POST /api/voice/analyze  { samplePosts, platform, model? }
router.post('/analyze', async (req, res, next) => {
  try {
    const { samplePosts, platform, model } = req.body;
    if (!platform) return res.status(400).json({ error: 'platform required' });
    if (!Array.isArray(samplePosts) || samplePosts.length < 3) {
      return res.status(400).json({ error: 'At least 3 sample posts required' });
    }

    const combinedPosts = samplePosts.join('\n\n---\n\n');

    // Non-streaming — we need the full JSON before we can parse and save
    const rawText = await openrouter.complete({
      model: model || openrouter.DEFAULT_MODEL,
      systemPrompt: VOICE_ANALYSIS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: combinedPosts }],
    });

    let analysis;
    try {
      analysis = JSON.parse(rawText.replace(/```json\n?|\n?```/g, '').trim());
    } catch {
      return res.status(422).json({ error: 'AI returned invalid JSON — try again or use more sample posts', raw: rawText });
    }

    const saved = await db.voiceProfiles.upsert(platform, {
      sample_posts:  samplePosts,
      analysis,
      system_prompt: analysis.systemPrompt,
    });

    res.json(saved);
  } catch (err) { next(err); }
});

// GET /api/voice/:platform
router.get('/:platform', async (req, res, next) => {
  try {
    const profile = await db.voiceProfiles.getByPlatform(req.params.platform);
    if (!profile) return res.status(404).json({ error: `No voice profile found for ${req.params.platform}` });
    res.json(profile);
  } catch (err) { next(err); }
});

module.exports = router;
