const router = require('express').Router();
const db     = require('../db');
const { publishPost } = require('../services/publisher');

// GET /api/posts/scheduled
router.get('/scheduled', async (_req, res, next) => {
  try {
    res.json(await db.posts.getScheduled());
  } catch (err) { next(err); }
});

// GET /api/posts/history?page=1&limit=20&search=...&platform=linkedin&type=carousel&from=...&to=...&pillar=...
router.get('/history', async (req, res, next) => {
  try {
    const limit  = Math.min(Number(req.query.limit) || 50, 200);
    const offset = (Number(req.query.page || 1) - 1) * limit;
    const filters = {
      search:   req.query.search   || null,
      platform: req.query.platform || null,
      postType: req.query.type     || null,
      pillarId: req.query.pillar   || null,
      from:     req.query.from     || null,
      to:       req.query.to       || null,
      status:   req.query.status   || null,
    };
    res.json(await db.posts.getHistory(limit, offset, filters));
  } catch (err) { next(err); }
});

// GET /api/posts/recent?status=published&sinceMinutes=30
router.get('/recent', async (req, res, next) => {
  try {
    res.json(await db.posts.getRecent({
      status:       req.query.status || null,
      sinceMinutes: Number(req.query.sinceMinutes) || 30,
    }));
  } catch (err) { next(err); }
});

// GET /api/posts/stats
router.get('/stats', async (_req, res, next) => {
  try {
    res.json(await db.posts.getStats());
  } catch (err) { next(err); }
});

// GET /api/posts/:id
router.get('/:id', async (req, res, next) => {
  try {
    res.json(await db.posts.getById(req.params.id));
  } catch (err) { next(err); }
});

// POST /api/posts
router.post('/', async (req, res, next) => {
  try {
    const {
      content, platform, post_type = 'text', status = 'draft',
      scheduled_at, ai_generated, voice_profile_id, carousel_id, target_group, metadata,
    } = req.body;
    if (!content && post_type !== 'carousel') return res.status(400).json({ error: 'content required' });
    if (!Array.isArray(platform) || platform.length === 0) return res.status(400).json({ error: 'platform (array) required' });

    const post = await db.posts.create({
      content:          content || '',
      platform,
      post_type,
      status,
      scheduled_at:     scheduled_at || null,
      ai_generated:     !!ai_generated,
      voice_profile_id: voice_profile_id || null,
      carousel_id:      carousel_id || null,
      target_group:     target_group || null,
      metadata:         metadata || null,
    });
    res.status(201).json(post);
  } catch (err) { next(err); }
});

// PUT /api/posts/:id
router.put('/:id', async (req, res, next) => {
  try {
    const allowed = ['content', 'platform', 'post_type', 'status', 'scheduled_at',
                     'voice_profile_id', 'carousel_id', 'target_group', 'metadata'];
    const patch = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
    res.json(await db.posts.update(req.params.id, patch));
  } catch (err) { next(err); }
});

// DELETE /api/posts/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await db.posts.remove(req.params.id);
    res.json({ deleted: req.params.id });
  } catch (err) { next(err); }
});

// POST /api/posts/:id/publish — publish immediately to all platforms on the post
router.post('/:id/publish', async (req, res, next) => {
  try {
    const post = await db.posts.getById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const outcome = await publishPost(post);
    res.json(outcome);
  } catch (err) { next(err); }
});

// POST /api/posts/:id/retry — re-run the publish flow for a failed/partial post
router.post('/:id/retry', async (req, res, next) => {
  try {
    const post = await db.posts.getById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    await db.posts.update(post.id, { status: 'publishing' });
    const outcome = await publishPost(post);
    res.json(outcome);
  } catch (err) { next(err); }
});

module.exports = router;
