const router   = require('express').Router();
const db       = require('../db');
const openrouter = require('../services/ai/openrouter');
const { generateCarouselPDF, generateDesignedCarouselPDF } = require('../services/ai/carouselPDF');
const storage  = require('../services/media/storage');
const requirePlatformAuth = require('../middleware/requirePlatformAuth');
const linkedin = require('../services/platforms/linkedin');
const nanobanana = require('../services/ai/nanobanana');
const { buildSlidePrompt } = require('../services/ai/slideDesignPrompt');
const patterns    = require('../services/carousel/patterns');
const svgRenderer = require('../services/carousel/svgRenderer');

function parseJsonSafe(text, fallback) {
  try {
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    return fallback;
  }
}

// ── Viral carousel prompt engine ─────────────────────────────────────────────

const VIRAL_SYSTEM_PROMPT = `You are a world-class LinkedIn carousel strategist and senior copywriter.

Your job: take one idea and turn it into a 10-slide carousel that gets swipes, saves, and comments.

CORE TRUTH: High-performing carousels don't fail because they look bad — they fail because the idea is blurry.
A carousel is not an essay split into 10 slides. It is a structure that helps your audience consume one idea faster.

THE THREE FORMATS (you must pick one before writing):
1. CHECKLIST — practical content people want to save. "X things to fix before you…"
2. FRAMEWORK — teaching a repeatable system. "The 3-part formula I use to…"
3. MISTAKE — calling out what's holding people back. "Stop doing this if you want…"

THE NORTH STAR RULE: Before writing slide 1, complete this sentence internally:
"After reading this carousel, the reader will ___."
Every slide must serve that sentence. If a slide doesn't contribute to it, cut it.

SLIDE ROLES (non-negotiable):
• Slide 1 = HOOK. A promise or a punch — NOT a title or topic label.
  ✓ "This is why your LinkedIn posts don't get traction."
  ✓ "Most people waste 10 slides saying nothing."
  ✗ "LinkedIn Content Tips" — this is a title, not a hook.
• Slide 2 = SETUP. Answer: "Why should I care?" Define the problem. Make the reader feel seen. 2–3 lines.
• Slides 3–7 = MAIN POINTS. One slide = one clear takeaway. No paragraphs. No long explanations.
  If you're writing too much on one slide, you're teaching two ideas at once.
• Slide 8 = THE SAVE MOMENT. Call out the #1 common mistake the audience makes about this topic.
  People save carousels when they think: "Wait… I do this."
  This is the most important slide for saves and shares.
• Slide 9 = SUMMARY. One clean sentence that lands the lesson. Like a destination reached.
  Example: "One idea → one structure → swipeable delivery."
• Slide 10 = CTA. One simple direction. Do not overdo it.

WRITING RULES:
- One slide = one idea. Never two.
- No paragraphs. Short sentences only.
- Hooks are promises or punches, never titles.
- Body text: 1–2 lines max. If it needs more, split into another slide.
- Write like you're talking to one person who is about to swipe away.
- No fluff, no generic inspiration, no textbook language.

OUTPUT: Return ONLY a valid JSON array. No preamble, no markdown fences, no explanation.`;

