import { Job, JobStats } from './job.model';

export interface ScraperStatus {
  running: boolean;
  currentPlatform?: string | null;
  platformResults?: { name: string; count: number }[];
  lastRun: {
    startedAt: string;
    finishedAt?: string;
    total: number;
    inserted: number;
    updated: number;
    deleted: number;
    errors: string[];
  } | null;
}

export interface JobFilters {
  status?: string;
  source?: string;
  search?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
  minPriority?: number;
}

export interface JobsState {
  jobs: Job[];
  stats: JobStats | null;
  loading: boolean;
  statsLoading: boolean;
  filters: JobFilters;
  total: number;
  error: string | null;
  scraperStatus: ScraperStatus | null;
  scraperStopping: boolean;
  selectedIds: number[];
}
