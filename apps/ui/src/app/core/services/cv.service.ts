import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdaptedCv } from '../models/job.model';

@Injectable({ providedIn: 'root' })
export class CvService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getCvsForJob(jobId: number): Observable<{ ok: boolean; cvs: AdaptedCv[] }> {
    return this.http.get<{ ok: boolean; cvs: AdaptedCv[] }>(`${this.base}/cvs?job_id=${jobId}`);
  }

  getMasterCv(): Observable<{ ok: boolean; masterCv: object }> {
    return this.http.get<{ ok: boolean; masterCv: object }>(`${this.base}/cvs/master-cv`);
  }

  updateMasterCv(masterCv: object): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`${this.base}/cvs/master-cv`, masterCv);
  }

  generate(jobId: number | null, jobDescription: string, masterCv?: object): Observable<{ ok: boolean; cv: AdaptedCv }> {
    return this.http.post<{ ok: boolean; cv: AdaptedCv }>(`${this.base}/cvs/generate`, {
      jobId,
      jobDescription,
      ...(masterCv ? { masterCv } : {}),
    });
  }
}