function buildViralPrompt({ topic, targetAudience, contentGoal, ctaKeyword, format, voiceNote }) {
  const formatLine = format && format !== 'auto'
    ? `CAROUSEL FORMAT: ${format.toUpperCase()} — build the main slides (3–7) around this structure.`
    : `CAROUSEL FORMAT: Choose the best one (Checklist, Framework, or Mistake) for this topic.`;

  return `Create a 10-slide LinkedIn carousel.

TOPIC: ${topic}
TARGET AUDIENCE: ${targetAudience || 'LinkedIn professionals'}
CONTENT GOAL: ${contentGoal || 'Educate'}
${ctaKeyword ? `CTA KEYWORD: "${ctaKeyword}"` : ''}
${formatLine}
${voiceNote}

SLIDE-BY-SLIDE INSTRUCTIONS:

Slide 1 — HOOK
A promise or a punch. 5–10 words. Impossible to scroll past.
NOT a topic label — a reason to keep reading.

Slide 2 — SETUP
Why should the reader care? Define the problem in 2–3 short lines.
Make them feel seen. Don't reveal the solution yet.

Slides 3–7 — MAIN POINTS (one idea each, shaped by the chosen format)
Each slide: one headline + 1–2 lines of body. No lists unless genuinely needed.
If it reads like a textbook, rewrite it.

Slide 8 — THE SAVE MOMENT (common mistake)
The #1 mistake this audience makes about the topic.
Write it so the reader thinks: "Oh no… I do this."
This is why people hit Save. Make it land.

Slide 9 — SUMMARY
One sentence that captures the whole lesson. Clean. Punchy. Final.
Format: "[action] → [action] → [result]" or similar.

Slide 10 — CTA
${ctaKeyword
    ? `Ask readers to comment "${ctaKeyword}" to receive the resource.`
    : 'One clear direction: save this, follow for more, or comment to engage.'}

RETURN ONLY THIS JSON ARRAY — no other text, no markdown fences:
[
  { "order": 1, "type": "cover", "headline": "hook — promise or punch, 5-10 words", "subtext": "one-line teaser that earns the swipe" },
  { "order": 2, "type": "content", "headline": "setup headline ≤8 words", "body": "2-3 lines: define the problem, make them feel seen" },
  { "order": 3, "type": "content", "headline": "main point ≤8 words", "body": "1-2 lines of value" },
  { "order": 4, "type": "content", "headline": "main point ≤8 words", "body": "1-2 lines of value" },
  { "order": 5, "type": "content", "headline": "main point ≤8 words", "body": "1-2 lines of value" },
  { "order": 6, "type": "content", "headline": "main point ≤8 words", "body": "1-2 lines of value" },
  { "order": 7, "type": "CHOOSE stat OR quote OR content", "headline": "if content", "body": "if content", "statNumber": "if stat", "statLabel": "if stat", "quote": "if quote", "attribution": "if quote" },
  { "order": 8, "type": "content", "headline": "the mistake ≤8 words — make it sting a little", "body": "1-2 lines: why this mistake hurts them" },
  { "order": 9, "type": "content", "headline": "summary headline ≤8 words", "body": "one clean sentence that lands the whole lesson" },
  { "order": 10, "type": "cta", "headline": "CTA ≤10 words", "body": "one supporting line" }
]

For slide 7: use "stat" if a powerful statistic exists, "quote" if a resonant insight can be attributed, otherwise "content".
Remove any field not applicable to the chosen type.
Every headline on slides 1–8 must make a reader stop and think.`;
}

// POST /api/carousel/generate  { topic, targetAudience?, contentGoal?, ctaKeyword?, format?, templateId?, model? }
router.post('/generate', async (req, res, next) => {
  try {
    const { topic, targetAudience, contentGoal, ctaKeyword, format, templateId, model } = req.body;
    if (!topic) return res.status(400).json({ error: 'topic required' });

    const voiceProfile = await db.voiceProfiles.getByPlatform('linkedin');
    const voiceNote = voiceProfile?.system_prompt
      ? `\nVOICE & STYLE: ${voiceProfile.system_prompt}`
      : '';

    let structureOverride = null;
    if (templateId) {
      const tmpl = await db.carouselTemplates.getById(templateId);
      if (tmpl) structureOverride = tmpl.slide_structure.map((s) => s.type);
    }

    const rawText = await openrouter.complete({
      model: model || openrouter.DEFAULT_MODEL,
      systemPrompt: VIRAL_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: structureOverride
          ? buildViralPrompt({ topic, targetAudience, contentGoal, ctaKeyword, format, voiceNote }) +
            `\n\nAdditional constraint: use this slide type order: ${structureOverride.join(', ')}`
          : buildViralPrompt({ topic, targetAudience, contentGoal, ctaKeyword, format, voiceNote }),
      }],
    });

    const slides = parseJsonSafe(rawText, []);
    if (!Array.isArray(slides) || slides.length === 0) {
      return res.status(422).json({ error: 'AI returned invalid slide JSON — try again', raw: rawText });
    }

    res.json({ slides, topic });
  } catch (err) { next(err); }
});

