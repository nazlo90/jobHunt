export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  emailVerified: boolean;
  avatarUrl: string | null;
  provider: 'local' | 'google';
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  loggingOut: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface AuthTokenResponse {
  accessToken: string;
}
