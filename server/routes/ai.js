const router   = require('express').Router();
const db       = require('../db');
const openrouter = require('../services/ai/openrouter');
const { buildVoiceSystemPrompt } = require('../services/ai/voiceAnalyzer');
const storage  = require('../services/media/storage');

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getVoicePrompt(platform) {
  const profile = await db.voiceProfiles.getByPlatform(platform);
  return buildVoiceSystemPrompt(profile, platform);
}

function parseJsonSafe(text, fallback) {
  try {
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    return fallback;
  }
}

// ── Streaming routes ──────────────────────────────────────────────────────────

// POST /api/ai/compose  { topic, platform, model?, bulletPoints?, context? }
router.post('/compose', async (req, res, next) => {
  try {
    const { topic, platform = 'linkedin', model, bulletPoints, context } = req.body;
    if (!topic && !bulletPoints) return res.status(400).json({ error: 'topic or bulletPoints required' });

    const voiceSystemPrompt = await getVoicePrompt(platform);
    const systemPrompt = voiceSystemPrompt
      || `You are an expert ${platform} content writer. Write engaging, authentic posts.`;

    const input = bulletPoints?.length
      ? `Topic: ${topic || ''}\n\nKey points:\n${bulletPoints.map((b) => `- ${b}`).join('\n')}`
      : topic;

    const additionalContext = context ? `\n\nAdditional context: ${context}` : '';

    const stream = await openrouter.chat({
      model: model || openrouter.DEFAULT_MODEL,
      systemPrompt,
      messages: [{ role: 'user', content: `Write a ${platform} post about: ${input}${additionalContext}` }],
      stream: true,
    });
    await openrouter.streamToResponse(stream, res);
  } catch (err) { next(err); }
});

// POST /api/ai/autocomplete  { text, platform, model? }
router.post('/autocomplete', async (req, res, next) => {
  try {
    const { text, platform = 'linkedin', model } = req.body;
    if (!text || text.length < 20) return res.status(400).json({ error: 'text must be at least 20 characters' });

    const voiceProfile = await db.voiceProfiles.getByPlatform(platform);
    const voiceInstruction = voiceProfile?.system_prompt
      ? `${voiceProfile.system_prompt}\n\n`
      : '';

    const stream = await openrouter.chat({
      model: model || 'openai/gpt-4o-mini',
      systemPrompt: `${voiceInstruction}Complete the next 1-2 sentences of this ${platform} post naturally. Return ONLY the completion — no explanation, no preamble.`,
      messages: [{ role: 'user', content: text.slice(-300) }],
      stream: true,
    });
    await openrouter.streamToResponse(stream, res);
  } catch (err) { next(err); }
});

// POST /api/ai/rephrase  { content, platform, instruction?, model? }
router.post('/rephrase', async (req, res, next) => {
  try {
    const { content, platform = 'linkedin', instruction, model } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });

    const voiceSystemPrompt = await getVoicePrompt(platform);
    const systemPrompt = voiceSystemPrompt
      || `You are an expert ${platform} content editor. Rewrite posts to be more engaging.`;

    const extra = instruction ? ` Focus on: ${instruction}.` : '';
    const stream = await openrouter.chat({
      model: model || openrouter.DEFAULT_MODEL,
      systemPrompt,
      messages: [{ role: 'user', content: `Rephrase this ${platform} post while keeping the same message and voice.${extra}\n\n${content}` }],
      stream: true,
    });
    await openrouter.streamToResponse(stream, res);
  } catch (err) { next(err); }
});

// POST /api/ai/adapt  { content, fromPlatform, toPlatform, model? }
router.post('/adapt', async (req, res, next) => {
  try {
    const { content, fromPlatform, toPlatform, model } = req.body;
    if (!content || !toPlatform) return res.status(400).json({ error: 'content and toPlatform required' });

    const targetVoice = await getVoicePrompt(toPlatform);
    const systemPrompt = targetVoice
      || `You are an expert ${toPlatform} content writer.`;

    const adaptInstructions = {
      x:        'Condense to fit 280 characters per tweet. Convert to a thread if needed. Remove LinkedIn-specific cues.',
      reddit:   'Make conversational, remove self-promotion, add a community question at the end.',
      facebook: 'Make warmer and more personal. Add a question to drive comments.',
      linkedin: 'Make professional and insight-driven. Add relevant industry context.',
    };
    const instruction = adaptInstructions[toPlatform] || `Adapt for ${toPlatform}.`;

    const stream = await openrouter.chat({
      model: model || openrouter.DEFAULT_MODEL,
      systemPrompt,
      messages: [{
        role: 'user',
        content: `Adapt this ${fromPlatform || 'social media'} post for ${toPlatform}. ${instruction}\n\nOriginal:\n${content}`,
      }],
      stream: true,
    });
    await openrouter.streamToResponse(stream, res);
  } catch (err) { next(err); }
});

