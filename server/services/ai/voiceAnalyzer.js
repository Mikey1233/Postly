const VOICE_ANALYSIS_SYSTEM_PROMPT = `You are a writing analyst. Analyze these posts written by the same person.

Extract exactly:
- tone: array of 2-4 adjectives
- hookStyle: one of [question, bold-claim, personal-story, statistic, contrarian]
- sentenceLength: one of [short, medium, long]
- structure: one of [line-breaks, bullet-lists, numbered-steps, flowing-paragraphs]
- emojiUsage: one of [none, minimal, moderate, heavy]
- ctaStyle: one of [open-question, invitation, bold-statement, implicit]
- signaturePhrases: array of up to 5 recurring phrases or sentence starters

Then write a systemPrompt string (under 150 words) that instructs an AI writer to replicate this exact voice.

Return ONLY valid JSON matching this shape:
{
  "tone": [...],
  "hookStyle": "...",
  "sentenceLength": "...",
  "structure": "...",
  "emojiUsage": "...",
  "ctaStyle": "...",
  "signaturePhrases": [...],
  "systemPrompt": "..."
}
No preamble, no explanation, no markdown fences.`;

// Build a system prompt string for AI calls from a saved voice profile object
function buildVoiceSystemPrompt(voiceProfile, platform) {
  if (!voiceProfile?.system_prompt) return null;
  const intro = platform === 'linkedin'
    ? 'You are writing a LinkedIn post.'
    : `You are writing a ${platform} post.`;
  return `${intro}\n\n${voiceProfile.system_prompt}`;
}

module.exports = { VOICE_ANALYSIS_SYSTEM_PROMPT, buildVoiceSystemPrompt };
