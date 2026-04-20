import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '../api/http';
import type { Job, JobStats, JobsFilter } from '../models/job.model';

export const jobKeys = {
  all: ['jobs'] as const,
  list: (filters: JobsFilter) => ['jobs', 'list', filters] as const,
  detail: (id: number) => ['jobs', 'detail', id] as const,
  stats: () => ['jobs', 'stats'] as const,
};

export function useJobs(filters: JobsFilter = {}) {
  return useQuery({
    queryKey: jobKeys.list(filters),
    queryFn: async () => {
      const { data } = await http.get<{ ok: boolean; jobs: Job[]; total: number }>('/jobs', {
        params: filters,
      });
      return { jobs: data.jobs, total: data.total };
    },
  });
}

export function useJob(id: number) {
  return useQuery({
    queryKey: jobKeys.detail(id),
    queryFn: async () => {
      const { data } = await http.get<{ ok: boolean; job: Job }>(`/jobs/${id}`);
      return data.job;
    },
    enabled: !!id,
  });
}

export function useJobStats() {
  return useQuery({
    queryKey: jobKeys.stats(),
    queryFn: async () => {
      const { data } = await http.get<{ ok: boolean; stats: JobStats }>('/jobs/stats');
      return data.stats;
    },
    refetchInterval: 30_000,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Job>) =>
      http.post<{ ok: boolean; job: Job }>('/jobs', payload).then((r) => r.data.job),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: jobKeys.all }),
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<Job> & { id: number }) =>
      http.patch<{ ok: boolean; job: Job }>(`/jobs/${id}`, payload).then((r) => r.data.job),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
      queryClient.setQueryData(jobKeys.detail(updated.id), updated);
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => http.delete(`/jobs/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: jobKeys.all }),
  });
}

export function useAutocompleteJob() {
  return useMutation({
    mutationFn: (url: string) =>
      http.post<Partial<Job>>('/jobs/autocomplete', { url }).then((r) => r.data),
  });
}

export function useBulkDeleteJobs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => http.delete('/jobs/bulk', { data: { ids } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: jobKeys.all }),
  });
}

export function useBulkUpdateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, status }: { ids: number[]; status: string }) =>
      http.patch('/jobs/bulk/status', { ids, status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: jobKeys.all }),
  });
}
