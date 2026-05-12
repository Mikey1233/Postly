const router  = require('express').Router();
const scheduler = require('../services/scheduler/cron');
const bestPostTimes = require('../config/bestPostTimes');

// POST /api/schedule/trigger — manually fire one scheduler tick (Supabase Edge Function backup)
router.post('/trigger', async (_req, res, next) => {
  try {
    await scheduler.tick();
    res.json({ triggered: true, ...scheduler.getStatus() });
  } catch (err) { next(err); }
});

// GET /api/schedule/status
router.get('/status', (_req, res) => {
  res.json({ ...scheduler.getStatus(), bestPostTimes });
});

module.exports = router;
