const router = require('express').Router();

router.post('/analyze',     (_req, res) => res.json({ stub: 'POST /api/voice/analyze' }));
router.get('/:platform',    (_req, res) => res.json({ stub: `GET /api/voice/${_req.params.platform}` }));

module.exports = router;
