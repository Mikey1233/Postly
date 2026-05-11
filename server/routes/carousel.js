const router = require('express').Router();

router.post('/',                   (_req, res) => res.status(201).json({ stub: 'POST /api/carousel' }));
router.put('/:id',                 (_req, res) => res.json({ stub: 'PUT /api/carousel/:id' }));
router.post('/generate',           (_req, res) => res.json({ stub: 'POST /api/carousel/generate' }));
router.get('/templates',           (_req, res) => res.json({ stub: 'GET /api/carousel/templates' }));
router.post('/:id/pdf',            (_req, res) => res.json({ stub: 'POST /api/carousel/:id/pdf' }));
router.post('/:id/publish',        (_req, res) => res.json({ stub: 'POST /api/carousel/:id/publish' }));
router.post('/:id/save-template',  (_req, res) => res.json({ stub: 'POST /api/carousel/:id/save-template' }));

module.exports = router;
