const router = require('express').Router();

router.post('/trigger', (_req, res) => res.json({ stub: 'POST /api/schedule/trigger' }));
router.get('/status',   (_req, res) => res.json({ stub: 'GET /api/schedule/status' }));

module.exports = router;
