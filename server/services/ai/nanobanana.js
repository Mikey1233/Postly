/**
 * Nano Banana image generation via OpenRouter.
 *
 * Uses the existing OPENROUTER_API_KEY — no separate key needed.
 * OpenRouter routes to Google's Gemini image models under the covers.
 *
 * Model aliases → OpenRouter model IDs:
 *   nano-banana-2   → google/gemini-3.1-flash-image-preview  (default, fastest)
 *   nano-banana     → google/gemini-2.5-flash-image-preview
 *   nano-banana-pro → google/gemini-3-pro-image-preview      (highest quality)
 *
 * API format: same /chat/completions endpoint as text, with
 *   modalities: ["image","text"]  and  image_config: { aspect_ratio, image_size }
 *
 * Response: images come back as base64 data URLs inside
 *   choices[0].message.images[].image_url.url
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const MODEL_IDS = {
  'nano-banana-2':   'google/gemini-3.1-flash-image-preview',
  'nano-banana':     'google/gemini-2.5-flash-image-preview',
  'nano-banana-pro': 'google/gemini-3-pro-image-preview',
};

const DEFAULT_MODEL = 'nano-banana-2';

// Generate one slide image. Returns a Buffer (PNG).
async function generateImage({ prompt, model = DEFAULT_MODEL, aspectRatio = '1:1', size = '1K' }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

  const resolvedModel = MODEL_IDS[model] || model;

  const res = await fetch(OPENROUTER_URL, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://postly.app',
      'X-Title':      'Postly',
    },
    body: JSON.stringify({
      model:        resolvedModel,
      messages:     [{ role: 'user', content: prompt }],
      modalities:   ['image', 'text'],
      image_config: { aspect_ratio: aspectRatio, image_size: size },
    }),
  });

  if (res.status === 429) {
    throw Object.assign(new Error('OpenRouter rate limit — retrying'), { status: 429 });
  }
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`OpenRouter image API ${res.status}: ${body}`);
  }

  const data   = await res.json();
  const images = data.choices?.[0]?.message?.images;

  if (!images?.length) {
    throw new Error(`No images returned. Response: ${JSON.stringify(data).slice(0, 400)}`);
  }

  // Data URL: "data:image/png;base64,<base64-string>"
  const dataUrl = images[0]?.image_url?.url ?? images[0]?.url;
  if (!dataUrl) throw new Error('image_url missing in OpenRouter image response');

  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64, 'base64');
}

// Exponential back-off retry wrapper for 429 rate limits.
async function generateWithRetry(params, maxRetries = 3) {
  let delay = 1500;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateImage(params);
    } catch (err) {
      if (err.status === 429 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
}

module.exports = { generateImage, generateWithRetry, MODEL_IDS, DEFAULT_MODEL };
