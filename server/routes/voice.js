const router   = require('express').Router();
const db       = require('../db');
const openrouter = require('../services/ai/openrouter');
const { VOICE_ANALYSIS_SYSTEM_PROMPT } = require('../services/ai/voiceAnalyzer');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/voice — list all saved voices
router.get('/', async (_req, res, next) => {
  try {
    res.json(await db.voiceProfiles.list());
  } catch (err) { next(err); }
});

// POST /api/voice/analyze  { samplePosts, platform, model?, name?, voiceId? }
// - voiceId provided  → re-analyze and update that voice
// - voiceId omitted   → create a new voice profile (name optional, auto-named otherwise)
router.post('/analyze', async (req, res, next) => {
  try {
    const { samplePosts, platform, model, name, voiceId } = req.body;
    if (!platform) return res.status(400).json({ error: 'platform required' });
    if (!Array.isArray(samplePosts) || samplePosts.length < 3) {
      return res.status(400).json({ error: 'At least 3 sample posts required' });
    }

    const combinedPosts = samplePosts.join('\n\n---\n\n');

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

    const payload = {
      platform,
      sample_posts: samplePosts,
      analysis,
      system_prompt: analysis.systemPrompt,
    };
    if (name) payload.name = name;

    const saved = voiceId
      ? await db.voiceProfiles.update(voiceId, payload)
      : await db.voiceProfiles.create({ ...payload, name: name || `${platform} voice` });

    res.json(saved);
  } catch (err) { next(err); }
});

// PUT /api/voice/:id — rename or set as default for its platform
router.put('/:id', async (req, res, next) => {
  try {
    const { name, isDefault } = req.body;
    if (isDefault) {
      const profile = await db.voiceProfiles.getById(req.params.id);
      await db.voiceProfiles.setDefault(req.params.id, profile.platform);
    }
    if (name !== undefined) {
      await db.voiceProfiles.update(req.params.id, { name });
    }
    res.json(await db.voiceProfiles.getById(req.params.id));
  } catch (err) { next(err); }
});

// DELETE /api/voice/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await db.voiceProfiles.remove(req.params.id);
    res.json({ deleted: req.params.id });
  } catch (err) { next(err); }
});

// GET /api/voice/:platformOrId — UUID returns one voice; platform name returns default
router.get('/:platformOrId', async (req, res, next) => {
  try {
    const param = req.params.platformOrId;
    if (UUID_RE.test(param)) {
      res.json(await db.voiceProfiles.getById(param));
      return;
    }
    const profile = await db.voiceProfiles.getByPlatform(param);
    if (!profile) return res.status(404).json({ error: `No voice profile found for ${param}` });
    res.json(profile);
  } catch (err) { next(err); }
});

module.exports = router;
