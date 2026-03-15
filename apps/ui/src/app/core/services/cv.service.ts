import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdaptedCv } from '../models/job.model';

@Injectable({ providedIn: 'root' })
export class CvService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  generate(jobId: number | null, jobDescription: string, userCvId: number): Observable<{ ok: boolean; cv: AdaptedCv }> {
    return this.http.post<{ ok: boolean; cv: AdaptedCv }>(`${this.base}/cvs/generate`, {
      userCvId,
      jobDescription,
      ...(jobId ? { jobId } : {}),
    });
  }
}
