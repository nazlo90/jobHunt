import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '../api/http';
import type { AdaptedCv } from '../models/job.model';
import type { UserCv } from '../models/user-cv.model';

export const cvKeys = {
  adapted: (jobId?: number) => ['cvs', 'adapted', jobId] as const,
  userCvs: () => ['cvs', 'user'] as const,
};

export function useJobReview(jobId: number) {
  return useQuery({
    queryKey: cvKeys.adapted(jobId),
    queryFn: async () => {
      const { data } = await http.get<{ ok: boolean; cv: AdaptedCv | null }>('/cvs', {
        params: { job_id: jobId },
      });
      return data.cv;
    },
    enabled: !!jobId,
  });
}

export function useReviewCv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { jobId: number; jobDescription: string; userCvId: number }) =>
      http.post<{ ok: boolean; cv: AdaptedCv }>('/cvs/review', payload).then((r) => r.data.cv),
    onSuccess: (_, vars) =>
      queryClient.invalidateQueries({ queryKey: cvKeys.adapted(vars.jobId) }),
  });
}

export function useAdaptCv() {
  return useMutation({
    mutationFn: (adaptedCvId: number) =>
      http
        .post<{ ok: boolean; adaptedCvText: string }>('/cvs/adapt', { adaptedCvId })
        .then((r) => r.data.adaptedCvText),
  });
}

export function useGenerateCv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { job_id?: number; job_description: string }) =>
      http.post<AdaptedCv>('/cvs/generate', payload).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cvs'] }),
  });
}

export function useUserCvs() {
  return useQuery({
    queryKey: cvKeys.userCvs(),
    queryFn: async () => {
      const { data } = await http.get<{ ok: boolean; cvs: UserCv[] }>('/user-cvs');
      return data.cvs;
    },
  });
}

export function useDeleteUserCv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => http.delete(`/user-cvs/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cvKeys.userCvs() }),
  });
}
