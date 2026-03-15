import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserCv } from '../models/user-cv.model';

@Injectable({ providedIn: 'root' })
export class UserCvService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(): Observable<{ ok: boolean; cvs: UserCv[] }> {
    return this.http.get<{ ok: boolean; cvs: UserCv[] }>(`${this.base}/user-cvs`);
  }

  create(name: string, cvText: string, pdfFile: File): Observable<{ ok: boolean; cv: UserCv }> {
    const form = new FormData();
    form.append('name', name);
    form.append('cvText', cvText);
    form.append('pdf', pdfFile, pdfFile.name);
    return this.http.post<{ ok: boolean; cv: UserCv }>(`${this.base}/user-cvs`, form);
  }

  fileUrl(id: number): string {
    return `${this.base}/user-cvs/${id}/file`;
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/user-cvs/${id}`);
  }
}
