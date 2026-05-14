import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CommentVariants, PostVariant } from '../models/linkedin.model';

@Injectable({ providedIn: 'root' })
export class LinkedInService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/linkedin`;

  generateComment(
    postText: string,
    authorName: string,
    authorTitle: string,
  ): Observable<{ ok: boolean; comments: CommentVariants }> {
    return this.http.post<{ ok: boolean; comments: CommentVariants }>(`${this.base}/comment`, {
      postText,
      authorName,
      authorTitle,
    });
  }

  generatePost(
    category: string,
    seedIdea: string,
  ): Observable<{ ok: boolean; posts: PostVariant[] }> {
    return this.http.post<{ ok: boolean; posts: PostVariant[] }>(`${this.base}/write`, {
      category,
      seedIdea,
    });
  }

  generateDM(
    recruiterName: string,
    company: string,
    roleTitle: string,
    companyNote: string,
  ): Observable<{ ok: boolean; dm: string }> {
    return this.http.post<{ ok: boolean; dm: string }>(`${this.base}/dm`, {
      recruiterName,
      company,
      roleTitle,
      companyNote,
    });
  }
}
