const router   = require('express').Router();
const db       = require('../db');
const openrouter = require('../services/ai/openrouter');
const { generateCarouselPDF } = require('../services/ai/carouselPDF');
const storage  = require('../services/media/storage');
const requirePlatformAuth = require('../middleware/requirePlatformAuth');
const linkedin = require('../services/platforms/linkedin');

const LINKEDIN_API = 'https://api.linkedin.com/v2';

function parseJsonSafe(text, fallback) {
  try {
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    return fallback;
  }
}

// POST /api/carousel/generate  { topic, slideCount?, templateId?, model? }
router.post('/generate', async (req, res, next) => {
  try {
    const { topic, slideCount = 7, templateId, model } = req.body;
    if (!topic) return res.status(400).json({ error: 'topic required' });

    const voiceProfile = await db.voiceProfiles.getByPlatform('linkedin');
    const voiceNote = voiceProfile?.system_prompt
      ? `\nVoice profile: ${voiceProfile.system_prompt}`
      : '';

    let structureNote = '';
    if (templateId) {
      const tmpl = await db.carouselTemplates.getById(templateId);
      if (tmpl) {
        const types = tmpl.slide_structure.map((s) => s.type).join(', ');
        structureNote = `\nUse this slide structure: ${types}`;
      }
    }

    const prompt = `Create a LinkedIn carousel on this topic: "${topic}"
${voiceNote}${structureNote}

Build ${slideCount} slides total:
- Slide 1: Cover with a hook headline (≤8 words) and short subtext
- Middle slides: One insight per slide — punchy headline (≤8 words), 1-2 sentence body (≤25 words)
  Include 1 stat slide and 1 quote slide if it fits naturally
- Last slide: CTA that matches the voice

Rules:
- Every headline must create curiosity or deliver immediate value
- Body text must be genuinely useful, not generic filler
- The cover headline must be impossible to scroll past

Return ONLY a JSON array of slide objects. No preamble, no markdown.

Schema: [{ "order": 1, "type": "cover", "headline": "...", "subtext": "..." }, { "order": 2, "type": "content", "headline": "...", "body": "...", "bulletPoints": [] }, ...]
Valid types: cover, content, stat, quote, cta
stat fields: statNumber, statLabel, body
quote fields: quote, attribution`;

    const rawText = await openrouter.complete({
      model: model || openrouter.DEFAULT_MODEL,
      systemPrompt: 'You are an expert LinkedIn carousel writer. Return ONLY valid JSON arrays.',
      messages: [{ role: 'user', content: prompt }],
    });

    const slides = parseJsonSafe(rawText, []);
    if (!Array.isArray(slides) || slides.length === 0) {
      return res.status(422).json({ error: 'AI returned invalid slide JSON — try again', raw: rawText });
    }

    res.json({ slides, topic });
  } catch (err) { next(err); }
});

// GET /api/carousel/templates
router.get('/templates', async (_req, res, next) => {
  try {
    const templates = await db.carouselTemplates.getAll();
    res.json(templates);
  } catch (err) { next(err); }
});

// POST /api/carousel  { title, slides, theme?, voiceProfileId? }
router.post('/', async (req, res, next) => {
  try {
    const { title, slides, theme, voiceProfileId, aiGenerated = false } = req.body;
    if (!title || !slides?.length) return res.status(400).json({ error: 'title and slides required' });

    const carousel = await db.carousels.create({
      title,
      slides,
      theme:           theme || {},
      slide_count:     slides.length,
      ai_generated:    aiGenerated,
      voice_profile_id: voiceProfileId || null,
    });
    res.status(201).json(carousel);
  } catch (err) { next(err); }
});

// GET /api/carousel/:id
router.get('/:id', async (req, res, next) => {
  try {
    const carousel = await db.carousels.getById(req.params.id);
    res.json(carousel);
  } catch (err) { next(err); }
});

// PUT /api/carousel/:id  { slides?, theme?, title? }
router.put('/:id', async (req, res, next) => {
  try {
    const { title, slides, theme, templateName } = req.body;
    const patch = {};
    if (title        !== undefined) patch.title         = title;
    if (slides       !== undefined) { patch.slides = slides; patch.slide_count = slides.length; }
    if (theme        !== undefined) patch.theme         = theme;
    if (templateName !== undefined) patch.template_name = templateName;

    const carousel = await db.carousels.update(req.params.id, patch);
    res.json(carousel);
  } catch (err) { next(err); }
});

// POST /api/carousel/:id/pdf
router.post('/:id/pdf', async (req, res, next) => {
  try {
    const carousel = await db.carousels.getById(req.params.id);
    if (!carousel.slides?.length) return res.status(400).json({ error: 'Carousel has no slides' });

    const pdfBuffer = await generateCarouselPDF(carousel);

    // Return signed URL so the client can preview the PDF
    const signedUrl = await storage.getSignedUrl(
      storage.CAROUSEL_BUCKET,
      `pdfs/${carousel.id}/carousel.pdf`,
      3600,
    );
    res.json({ pdfUrl: signedUrl, storagePath: `pdfs/${carousel.id}/carousel.pdf` });
  } catch (err) { next(err); }
});

// POST /api/carousel/:id/publish  { caption? }
router.post('/:id/publish', requirePlatformAuth('linkedin'), async (req, res, next) => {
  try {
    const carousel = await db.carousels.getById(req.params.id);
    if (!carousel.pdf_storage_path) {
      return res.status(400).json({ error: 'Generate the PDF first — call POST /api/carousel/:id/pdf' });
    }

    // Download PDF from Supabase
    const pdfBuffer = await storage.download(storage.CAROUSEL_BUCKET, carousel.pdf_storage_path);

    // 2-step LinkedIn document upload
    const { uploadUrl, assetUrn } = await linkedin.registerUpload(
      req.platformToken,
      req.platformAccountId,
      'urn:li:digitalmediaRecipe:feedshare-document',
    );
    await linkedin.uploadBinary(uploadUrl, pdfBuffer);

    // Post ugcPost as DOCUMENT
    const postBody = {
      author:         `urn:li:person:${req.platformAccountId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: req.body.caption || carousel.title },
          shareMediaCategory: 'DOCUMENT',
          media: [{ status: 'READY', media: assetUrn, title: { text: carousel.title } }],
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    };

    const result = await fetch(`${LINKEDIN_API}/ugcPosts`, {
      method: 'POST',
      headers: {
        Authorization:              `Bearer ${req.platformToken}`,
        'Content-Type':             'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(postBody),
    });
    const data = await result.json();
    if (!result.ok) throw new Error(`LinkedIn publish failed: ${JSON.stringify(data)}`);

    res.json({ success: true, linkedinPostId: data.id });
  } catch (err) { next(err); }
});

// POST /api/carousel/:id/save-template  { name, description? }
router.post('/:id/save-template', async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const carousel = await db.carousels.getById(req.params.id);

    // Strip content from slides — keep structure only
    const slideStructure = carousel.slides.map(({ order, type }) => ({ order, type }));

    const template = await db.carouselTemplates.create({
      name,
      description: description || null,
      slide_structure: slideStructure,
      theme:       carousel.theme,
      is_builtin:  false,
    });

    await db.carousels.update(carousel.id, { template_name: name });
    res.status(201).json(template);
  } catch (err) { next(err); }
});

module.exports = router;
