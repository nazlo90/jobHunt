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

export interface ScraperRun {
  startedAt: string;
  finishedAt?: string;
  total: number;
  inserted: number;
  updated: number;
  deleted: number;
  errors: string[];
}

export interface ScraperStatus {
  running: boolean;
  lastRun: ScraperRun | null;
  currentPlatform: string | null;
  platformResults: { name: string; count: number }[];
}
