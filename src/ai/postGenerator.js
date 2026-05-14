// src/ai/postGenerator.js
import Groq from 'groq-sdk';
import { MY_PROFILE } from '../config/profile.js';

const VALID_CATEGORIES = ['angular-tip', 'career-lesson', 'ai-in-dev', 'leadership', 'hot-take'];

const CATEGORY_CONTEXT = {
  'angular-tip': 'a concrete Angular or TypeScript tip from production experience',
  'career-lesson': 'a lesson learned from your engineering career — team dynamics, growth, decisions',
  'ai-in-dev': 'how AI is actually changing day-to-day dev work, with a grounded take',
  'leadership': 'a leadership or mentoring insight from leading frontend teams',
  'hot-take': 'a contrarian or provocative opinion about frontend dev, tools, or the industry',
};

const SYSTEM_PROMPT = `You are ${MY_PROFILE.name}, ${MY_PROFILE.title}.
Skills: ${MY_PROFILE.skills.join(', ')}.
Highlights: ${MY_PROFILE.highlights.join(' | ')}.
Tone: ${MY_PROFILE.tone}.

Rules for LinkedIn posts:
- Hook in first line — a bold statement, surprising fact, or short story opener. No questions. No "I'm excited".
- 150-300 words per post
- Clear insight or short story with a specific detail or number
- End with a thought-provoking statement or subtle CTA (not "what do you think?")
- Sound like a practitioner, not a content creator
- No buzzwords: "game-changer", "leverage", "synergy", "passionate", "journey"
- Minimal emoji — one at most, only if it naturally fits`;

export async function generatePosts(category, seedIdea = '') {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  if (!VALID_CATEGORIES.includes(category)) {
    throw new Error(`Invalid category. Use one of: ${VALID_CATEGORIES.join(', ')}`);
  }

  const context = CATEGORY_CONTEXT[category];
  const seedLine = seedIdea ? `\nSeed idea: "${seedIdea}"` : '';

  const userPrompt = `Write 2 LinkedIn post variants about ${context}.${seedLine}

Return ONLY valid JSON:
{
  "variant1": "full post text here",
  "variant2": "full post text here"
}

Each variant must be 150-300 words, have a strong opening line, and feel like a distinct take.`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 2048,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(raw);
  return [
    { variant: 1, text: parsed.variant1 || '' },
    { variant: 2, text: parsed.variant2 || '' },
  ];
}

export { VALID_CATEGORIES };
