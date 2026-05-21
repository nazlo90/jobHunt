export interface CommentVariants {
  punchy: string;
  question: string;
  insight: string;
  experience: string;
  challenge: string;
  funny: string;
  meme: string;
  roast: string;
}

export type CommentLanguage = 'en' | 'uk';

export interface PostVariant {
  variant: number;
  text: string;
}

export const WRITE_CATEGORIES = [
  { value: 'angular-tip',    label: 'Angular Tip' },
  { value: 'career-lesson',  label: 'Career Lesson' },
  { value: 'ai-in-dev',      label: 'AI in Dev' },
  { value: 'leadership',     label: 'Leadership' },
  { value: 'hot-take',       label: 'Hot Take' },
] as const;

export type WriteCategory = typeof WRITE_CATEGORIES[number]['value'];
