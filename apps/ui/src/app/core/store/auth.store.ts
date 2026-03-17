import { computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import {
  AuthState,
  AuthTokenResponse,
  AuthUser,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '../models/auth.model';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState<AuthState>({
    user: null,
    accessToken: null,
    loading: false,
    error: null,
    initialized: false,
    loggingOut: false,
  }),
  withComputed(({ user, accessToken }) => ({
    isAuthenticated: computed(() => !!accessToken() && !!user()),
  })),
  withMethods((store) => {
    const http = inject(HttpClient);
    const router = inject(Router);

    const setLoading = (loading: boolean) => patchState(store, { loading });
    const setError = (error: string | null) => patchState(store, { error });

    return {
      /** Called once on app init to silently restore session via cookie */
      async init(skipRefresh = false): Promise<void> {
        if (skipRefresh) {
          patchState(store, { initialized: true });
          return;
        }
        try {
          const res = await firstValueFrom(
            http.post<AuthTokenResponse>(`${API}/auth/refresh`, {}, { withCredentials: true }),
          );
          patchState(store, { accessToken: res.accessToken });
          const user = await firstValueFrom(
            http.get<AuthUser>(`${API}/auth/me`, {
              headers: { Authorization: `Bearer ${res.accessToken}` },
            }),
          );
          patchState(store, { user, initialized: true });
        } catch {
          patchState(store, { initialized: true });
        }
      },

      setAccessToken(token: string): void {
        patchState(store, { accessToken: token });
      },

      clearAuth(): void {
        patchState(store, { user: null, accessToken: null });
      },

      async loadCurrentUser(): Promise<void> {
        const token = store.accessToken();
        if (!token) return;
        try {
          const user = await firstValueFrom(
            http.get<AuthUser>(`${API}/auth/me`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          );
          patchState(store, { user });
        } catch {
          // ignore
        }
      },

      async login(req: LoginRequest): Promise<void> {
        setLoading(true);
        setError(null);
        try {
          const res = await firstValueFrom(
            http.post<AuthTokenResponse>(`${API}/auth/login`, req, {
              withCredentials: true,
            }),
          );
          patchState(store, { accessToken: res.accessToken });
          const user = await firstValueFrom(
            http.get<AuthUser>(`${API}/auth/me`, {
              headers: { Authorization: `Bearer ${res.accessToken}` },
            }),
          );
          patchState(store, { user });
          await router.navigate(['/dashboard']);
        } catch (err: unknown) {
          setError(getErrorMessage(err));
        } finally {
          setLoading(false);
        }
      },

      async register(req: RegisterRequest): Promise<void> {
        setLoading(true);
        setError(null);
        try {
          const res = await firstValueFrom(
            http.post<AuthTokenResponse>(`${API}/auth/register`, req, {
              withCredentials: true,
            }),
          );
          patchState(store, { accessToken: res.accessToken });
          const user = await firstValueFrom(
            http.get<AuthUser>(`${API}/auth/me`, {
              headers: { Authorization: `Bearer ${res.accessToken}` },
            }),
          );
          patchState(store, { user });
          await router.navigate(['/dashboard']);
        } catch (err: unknown) {
          setError(getErrorMessage(err));
        } finally {
          setLoading(false);
        }
      },

      async logout(): Promise<void> {
        try {
          await firstValueFrom(
            http.post(`${API}/auth/logout`, {}, { withCredentials: true }),
          );
        } catch {
          // ignore
        }
        // Set loggingOut so guestGuard lets the navigation through while the
        // authenticated layout (and its router-outlet) is still mounted.
        // Clearing auth AFTER navigation prevents DashboardComponent from
        // being re-instantiated in the new router-outlet with no token.
        patchState(store, { loggingOut: true });
        await router.navigate(['/auth/login']);
        patchState(store, { user: null, accessToken: null, loggingOut: false });
      },

      async forgotPassword(req: ForgotPasswordRequest): Promise<boolean> {
        setLoading(true);
        setError(null);
        try {
          await firstValueFrom(http.post(`${API}/auth/forgot-password`, req));
          return true;
        } catch (err: unknown) {
          setError(getErrorMessage(err));
          return false;
        } finally {
          setLoading(false);
        }
      },

      async resetPassword(req: ResetPasswordRequest): Promise<boolean> {
        setLoading(true);
        setError(null);
        try {
          await firstValueFrom(http.post(`${API}/auth/reset-password`, req));
          return true;
        } catch (err: unknown) {
          setError(getErrorMessage(err));
          return false;
        } finally {
          setLoading(false);
        }
      },
    };
  }),
);

function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'error' in err) {
    const e = (err as { error: { message?: string | string[] } }).error;
    if (Array.isArray(e?.message)) return e.message.join(', ');
    if (typeof e?.message === 'string') return e.message;
  }
  return 'An unexpected error occurred';
}
