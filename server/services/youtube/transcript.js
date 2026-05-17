const { YoutubeTranscript } = require('youtube-transcript');

// Hard cap so a 5-hour video doesn't blow up the model context.
// ~100k chars ≈ 25k tokens — plenty for any reasonable post.
const MAX_TRANSCRIPT_CHARS = 100_000;

function extractVideoId(url) {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m) return m[1];
  }
  return null;
}

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function fetchTranscript(url) {
  const videoId = extractVideoId(url);
  if (!videoId) throw httpError('Could not parse a YouTube video ID from that URL', 400);

  let segments;
  try {
    segments = await YoutubeTranscript.fetchTranscript(videoId);
  } catch (err) {
    const message = /disabled|not available|transcript/i.test(err?.message || '')
      ? 'This video has no captions available'
      : 'Failed to fetch transcript — the video may be private, age-restricted, or region-locked';
    throw httpError(message, 422);
  }

  if (!segments?.length) throw httpError('This video has no captions available', 422);

  const full = segments
    .map((s) => s.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  const truncated = full.length > MAX_TRANSCRIPT_CHARS;
  const transcript = truncated ? full.slice(0, MAX_TRANSCRIPT_CHARS) : full;

  return { videoId, transcript, truncated, charCount: transcript.length };
}

module.exports = { extractVideoId, fetchTranscript };
