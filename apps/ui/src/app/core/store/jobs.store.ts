import { computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  signalStore,
  withState,
  withComputed,
  withMethods,
  patchState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, switchMap, tap, debounceTime, distinctUntilChanged } from 'rxjs';
import { Job, JobStats } from '../models/job.model';
import { environment } from '../../../environments/environment';

export interface JobFilters {
  status?: string;
  source?: string;
  search?: string;
  sortBy?: string;
}

interface JobsState {
  jobs: Job[];
  stats: JobStats | null;
  loading: boolean;
  statsLoading: boolean;
  filters: JobFilters;
  error: string | null;
}

const initialState: JobsState = {
  jobs: [],
  stats: null,
  loading: false,
  statsLoading: false,
  filters: {},
  error: null,
};

export const JobsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed(({ jobs, stats }) => ({
    totalJobs: computed(() => jobs().length),
    sources: computed(() => [...new Set(jobs().map((j) => j.source))].sort()),
    pipeline: computed(() => stats()?.pipeline ?? 0),
    offers: computed(() => stats()?.offers ?? 0),
    thisWeek: computed(() => stats()?.thisWeek ?? 0),
  })),

  withMethods((store, http = inject(HttpClient)) => {
    const base = environment.apiUrl;

    return {
      loadJobs: rxMethod<JobFilters>(
        pipe(
          debounceTime(150),
          distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
          tap((filters) => patchState(store, { loading: true, filters, error: null })),
          switchMap((filters) => {
            let params = new HttpParams();
            if (filters.status)  params = params.set('status', filters.status);
            if (filters.source)  params = params.set('source', filters.source);
            if (filters.search)  params = params.set('search', filters.search);
            if (filters.sortBy)  params = params.set('sortBy', filters.sortBy);

            return http.get<{ ok: boolean; jobs: Job[] }>(`${base}/jobs`, { params }).pipe(
              tapResponse({
                next: ({ jobs }) => patchState(store, { jobs, loading: false }),
                error: (err: Error) => patchState(store, { loading: false, error: err.message }),
              }),
            );
          }),
        ),
      ),

      loadStats: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { statsLoading: true })),
          switchMap(() =>
            http.get<{ ok: boolean; stats: JobStats }>(`${base}/jobs/stats`).pipe(
              tapResponse({
                next: ({ stats }) => patchState(store, { stats, statsLoading: false }),
                error: () => patchState(store, { statsLoading: false }),
              }),
            ),
          ),
        ),
      ),

      updateJob(id: number, data: Partial<Job>): void {
        http.patch<{ ok: boolean; job: Job }>(`${base}/jobs/${id}`, data).pipe(
          tapResponse({
            next: ({ job }) =>
              patchState(store, {
                jobs: store.jobs().map((j) => (j.id === id ? job : j)),
              }),
            error: (err: Error) => patchState(store, { error: err.message }),
          }),
        ).subscribe();
      },

      deleteJob(id: number): void {
        http.delete(`${base}/jobs/${id}`).pipe(
          tapResponse({
            next: () => patchState(store, { jobs: store.jobs().filter((j) => j.id !== id) }),
            error: (err: Error) => patchState(store, { error: err.message }),
          }),
        ).subscribe();
      },

      setFilters(filters: Partial<JobFilters>): void {
        const merged = { ...store.filters(), ...filters };
        patchState(store, { filters: merged });
      },
    };
  }),
);
