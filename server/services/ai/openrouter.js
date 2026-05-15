const { OpenAI } = require('openai');

const client = new OpenAI({
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  apiKey:  process.env.OPENROUTER_API_KEY,
  defaultHeaders: { 'HTTP-Referer': 'https://postly.app', 'X-Title': 'Postly' },
});

// Text / multimodal models for AI writing features
const MODELS = [
  { id: 'anthropic/claude-sonnet-4-6',               name: 'Claude Sonnet 4.6',      contextK: 200,  bestFor: 'Carousels, creative writing, structured output (recommended)' },
  { id: 'anthropic/claude-sonnet-4-5',               name: 'Claude Sonnet 4.5',      contextK: 200,  bestFor: 'Long-form posts, carousels, voice analysis' },
  { id: 'google/gemini-2.5-pro-preview',             name: 'Gemini 2.5 Pro',         contextK: 1000, bestFor: 'Deep research carousels, large voice analysis sets' },
  { id: 'google/gemini-2.0-flash-001',               name: 'Gemini 2.0 Flash',       contextK: 1000, bestFor: 'Fast carousel generation, creative hooks' },
  { id: 'openai/gpt-4o',                             name: 'GPT-4o',                 contextK: 128,  bestFor: 'General writing, image captions' },
  { id: 'openai/gpt-4o-mini',                        name: 'GPT-4o Mini',            contextK: 128,  bestFor: 'Autocomplete (low latency)' },
  { id: 'google/gemini-pro-1.5',                     name: 'Gemini Pro 1.5',         contextK: 1000, bestFor: 'Voice analysis with many sample posts' },
  { id: 'meta-llama/llama-3.1-70b',                  name: 'Llama 3.1 70B',          contextK: 128,  bestFor: 'Alternative general-purpose' },
];

// Image generation models (Nano Banana) — used by /api/carousel/generate-designed
// These go through the chat/completions endpoint with modalities: ["image","text"]
const IMAGE_MODELS = [
  { id: 'google/gemini-3.1-flash-image-preview', alias: 'nano-banana-2',   name: 'Nano Banana 2',   bestFor: 'Fastest, default for slide design' },
  { id: 'google/gemini-2.5-flash-image-preview', alias: 'nano-banana',     name: 'Nano Banana',     bestFor: 'Balanced speed and quality' },
  { id: 'google/gemini-3-pro-image-preview',     alias: 'nano-banana-pro', name: 'Nano Banana Pro', bestFor: 'Highest quality, slower' },
];

const DEFAULT_MODEL = 'anthropic/claude-sonnet-4-5';

// Main wrapper — always uses the messages array format
async function chat({ messages, model = DEFAULT_MODEL, systemPrompt, stream = true }) {
  const builtMessages = [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    ...messages,
  ];
  return client.chat.completions.create({ model, stream, messages: builtMessages });
}

// Pipe a streaming OpenAI response to an Express SSE response
async function streamToResponse(stream, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || '';
    if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
  }
  res.write('data: [DONE]\n\n');
  res.end();
}

// Non-streaming call that returns the full text
async function complete({ messages, model = DEFAULT_MODEL, systemPrompt }) {
  const result = await chat({ messages, model, systemPrompt, stream: false });
  return result.choices[0]?.message?.content || '';
}

// Vision call for caption / alt-text (non-streaming)
async function visionComplete({ imageUrl, prompt, model = 'openai/gpt-4o' }) {
  const result = await client.chat.completions.create({
    model,
    stream: false,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: imageUrl } },
        { type: 'text', text: prompt },
      ],
    }],
  });
  return result.choices[0]?.message?.content || '';
}

module.exports = { client, MODELS, IMAGE_MODELS, DEFAULT_MODEL, chat, streamToResponse, complete, visionComplete };
