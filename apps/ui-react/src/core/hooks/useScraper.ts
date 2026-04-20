import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '../api/http';
import type { ScraperStatus, ScraperConfig, ScraperProfile } from '../models/scraper.model';

export const scraperKeys = {
  status: () => ['scraper', 'status'] as const,
  config: () => ['scraper', 'config'] as const,
  profiles: () => ['profiles'] as const,
};

export function useScraperStatus() {
  return useQuery({
    queryKey: scraperKeys.status(),
    queryFn: async () => {
      const { data } = await http.get<ScraperStatus>('/scraper/status');
      return data;
    },
    refetchInterval: (query) => (query.state.data?.running ? 2_000 : 10_000),
  });
}

export function useRunScraper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profileId?: number) => http.post('/scraper/run', profileId ? { profileId } : {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scraperKeys.status() }),
  });
}

export function useStopScraper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => http.post('/scraper/stop'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scraperKeys.status() }),
  });
}

export function useScraperConfig() {
  return useQuery({
    queryKey: scraperKeys.config(),
    queryFn: async () => {
      const { data } = await http.get<ScraperConfig>('/scraper/config');
      return data;
    },
  });
}

export function useUpdateScraperConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<ScraperConfig>) =>
      http.patch<ScraperConfig>('/scraper/config', payload).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scraperKeys.config() }),
  });
}

export function useScraperProfiles() {
  return useQuery({
    queryKey: scraperKeys.profiles(),
    queryFn: async () => {
      const { data } = await http.get<{ ok: boolean; profiles: ScraperProfile[] }>('/profiles');
      return data.profiles;
    },
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string } & Partial<ScraperProfile>) =>
      http.post<{ ok: boolean; profile: ScraperProfile }>('/profiles', payload).then(r => r.data.profile),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scraperKeys.profiles() }),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<ScraperProfile>) =>
      http.patch<{ ok: boolean; profile: ScraperProfile }>(`/profiles/${id}`, data).then(r => r.data.profile),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scraperKeys.profiles() }),
  });
}

export function useActivateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      http.post<{ ok: boolean; profile: ScraperProfile }>(`/profiles/${id}/activate`, {}).then(r => r.data.profile),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scraperKeys.profiles() }),
  });
}

export function useDuplicateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      http.post<{ ok: boolean; profile: ScraperProfile }>(`/profiles/${id}/duplicate`, { name }).then(r => r.data.profile),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scraperKeys.profiles() }),
  });
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => http.delete<{ ok: boolean }>(`/profiles/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scraperKeys.profiles() }),
  });
}
