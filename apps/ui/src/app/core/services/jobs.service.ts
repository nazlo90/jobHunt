import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Job } from '../models/job.model';

/** Slim HTTP service for one-off operations. Reactive state lives in JobsStore. */
@Injectable({ providedIn: 'root' })
export class JobsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getJob(id: number): Observable<{ ok: boolean; job: Job }> {
    return this.http.get<{ ok: boolean; job: Job }>(`${this.base}/jobs/${id}`);
  }

  createJob(data: Partial<Job>): Observable<{ ok: boolean; job: Job }> {
    return this.http.post<{ ok: boolean; job: Job }>(`${this.base}/jobs`, data);
  }
}
