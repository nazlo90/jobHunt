export interface ScraperConfig {
  id: number;
  searchTerms: string[];
  minSalary: number;
  remoteOnly: boolean;
  strongKeywords: string[];
  additionalKeywords: string[];
  excludeTitle: string[];
  excludeKeywords: string[];
  requireStrongMatch: boolean;
  minScore: number;
  enabledSources: string[];
  updatedAt: string;
}
