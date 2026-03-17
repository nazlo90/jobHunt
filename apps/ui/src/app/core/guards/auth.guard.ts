import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthStore } from '../store/auth.store';

export const authGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  // Wait for the initialization check (silent refresh on app start) to complete
  return toObservable(authStore.initialized).pipe(
    filter(Boolean),
    take(1),
    map(() => {
      if (authStore.isAuthenticated()) return true;
      return router.createUrlTree(['/auth/login']);
    }),
  );
};