// POST /api/carousel/generate-full
// Generates slides + caption in parallel, saves carousel to DB, renders PDF — one shot
router.post('/generate-full', async (req, res, next) => {
  try {
    const { topic, targetAudience, contentGoal, ctaKeyword, format, theme, model } = req.body;
    if (!topic) return res.status(400).json({ error: 'topic required' });

    const voiceProfile = await db.voiceProfiles.getByPlatform('linkedin');
    const voiceNote = voiceProfile?.system_prompt
      ? `\nVOICE & STYLE: ${voiceProfile.system_prompt}`
      : '';

    const selectedModel = model || openrouter.DEFAULT_MODEL;

    // Phase 1: generate slides + caption in parallel
    const [slidesRaw, captionRaw] = await Promise.all([
      openrouter.complete({
        model: selectedModel,
        systemPrompt: VIRAL_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildViralPrompt({ topic, targetAudience, contentGoal, ctaKeyword, format, voiceNote }) }],
      }),
      openrouter.complete({
        model: selectedModel,
        systemPrompt: 'You write viral LinkedIn post captions. Hook-driven opening, short punchy paragraphs with line breaks, no hashtag spam (max 3 relevant at the end if any). Max 1300 characters. Return ONLY the caption text, nothing else.',
        messages: [{
          role: 'user',
          content: `Write a LinkedIn caption for a carousel post about: "${topic}"\nAudience: ${targetAudience || 'LinkedIn professionals'}\nGoal: ${contentGoal || 'Educate'}\n${ctaKeyword ? `End with a CTA asking readers to comment "${ctaKeyword}" for the full breakdown.` : ''}\n${voiceNote}\n\n3-5 short punchy paragraphs. Lead with the hook. End with the CTA.`,
        }],
      }),
    ]);

    const slides = parseJsonSafe(slidesRaw, []);
    if (!Array.isArray(slides) || slides.length === 0) {
      return res.status(422).json({ error: 'AI returned invalid slide JSON — try again', raw: slidesRaw });
    }

    // Phase 2: save carousel to DB
    const carouselTheme = theme && Object.keys(theme).length ? theme : {};
    const carousel = await db.carousels.create({
      title:        topic,
      slides,
      theme:        carouselTheme,
      slide_count:  slides.length,
      ai_generated: true,
    });

    // Phase 3: generate PDF (uses carousel.id set above)
    await generateCarouselPDF({ ...carousel, theme: carouselTheme });
    const pdfUrl = await storage.getSignedUrl(
      storage.CAROUSEL_BUCKET,
      `pdfs/${carousel.id}/carousel.pdf`,
      3600,
    );

    res.json({ carousel, slides, caption: captionRaw.trim(), pdfUrl });
  } catch (err) { next(err); }
});