// POST /api/ai/repurpose  { postId, action, model? }
// action: 'longform' | 'x-thread' | 'reddit'
router.post('/repurpose', async (req, res, next) => {
  try {
    const { postId, action, model } = req.body;
    if (!postId || !action) return res.status(400).json({ error: 'postId and action required' });

    const post = await db.posts.getById(postId);

    const prompts = {
      longform: `Expand this LinkedIn post into a 600-800 word LinkedIn article or newsletter section. Keep the same insights but develop each point fully with examples and nuance.\n\nOriginal:\n${post.content}`,
      'x-thread': `Convert this LinkedIn post into a Twitter/X thread. Each tweet must be under 280 characters. Number each tweet (1/, 2/, etc). Break insights into individual punchy tweets. End with a CTA.\n\nOriginal:\n${post.content}`,
      reddit: `Adapt this post for Reddit. Make it conversational, remove self-promotion, focus on sharing knowledge with the community. End with a genuine question. Remove em-dashes and bullet points.\n\nOriginal:\n${post.content}`,
    };

    if (!prompts[action]) return res.status(400).json({ error: `Unknown action: ${action}` });

    const voiceSystemPrompt = await getVoicePrompt(post.platform?.[0] || 'linkedin');
    const stream = await openrouter.chat({
      model: model || openrouter.DEFAULT_MODEL,
      systemPrompt: voiceSystemPrompt || 'You are an expert content repurposer.',
      messages: [{ role: 'user', content: prompts[action] }],
      stream: true,
    });
    await openrouter.streamToResponse(stream, res);
  } catch (err) { next(err); }
});

// ── Non-streaming (JSON) routes ───────────────────────────────────────────────

// POST /api/ai/score  { content, platform, model? }
router.post('/score', async (req, res, next) => {
  try {
    const { content, platform = 'linkedin', model } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });

    const text = await openrouter.complete({
      model: model || openrouter.DEFAULT_MODEL,
      systemPrompt: 'You are a social media content analyst. Respond ONLY with valid JSON. No markdown fences.',
      messages: [{
        role: 'user',
        content: `Score this ${platform} post on 4 dimensions (0-10 each) and give 2-3 improvement suggestions.

Post:
${content}

Return ONLY JSON:
{
  "hookStrength": <0-10>,
  "clarity": <0-10>,
  "structure": <0-10>,
  "predictedEngagement": <0-10>,
  "suggestions": ["..."]
}`,
      }],
    });

    const score = parseJsonSafe(text, { hookStrength: 0, clarity: 0, structure: 0, predictedEngagement: 0, suggestions: [] });
    res.json(score);
  } catch (err) { next(err); }
});

// POST /api/ai/hashtags  { content, platform, count? }
router.post('/hashtags', async (req, res, next) => {
  try {
    const { content, platform = 'linkedin', count = 5 } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });

    const text = await openrouter.complete({
      model: 'openai/gpt-4o-mini',
      systemPrompt: 'You are a hashtag specialist. Respond ONLY with a JSON array of strings. No markdown.',
      messages: [{
        role: 'user',
        content: `Generate ${count} relevant hashtags for this ${platform} post. Return ONLY a JSON array: ["#tag1", "#tag2", ...]\n\nPost:\n${content}`,
      }],
    });

    const hashtags = parseJsonSafe(text, []);
    res.json({ hashtags });
  } catch (err) { next(err); }
});

// POST /api/ai/hooks  { topic, platform?, model? }
router.post('/hooks', async (req, res, next) => {
  try {
    const { topic, platform = 'linkedin', model } = req.body;
    if (!topic) return res.status(400).json({ error: 'topic required' });

    const voiceProfile = await db.voiceProfiles.getByPlatform(platform);
    const voiceNote = voiceProfile?.system_prompt
      ? `\n\nVoice profile: ${voiceProfile.system_prompt}`
      : '';

    const text = await openrouter.complete({
      model: model || openrouter.DEFAULT_MODEL,
      systemPrompt: 'You are a headline specialist. Respond ONLY with valid JSON. No markdown.',
      messages: [{
        role: 'user',
        content: `Generate 5 ${platform} post hooks for: "${topic}"

One hook for each style: question, bold-claim, statistic, personal-story, contrarian.
Each hook must be under 15 words. Make them impossible to scroll past.${voiceNote}

Return ONLY JSON: [{ "type": "question", "hook": "..." }, ...]`,
      }],
    });

    const hooks = parseJsonSafe(text, []);
    res.json({ hooks });
  } catch (err) { next(err); }
});

