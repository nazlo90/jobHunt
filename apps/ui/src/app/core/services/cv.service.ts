import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdaptedCv } from '../models/job.model';

@Injectable({ providedIn: 'root' })
export class CvService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  review(jobId: number | null, jobDescription: string, userCvId: number): Observable<{ ok: boolean; cv: AdaptedCv }> {
    return this.http.post<{ ok: boolean; cv: AdaptedCv }>(`${this.base}/cvs/review`, {
      userCvId,
      jobDescription,
      ...(jobId ? { jobId } : {}),
    });
  }

  getReview(jobId: number): Observable<{ ok: boolean; cv: AdaptedCv | null }> {
    return this.http.get<{ ok: boolean; cv: AdaptedCv | null }>(`${this.base}/cvs?job_id=${jobId}`);
  }

  adapt(adaptedCvId: number): Observable<{ ok: boolean; adaptedCvText: string }> {
    return this.http.post<{ ok: boolean; adaptedCvText: string }>(`${this.base}/cvs/adapt`, { adaptedCvId });
  }
}
