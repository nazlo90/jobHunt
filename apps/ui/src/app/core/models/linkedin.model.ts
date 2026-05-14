export interface CommentVariants {
  punchy: string;
  question: string;
  insight: string;
  experience: string;
  challenge: string;
}

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
