const router = require('express').Router();

router.post('/upload',          (_req, res) => res.status(201).json({ stub: 'POST /api/media/upload' }));
router.delete('/:id',           (_req, res) => res.json({ stub: 'DELETE /api/media/:id' }));
router.get('/post/:postId',     (_req, res) => res.json({ stub: 'GET /api/media/post/:postId' }));
router.get('/library',          (_req, res) => res.json({ stub: 'GET /api/media/library' }));
router.post('/:id/alt-text',    (_req, res) => res.json({ stub: 'POST /api/media/:id/alt-text' }));

module.exports = router;