// POST /api/carousel/generate-designed
// Full AI pipeline: viral content → Nano Banana image per slide → PDF
// Returns: { carousel, slides, slideImageUrls, caption, pdfUrl }
router.post('/generate-designed', async (req, res, next) => {
  try {
    const {
      topic, targetAudience, contentGoal, ctaKeyword, format,
      theme, model, imageModel = 'nano-banana-2',
    } = req.body;

    if (!topic) return res.status(400).json({ error: 'topic required' });
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(400).json({ error: 'OPENROUTER_API_KEY is not configured — required for Nano Banana image generation.' });
    }

    const voiceProfile = await db.voiceProfiles.getByPlatform('linkedin');
    const voiceNote    = voiceProfile?.system_prompt ? `\nVOICE & STYLE: ${voiceProfile.system_prompt}` : '';
    const selectedModel  = model || openrouter.DEFAULT_MODEL;
    const carouselTheme  = theme && Object.keys(theme).length ? theme : {};

    // ── Phase 1: Generate slide content + caption in parallel ────────────────
    const [slidesRaw, captionRaw] = await Promise.all([
      openrouter.complete({
        model: selectedModel,
        systemPrompt: VIRAL_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildViralPrompt({ topic, targetAudience, contentGoal, ctaKeyword, format, voiceNote }) }],
      }),
      openrouter.complete({
        model: selectedModel,
        systemPrompt: 'You write viral LinkedIn post captions. Hook-driven opening, short punchy paragraphs with line breaks, no hashtag spam (max 3 relevant at the end if any). Max 1300 characters. Return ONLY the caption text, nothing else.',
        messages: [{
          role: 'user',
          content: `Write a LinkedIn caption for a carousel about: "${topic}"\nAudience: ${targetAudience || 'LinkedIn professionals'}\nGoal: ${contentGoal || 'Educate'}\n${ctaKeyword ? `End with CTA asking readers to comment "${ctaKeyword}".` : ''}\n${voiceNote}\n\n3-5 short punchy paragraphs. Lead with the hook.`,
        }],
      }),
    ]);

    const slides = parseJsonSafe(slidesRaw, []);
    if (!Array.isArray(slides) || slides.length === 0) {
      return res.status(422).json({ error: 'AI returned invalid slide JSON — try again', raw: slidesRaw });
    }

    // ── Phase 2: Save carousel skeleton to DB (need the ID for storage paths) ─
    const carousel = await db.carousels.create({
      title:        topic,
      slides,
      theme:        carouselTheme,
      slide_count:  slides.length,
      ai_generated: true,
    });

    // ── Phase 3: Generate one PNG per slide via Nano Banana on OpenRouter ───────
    // generateWithRetry returns a Buffer directly (base64 decoded from the response).
    // Process in batches of 3 to stay within OpenRouter rate limits.
    const sortedSlides = [...slides].sort((a, b) => a.order - b.order);
    const CONCURRENCY  = 3;
    const slideBuffers = [];

    for (let i = 0; i < sortedSlides.length; i += CONCURRENCY) {
      const batch = sortedSlides.slice(i, i + CONCURRENCY);
      const batchBuffers = await Promise.all(
        batch.map((slide, bi) => {
          const prompt = buildSlidePrompt(slide, carouselTheme, i + bi, sortedSlides.length);
          return nanobanana.generateWithRetry({ prompt, model: imageModel, aspectRatio: '1:1', size: '1K' });
        }),
      );
      slideBuffers.push(...batchBuffers);
    }

    // ── Phase 4: Upload PNG buffers to Supabase Storage ──────────────────────
    const imageStoragePaths = [];
    for (let i = 0; i < slideBuffers.length; i++) {
      const storagePath = `designs/${carousel.id}/slide-${i + 1}.png`;
      await storage.upload(storage.CAROUSEL_BUCKET, storagePath, slideBuffers[i], 'image/png', { upsert: true });
      imageStoragePaths.push(storagePath);
    }

    // ── Phase 5: Persist image paths back into slide data ────────────────────
    const designedSlides = sortedSlides.map((slide, i) => ({
      ...slide,
      imageStoragePath: imageStoragePaths[i],
    }));
    await db.carousels.update(carousel.id, { slides: designedSlides });

    // ── Phase 6: Build PDF from images + sign all URLs ───────────────────────
    await generateDesignedCarouselPDF(carousel.id, imageStoragePaths);

    const [slideImageUrls, pdfUrl] = await Promise.all([
      Promise.all(imageStoragePaths.map((p) => storage.getSignedUrl(storage.CAROUSEL_BUCKET, p, 86400))),
      storage.getSignedUrl(storage.CAROUSEL_BUCKET, `pdfs/${carousel.id}/carousel.pdf`, 3600),
    ]);

    res.json({
      carousel: { ...carousel, slides: designedSlides },
      slides:   designedSlides,
      slideImageUrls,
      caption:  captionRaw.trim(),
      pdfUrl,
    });
  } catch (err) { next(err); }
});

// GET /api/carousel/patterns — list of available background patterns
router.get('/patterns', (_req, res) => {
  res.json(patterns.listMeta());
});

// GET /api/carousel/templates
router.get('/templates', async (_req, res, next) => {
  try {
    const templates = await db.carouselTemplates.getAll();
    res.json(templates);
  } catch (err) { next(err); }
});

