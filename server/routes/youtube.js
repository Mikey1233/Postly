const router = require('express').Router();
const { fetchTranscript } = require('../services/youtube/transcript');

// POST /api/youtube/transcript  { url }
// Returns { videoId, transcript, truncated, charCount }
router.post('/transcript', async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'url required' });
    const result = await fetchTranscript(url);
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
