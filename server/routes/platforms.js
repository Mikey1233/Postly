const router = require('express').Router();

router.get('/status',                 (_req, res) => res.json({ stub: 'GET /api/platforms/status' }));
router.get('/:platform/auth',         (_req, res) => res.json({ stub: `GET /api/platforms/${_req.params.platform}/auth` }));
router.get('/:platform/callback',     (_req, res) => res.json({ stub: `GET /api/platforms/${_req.params.platform}/callback` }));
router.delete('/:platform',           (_req, res) => res.json({ stub: `DELETE /api/platforms/${_req.params.platform}` }));
router.get('/:platform/groups',       (_req, res) => res.json({ stub: `GET /api/platforms/${_req.params.platform}/groups` }));

module.exports = router;
