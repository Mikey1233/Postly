const router = require('express').Router();
const db     = require('../db');

// GET /api/pillars
router.get('/', async (_req, res, next) => {
  try {
    res.json(await db.contentPillars.getAll());
  } catch (err) { next(err); }
});

// POST /api/pillars  { name, color?, description? }
router.post('/', async (req, res, next) => {
  try {
    const { name, color, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name required' });
    const row = await db.contentPillars.create({
      name:        name.trim(),
      color:       color?.trim() || null,
      description: description?.trim() || null,
    });
    res.status(201).json(row);
  } catch (err) { next(err); }
});

// PUT /api/pillars/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, color, description } = req.body;
    const patch = {};
    if (name        !== undefined) patch.name        = name.trim();
    if (color       !== undefined) patch.color       = color?.trim() || null;
    if (description !== undefined) patch.description = description?.trim() || null;
    res.json(await db.contentPillars.update(req.params.id, patch));
  } catch (err) { next(err); }
});

// DELETE /api/pillars/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await db.contentPillars.remove(req.params.id);
    res.json({ deleted: req.params.id });
  } catch (err) { next(err); }
});

module.exports = router;
