// src/ai/dmGenerator.js
import Groq from 'groq-sdk';
import { MY_PROFILE } from '../config/profile.js';

const SYSTEM_PROMPT = `You are ${MY_PROFILE.name}, ${MY_PROFILE.title}.
Skills: ${MY_PROFILE.skills.join(', ')}.
Highlights: ${MY_PROFILE.highlights.join(' | ')}.
Tone: ${MY_PROFILE.tone}.

Rules for recruiter DMs:
- Under 150 words total
- Structure: who I am (1 sentence) → why this company specifically (use companyNote) → ask for a call
- Tone: direct and confident, not desperate or overly formal
- No "I came across your profile", "I hope this message finds you well", "exciting opportunity"
- No hollow flattery
- End with a clear, low-pressure ask`;

export async function generateDM({ recruiterName, company, roleTitle, companyNote }) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const userPrompt = `Write a LinkedIn DM to ${recruiterName} at ${company} about the ${roleTitle} role.
Company note: "${companyNote}"

Return ONLY valid JSON:
{ "text": "the full DM message here" }`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 512,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  return JSON.parse(raw);
}
