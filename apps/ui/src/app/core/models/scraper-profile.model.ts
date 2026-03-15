export interface ScraperProfile {
  id: number;
  name: string;
  isActive: boolean;
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
  createdAt: string;
  updatedAt: string;
}
