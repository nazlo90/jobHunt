import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ScraperStatus {
  running: boolean;
  lastRun: {
    startedAt: string;
    finishedAt?: string;
    total: number;
    inserted: number;
    errors: string[];
  } | null;
}

@Injectable({ providedIn: 'root' })
export class ScraperService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getStatus(): Observable<ScraperStatus & { ok: boolean }> {
    return this.http.get<ScraperStatus & { ok: boolean }>(`${this.base}/scraper/status`);
  }

  run(): Observable<{ ok: boolean; run: ScraperStatus['lastRun'] }> {
    return this.http.post<{ ok: boolean; run: ScraperStatus['lastRun'] }>(`${this.base}/scraper/run`, {});
  }
}
