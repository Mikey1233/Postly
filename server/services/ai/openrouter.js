const { OpenAI } = require('openai');

const client = new OpenAI({
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  apiKey:  process.env.OPENROUTER_API_KEY,
  defaultHeaders: { 'HTTP-Referer': 'https://postly.app', 'X-Title': 'Postly' },
});

// Model list now lives in the ai_models DB table and is managed from the
// Settings page. See db/aiModels.js and routes/ai.js (/api/ai/models).

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

module.exports = { client, DEFAULT_MODEL, chat, streamToResponse, complete, visionComplete };