// GET /api/carousel — list all carousels, newest first
// Must be defined before GET /:id to avoid shadowing
router.get('/', async (req, res, next) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const carousels = await db.carousels.getAll(limit, offset);
    res.json(carousels);
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

// DELETE /api/carousel/:id — removes DB record and cleans up Storage (best-effort)
router.delete('/:id', async (req, res, next) => {
  try {
    const carousel = await db.carousels.getById(req.params.id);

    const cleanups = [];
    if (carousel.pdf_storage_path) {
      cleanups.push(storage.remove(storage.CAROUSEL_BUCKET, carousel.pdf_storage_path).catch(() => {}));
    }
    // Remove Nano Banana designed slide images if present
    if (Array.isArray(carousel.slides)) {
      for (let i = 0; i < carousel.slides.length; i++) {
        cleanups.push(
          storage.remove(storage.CAROUSEL_BUCKET, `designs/${carousel.id}/slide-${i + 1}.png`).catch(() => {}),
        );
      }
    }
    await Promise.all(cleanups);
    await db.carousels.remove(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/carousel/:id/render  { patternId? }
// Sharp + SVG renders each slide as a 1080×1080 PNG using the chosen background
// pattern, assembles a PDF, uploads to CAROUSEL_BUCKET, returns signed URLs.
router.post('/:id/render', async (req, res, next) => {
  try {
    const carousel = await db.carousels.getById(req.params.id);
    if (!carousel.slides?.length) {
      return res.status(400).json({ error: 'Carousel has no slides' });
    }

    const pattern    = patterns.getById(req.body.patternId || carousel.theme?.patternId || 'deep-ocean');
    const fontFamily = req.body.fontFamily ?? carousel.theme?.font      ?? 'Poppins';
    const fontScale  = req.body.fontScale  ?? carousel.theme?.fontScale ?? 1.0;
    const sorted     = [...carousel.slides].sort((a, b) => a.order - b.order);

    // Render all slides to PNG Buffers using Sharp + SVG
    const buffers = await svgRenderer.renderCarousel(carousel, pattern, { fontFamily, fontScale });

    // Upload PNGs to Supabase Storage
    const imageStoragePaths = [];
    for (let i = 0; i < buffers.length; i++) {
      const storagePath = `renders/${carousel.id}/slide_${i + 1}.png`;
      await storage.upload(storage.CAROUSEL_BUCKET, storagePath, buffers[i], 'image/png', { upsert: true });
      imageStoragePaths.push(storagePath);
    }

    // Persist imageStoragePath into slide data and save chosen patternId
    const updatedSlides = sorted.map((s, i) => ({
      ...s,
      imageStoragePath: imageStoragePaths[i],
    }));
    await db.carousels.update(carousel.id, {
      slides: updatedSlides,
      theme:  { ...(carousel.theme || {}), patternId: pattern.id, font: fontFamily, fontScale },
    });

    // Assemble PDF from the rendered PNGs
    await generateDesignedCarouselPDF(carousel.id, imageStoragePaths);

    // Sign all URLs (24h for images, 1h for PDF)
    const [slideImageUrls, pdfUrl] = await Promise.all([
      Promise.all(imageStoragePaths.map((p) =>
        storage.getSignedUrl(storage.CAROUSEL_BUCKET, p, 86400))),
      storage.getSignedUrl(storage.CAROUSEL_BUCKET, `pdfs/${carousel.id}/carousel.pdf`, 3600),
    ]);

    res.json({ slides: updatedSlides, slideImageUrls, pdfUrl, patternId: pattern.id });
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
// IMPORTANT: LinkedIn carousels MUST be posted as Documents (shareMediaCategory: DOCUMENT),
// NOT as images. A carousel is a multi-page PDF uploaded via /rest/documents?action=initializeUpload
// and referenced by documentUrn in the /rest/posts body. Never change this to image publishing.
router.post('/:id/publish', requirePlatformAuth('linkedin'), async (req, res, next) => {
  try {
    const carousel = await db.carousels.getById(req.params.id);
    if (!carousel.pdf_storage_path) {
      return res.status(400).json({ error: 'Generate the PDF first — call POST /api/carousel/:id/pdf' });
    }

    // Download the carousel PDF from Supabase Storage
    const pdfBuffer = await storage.download(storage.CAROUSEL_BUCKET, carousel.pdf_storage_path);

    // Step 1: Initialize document upload — returns uploadUrl + documentUrn
    const { uploadUrl, documentUrn } = await linkedin.initializeDocumentUpload(
      req.platformToken,
      req.platformAccountId,
    );

    // Step 2: PUT the PDF binary to LinkedIn's upload URL
    await linkedin.uploadBinary(uploadUrl, pdfBuffer);

    // Step 3: Publish as a Document post — isDocument: true is mandatory here
    const fakePost = { content: req.body.caption || carousel.title };
    const result = await linkedin.publishPost(
      fakePost,
      [documentUrn],
      req.platformToken,
      { account_id: req.platformAccountId },
      { isDocument: true, title: carousel.title },
    );

    res.json({ success: true, linkedinPostId: result.id });
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
