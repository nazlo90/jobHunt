import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // 401s are handled by authInterceptor (refresh + redirect to login)
      if (err.status !== 401) {
        toast.error(extractMessage(err));
      }
      return throwError(() => err);
    }),
  );
};

function extractMessage(err: HttpErrorResponse): string {
  const body = err.error as Record<string, unknown> | null;
  if (body && typeof body === 'object') {
    const msg = body['message'];
    if (Array.isArray(msg) && msg.length > 0) return String(msg[0]);
    if (typeof msg === 'string' && msg) return msg;
  }
  if (err.status === 0) return 'Connection error — is the API running?';
  if (err.status === 400) return 'Invalid request';
  if (err.status === 404) return 'Not found';
  if (err.status >= 500) return 'Server error — please try again';
  return err.message || 'Something went wrong';
}
