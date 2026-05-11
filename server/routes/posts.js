const router = require('express').Router();

router.get('/scheduled',    (_req, res) => res.json({ stub: 'GET /api/posts/scheduled' }));
router.get('/history',      (_req, res) => res.json({ stub: 'GET /api/posts/history' }));
router.get('/:id',          (_req, res) => res.json({ stub: 'GET /api/posts/:id' }));
router.post('/',            (_req, res) => res.status(201).json({ stub: 'POST /api/posts' }));
router.put('/:id',          (_req, res) => res.json({ stub: 'PUT /api/posts/:id' }));
router.delete('/:id',       (_req, res) => res.json({ stub: 'DELETE /api/posts/:id' }));
router.post('/:id/publish', (_req, res) => res.json({ stub: 'POST /api/posts/:id/publish' }));
router.post('/:id/retry',   (_req, res) => res.json({ stub: 'POST /api/posts/:id/retry' }));

module.exports = router;
