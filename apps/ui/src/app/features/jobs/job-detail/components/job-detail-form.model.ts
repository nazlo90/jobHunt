import { JobStatus } from '@core/models/job.model';

export interface FormFields {
  company: string;
  role: string;
  url: string;
  status: JobStatus;
  priority: number;
  salary: string;
  location: string;
  techStack: string;
  appliedDate: string;
  appliedDateObj: Date | null;
  contact: string;
  notes: string;
}
