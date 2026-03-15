import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ScraperProfile } from '../models/scraper-profile.model';

@Injectable({ providedIn: 'root' })
export class ScraperProfileService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/profiles`;

  list(): Observable<{ ok: boolean; profiles: ScraperProfile[] }> {
    return this.http.get<{ ok: boolean; profiles: ScraperProfile[] }>(this.base);
  }

  getActive(): Observable<{ ok: boolean; profile: ScraperProfile }> {
    return this.http.get<{ ok: boolean; profile: ScraperProfile }>(`${this.base}/active`);
  }

  create(name: string, data?: Partial<ScraperProfile>): Observable<{ ok: boolean; profile: ScraperProfile }> {
    return this.http.post<{ ok: boolean; profile: ScraperProfile }>(this.base, { name, ...data });
  }

  update(id: number, data: Partial<ScraperProfile>): Observable<{ ok: boolean; profile: ScraperProfile }> {
    return this.http.patch<{ ok: boolean; profile: ScraperProfile }>(`${this.base}/${id}`, data);
  }

  activate(id: number): Observable<{ ok: boolean; profile: ScraperProfile }> {
    return this.http.post<{ ok: boolean; profile: ScraperProfile }>(`${this.base}/${id}/activate`, {});
  }

  duplicate(id: number, name: string): Observable<{ ok: boolean; profile: ScraperProfile }> {
    return this.http.post<{ ok: boolean; profile: ScraperProfile }>(`${this.base}/${id}/duplicate`, { name });
  }

  delete(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}`);
  }
}
