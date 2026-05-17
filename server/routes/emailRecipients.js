const router = require('express').Router();
const db     = require('../db');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/recipients
router.get('/', async (_req, res, next) => {
  try {
    res.json(await db.emailRecipients.getAll());
  } catch (err) { next(err); }
});

// POST /api/recipients  { name, email, group_tag?, notes? }
router.post('/', async (req, res, next) => {
  try {
    const { name, email, group_tag, notes } = req.body;
    if (!name?.trim())  return res.status(400).json({ error: 'name required' });
    if (!email?.trim()) return res.status(400).json({ error: 'email required' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'invalid email format' });
    const row = await db.emailRecipients.create({
      name:      name.trim(),
      email:     email.trim().toLowerCase(),
      group_tag: group_tag?.trim() || null,
      notes:     notes?.trim() || null,
    });
    res.status(201).json(row);
  } catch (err) {
    // Postgres unique_violation
    if (err?.code === '23505') return res.status(409).json({ error: 'A recipient with that email already exists' });
    next(err);
  }
});

// PUT /api/recipients/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, email, group_tag, notes } = req.body;
    const patch = {};
    if (name      !== undefined) patch.name      = name.trim();
    if (email     !== undefined) {
      if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'invalid email format' });
      patch.email = email.trim().toLowerCase();
    }
    if (group_tag !== undefined) patch.group_tag = group_tag?.trim() || null;
    if (notes     !== undefined) patch.notes     = notes?.trim() || null;
    res.json(await db.emailRecipients.update(req.params.id, patch));
  } catch (err) {
    if (err?.code === '23505') return res.status(409).json({ error: 'A recipient with that email already exists' });
    next(err);
  }
});

// DELETE /api/recipients/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await db.emailRecipients.remove(req.params.id);
    res.json({ deleted: req.params.id });
  } catch (err) { next(err); }
});

module.exports = router;
