const router = require('express').Router();
const db     = require('../db');
const { pollAllSources } = require('../services/feeds/poller');

const VALID_CATEGORIES = ['ai', 'tech', 'software'];

// ── Items ────────────────────────────────────────────────────────────────────

// GET /api/feeds/items?category=ai&sourceId=…&limit=50&before=ISO
router.get('/items', async (req, res, next) => {
  try {
    const { category, sourceId, limit, before } = req.query;
    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
    }
    const items = await db.feedItems.list({
      category,
      sourceId,
      limit: limit ? Math.min(parseInt(limit, 10) || 50, 200) : 50,
      before,
    });
    res.json(items);
  } catch (err) { next(err); }
});

// GET /api/feeds/items/:id — used by the composer to load article context
router.get('/items/:id', async (req, res, next) => {
  try {
    res.json(await db.feedItems.getById(req.params.id));
  } catch (err) { next(err); }
});

// ── Sources ──────────────────────────────────────────────────────────────────

router.get('/sources', async (_req, res, next) => {
  try {
    res.json(await db.feedSources.getAll());
  } catch (err) { next(err); }
});

router.post('/sources', async (req, res, next) => {
  try {
    const { name, url, category } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name required' });
    if (!url?.trim())  return res.status(400).json({ error: 'url required' });
    const row = await db.feedSources.create({
      name:     name.trim(),
      url:      url.trim(),
      category: category || 'tech',
    });
    res.status(201).json(row);
  } catch (err) {
    if (err?.code === '23505') return res.status(409).json({ error: 'A source with that URL already exists' });
    next(err);
  }
});

router.put('/sources/:id', async (req, res, next) => {
  try {
    const { name, url, category, enabled } = req.body;
    const patch = {};
    if (name     !== undefined) patch.name     = name.trim();
    if (url      !== undefined) patch.url      = url.trim();
    if (category !== undefined) patch.category = category;
    if (enabled  !== undefined) patch.enabled  = !!enabled;
    res.json(await db.feedSources.update(req.params.id, patch));
  } catch (err) {
    if (err?.code === '23505') return res.status(409).json({ error: 'A source with that URL already exists' });
    next(err);
  }
});

router.delete('/sources/:id', async (req, res, next) => {
  try {
    await db.feedSources.remove(req.params.id);
    res.json({ deleted: req.params.id });
  } catch (err) { next(err); }
});

// ── Manual poll trigger (also used after adding a new source) ────────────────

router.post('/poll', async (_req, res, next) => {
  try {
    const results = await pollAllSources();
    const summary = results.map((r) => r.status === 'fulfilled'
      ? { source: r.value.source, inserted: r.value.inserted, ok: true }
      : { ok: false, error: r.reason?.message || 'failed' });
    res.json({ polled: summary });
  } catch (err) { next(err); }
});

module.exports = router;
