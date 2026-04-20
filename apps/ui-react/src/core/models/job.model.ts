export type JobStatus =
  | 'New'
  | 'Saved'
  | 'Applied'
  | 'Screening'
  | 'Technical'
  | 'Final Round'
  | 'Offer'
  | 'Rejected'
  | 'Archived';

export const JOB_STATUSES: JobStatus[] = [
  'New', 'Saved', 'Applied', 'Screening', 'Technical',
  'Final Round', 'Offer', 'Rejected', 'Archived',
];

export interface Job {
  id: number;
  scrapeId?: string;
  company: string;
  role: string;
  salary?: string;
  salaryRaw?: number;
  url?: string;
  location?: string;
  techStack?: string;
  status: JobStatus;
  priority: number;
  appliedDate?: string;
  contact?: string;
  notes?: string;
  source: string;
  descriptionPreview?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobStats {
  total: number;
  pipeline: number;
  offers: number;
  thisWeek: number;
  byStatus: { status: string; count: number }[];
  bySource: { source: string; count: number }[];
}

export interface JobsFilter {
  status?: JobStatus;
  source?: string;
  search?: string;
  sortBy?: string;
  minPriority?: number;
  page?: number;
  limit?: number;
}

export interface TopExperienceEntry {
  company: string;
  period: string;
  role: string;
  bullets: string[];
}

export interface AdaptedCv {
  id: number;
  jobId?: number;
  company?: string;
  role?: string;
  relevanceScore: number;
  keywordsFound: string[];
  missingSkills: string[];
  adaptedProfile: string;
  topExperience: TopExperienceEntry[];
  coverLetter: string;
  advice: string;
  jobDescription?: string;
  userCvId?: number;
  createdAt: string;
}
