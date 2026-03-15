import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ScraperConfig } from '../models/scraper-config.model';

@Injectable({ providedIn: 'root' })
export class ScraperConfigService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  get(): Observable<{ ok: boolean; config: ScraperConfig }> {
    return this.http.get<{ ok: boolean; config: ScraperConfig }>(`${this.base}/config`);
  }

  update(data: Partial<ScraperConfig>): Observable<{ ok: boolean; config: ScraperConfig }> {
    return this.http.patch<{ ok: boolean; config: ScraperConfig }>(`${this.base}/config`, data);
  }
}
