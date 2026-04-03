export type ArrayField = 'searchTerms' | 'strongKeywords' | 'additionalKeywords' | 'excludeTitle' | 'excludeKeywords';

export interface SourceCategory {
  label: string;
  sources: string[];
}

export const SOURCE_CATEGORIES: SourceCategory[] = [
  {
    label: 'Global / Remote',
    sources: ['LinkedIn', 'Indeed', 'Glassdoor', 'RemoteOK', 'Remotive', 'WeWorkRemotely', 'HackerNews', 'Greenhouse', 'Himalayas', 'Jobicy', 'Wellfound', 'Jooble', 'JobGether'],
  },
  { label: 'Ukraine',        sources: ['Djinni', 'DOU', 'HappyMonday'] },
  { label: 'Poland',         sources: ['JustJoin', 'NoFluffJobs'] },
  { label: 'United Kingdom', sources: ['TotalJobs'] },
  { label: 'United States',  sources: ['TheMuse'] },
  { label: 'Turkey',         sources: ['Kariyer'] },
];

export const ALL_SOURCES = SOURCE_CATEGORIES.flatMap(c => c.sources);
