export const GROQ_MODEL = 'openai/gpt-oss-120b';

// gpt-oss-120b is a reasoning model — it spends output tokens on an internal
// reasoning trace before the final answer. Without these, low max token
// limits let it burn the whole budget reasoning and return empty content.
export const GROQ_REASONING_EFFORT = 'low';
export const GROQ_REASONING_FORMAT = 'hidden';
