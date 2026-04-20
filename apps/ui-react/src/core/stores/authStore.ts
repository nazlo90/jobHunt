import { create } from 'zustand';
import { http, setAccessToken, clearAccessToken } from '../api/http';
import type { AuthUser, LoginRequest, RegisterRequest } from '../models/auth.model';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;

  initialize: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    try {
      const { data } = await http.post<{ accessToken: string }>('/auth/refresh');
      setAccessToken(data.accessToken);
      const { data: user } = await http.get<AuthUser>('/auth/me');
      set({ user, initialized: true });
    } catch {
      set({ user: null, initialized: true });
    }
  },

  fetchCurrentUser: async () => {
    try {
      const { data: user } = await http.get<AuthUser>('/auth/me');
      set({ user, initialized: true });
    } catch {
      set({ user: null, initialized: true });
    }
  },

  login: async (payload: LoginRequest) => {
    set({ loading: true });
    try {
      const { data } = await http.post<{ accessToken: string }>('/auth/login', payload);
      setAccessToken(data.accessToken);
      const { data: user } = await http.get<AuthUser>('/auth/me');
      set({ user });
    } finally {
      set({ loading: false });
    }
  },

  register: async (payload: RegisterRequest) => {
    set({ loading: true });
    try {
      const { data } = await http.post<{ accessToken: string }>('/auth/register', payload);
      setAccessToken(data.accessToken);
      const { data: user } = await http.get<AuthUser>('/auth/me');
      set({ user });
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    await http.post('/auth/logout').catch(() => null);
    clearAccessToken();
    set({ user: null });
  },
}));