// POST /api/ai/comment  { postText, platform?, model? }
router.post('/comment', async (req, res, next) => {
  try {
    const { postText, platform = 'linkedin', model } = req.body;
    if (!postText) return res.status(400).json({ error: 'postText required' });

    const voiceProfile = await db.voiceProfiles.getByPlatform(platform);
    const voiceNote = voiceProfile?.system_prompt
      ? `\n\nYour voice: ${voiceProfile.system_prompt}`
      : '';

    const text = await openrouter.complete({
      model: model || openrouter.DEFAULT_MODEL,
      systemPrompt: 'You are a LinkedIn engagement expert. Respond ONLY with valid JSON. No markdown.',
      messages: [{
        role: 'user',
        content: `Write 3 thoughtful comment options for this ${platform} post:

"${postText}"${voiceNote}

Styles:
1. insightful-addition — add a perspective they didn't mention
2. personal-experience — relate it to something you've experienced
3. open-question — ask something that deepens the conversation

Return ONLY JSON: [{ "style": "insightful-addition", "comment": "..." }, ...]
Each comment under 60 words. Sound human, not sycophantic.`,
      }],
    });

    const comments = parseJsonSafe(text, []);
    res.json({ comments });
  } catch (err) { next(err); }
});

// POST /api/ai/caption  { mediaId, platform, context?, model? }
router.post('/caption', async (req, res, next) => {
  try {
    const { mediaId, platform = 'linkedin', context, model } = req.body;
    if (!mediaId) return res.status(400).json({ error: 'mediaId required' });

    const asset = await db.media.getById(mediaId);
    const signedUrl = await storage.getSignedUrl(storage.MEDIA_BUCKET, asset.storage_path, 120);

    const voiceProfile = await db.voiceProfiles.getByPlatform(platform);
    const voiceNote = voiceProfile?.system_prompt ? `\n\nVoice: ${voiceProfile.system_prompt}` : '';
    const contextNote = context ? `\n\nContext: ${context}` : '';

    const caption = await openrouter.visionComplete({
      model: model || 'openai/gpt-4o',
      imageUrl: signedUrl,
      prompt: `Write a compelling ${platform} caption for this image. Make it authentic and engaging.${voiceNote}${contextNote}\n\nReturn only the caption text.`,
    });

    res.json({ caption });
  } catch (err) { next(err); }
});

// POST /api/ai/alt-text  { mediaId }
router.post('/alt-text', async (req, res, next) => {
  try {
    const { mediaId } = req.body;
    if (!mediaId) return res.status(400).json({ error: 'mediaId required' });

    const asset = await db.media.getById(mediaId);
    const signedUrl = await storage.getSignedUrl(storage.MEDIA_BUCKET, asset.storage_path, 120);

    const altText = await openrouter.visionComplete({
      model: 'openai/gpt-4o',
      imageUrl: signedUrl,
      prompt: 'Describe this image in 1 sentence for a screen reader user. Be specific about content, objects, and mood. Under 125 characters.',
    });

    res.json({ altText: altText.trim() });
  } catch (err) { next(err); }
});

// POST /api/ai/suggest-pillar  { content, pillars }
router.post('/suggest-pillar', async (req, res, next) => {
  try {
    const { content, pillars } = req.body;
    if (!content || !pillars?.length) return res.status(400).json({ error: 'content and pillars required' });

    const text = await openrouter.complete({
      model: 'openai/gpt-4o-mini',
      systemPrompt: 'You are a content categorizer. Respond ONLY with valid JSON.',
      messages: [{
        role: 'user',
        content: `Which content pillar best fits this post? Choose exactly one from the list.

Pillars: ${pillars.map((p) => `"${p.name}" (id: ${p.id})`).join(', ')}

Post:
${content}

Return ONLY JSON: { "pillarId": "...", "pillarName": "..." }`,
      }],
    });

    const suggestion = parseJsonSafe(text, null);
    res.json({ suggestion });
  } catch (err) { next(err); }
});

// GET /api/ai/models
router.get('/models', (_req, res) => res.json({ models: openrouter.MODELS }));

module.exports = router;
