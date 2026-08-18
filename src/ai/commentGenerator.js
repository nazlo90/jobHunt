import Groq from 'groq-sdk';
import { MY_PROFILE } from '../config/profile.js';
import { GROQ_MODEL } from '../config/ai.js';

const SYSTEM_PROMPT = `You are ${MY_PROFILE.name}, ${MY_PROFILE.title}.
Skills: ${MY_PROFILE.skills.join(', ')}.
Highlights: ${MY_PROFILE.highlights.join(' | ')}.
Tone: ${MY_PROFILE.tone}.

Rules for all comments:
- Reference specific details from the post — never write a generic response
- Sound like a real senior dev talking to a peer, not AI
- Never start with: "great post", "totally agree", "thanks for sharing", "love this", "so true"
- No hollow affirmations
- Keep every variant to 1-2 sentences max`;

const LANGUAGE_INSTRUCTION = {
  en: 'Write all comments in English.',
  uk: 'Write all comments in Ukrainian language (українською мовою).',
};

export async function generateComments(post, language = 'en') {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const langInstruction = LANGUAGE_INSTRUCTION[language] ?? LANGUAGE_INSTRUCTION.en;

  const userPrompt = `Generate 8 short comment variants for this LinkedIn post. Return ONLY valid JSON.
${langInstruction}

Post by ${post.authorName} (${post.authorTitle}):
"${post.postText}"

Return this exact JSON structure (each value must be 1-2 sentences):
{
  "punchy": "sharp, direct observation that nails the core idea in one sentence",
  "question": "one concise question that sparks real discussion",
  "insight": "1-2 sentences adding a specific technical or professional insight",
  "experience": "1-2 sentences referencing a relevant personal experience",
  "challenge": "1-2 sentences respectfully pushing back or adding a nuanced counterpoint",
  "funny": "genuinely funny comment — witty wordplay or absurd observation about the topic, not cringe",
  "meme": "comment written in meme/internet culture language: ironic, self-aware, references dev memes or LinkedIn culture (e.g. 'me at 2am debugging this', 'this hits different after 5 sprints', '10x engineer energy', 'the audacity of this post')",
  "roast": "a sharp, clever roast of the post's premise or the LinkedIn-ification of the idea — dry wit, no personal attacks, the kind of comment that gets 'lmaooo true' replies"
}`;

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 800,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  return JSON.parse(raw);
}
