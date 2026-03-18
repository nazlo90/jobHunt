import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, EMPTY, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthStore } from '../store/auth.store';
import { AuthTokenResponse } from '../models/auth.model';
import { environment } from '../../../environments/environment';

// Shared refresh state — prevents multiple concurrent refreshes
let isRefreshing = false;
const refreshToken$ = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  // Skip auth endpoints to avoid infinite loops
  if (req.url.includes('/auth/')) {
    return next(req);
  }

  const token = authStore.accessToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) return throwError(() => err);

      // No token means user is already logged out — skip refresh
      if (!authStore.accessToken()) return throwError(() => err);

      if (isRefreshing) {
        // Queue this request until refresh completes
        return refreshToken$.pipe(
          filter((t): t is string => t !== null),
          take(1),
          switchMap((newToken) =>
            next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })),
          ),
        );
      }

      isRefreshing = true;
      refreshToken$.next(null);

      const http = inject(HttpClient);

      return http
        .post<AuthTokenResponse>(
          `${environment.apiUrl}/auth/refresh`,
          {},
          { withCredentials: true },
        )
        .pipe(
          switchMap(({ accessToken }) => {
            isRefreshing = false;
            authStore.setAccessToken(accessToken);
            refreshToken$.next(accessToken);
            return next(
              req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } }),
            );
          }),
          catchError(() => {
            isRefreshing = false;
            refreshToken$.next(null);
            authStore.clearAuth();
            router.navigate(['/auth/login']);
            return EMPTY;
          }),
        );
    }),
  );
};
