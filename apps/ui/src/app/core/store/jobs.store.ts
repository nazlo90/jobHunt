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
import { pipe, switchMap, tap, debounceTime, distinctUntilChanged, interval, Subscription } from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import { Job, JobStats } from '../models/job.model';
import { environment } from '../../../environments/environment';

export interface ScraperStatus {
  running: boolean;
  lastRun: {
    startedAt: string;
    finishedAt?: string;
    total: number;
    inserted: number;
    updated: number;
    deleted: number;
    errors: string[];
  } | null;
}

export interface JobFilters {
  status?: string;
  source?: string;
  search?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}

interface JobsState {
  jobs: Job[];
  stats: JobStats | null;
  loading: boolean;
  statsLoading: boolean;
  filters: JobFilters;
  total: number;
  error: string | null;
  scraperStatus: ScraperStatus | null;
}

const initialState: JobsState = {
  jobs: [],
  stats: null,
  loading: false,
  statsLoading: false,
  filters: { page: 1, limit: 25 },
  total: 0,
  error: null,
  scraperStatus: null,
};

export const JobsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed(({ total, stats, scraperStatus }) => ({
    totalJobs: computed(() => total()),
    sources: computed(() => (stats()?.bySource ?? []).map((s) => s.source).sort()),
    pipeline: computed(() => stats()?.pipeline ?? 0),
    offers: computed(() => stats()?.offers ?? 0),
    thisWeek: computed(() => stats()?.thisWeek ?? 0),
    scraperRunning: computed(() => scraperStatus()?.running ?? false),
  })),

  withMethods((store, http = inject(HttpClient)) => {
    const base = environment.apiUrl;
    let pollSub: Subscription | null = null;

    function reloadData() {
      http.get<{ ok: boolean; stats: JobStats }>(`${base}/jobs/stats`).pipe(
        tapResponse({
          next: ({ stats }) => patchState(store, { stats }),
          error: () => {},
        }),
      ).subscribe();

      // Reload jobs directly (bypasses distinctUntilChanged) to show newly scraped jobs
      const filters = store.filters();
      let params = new HttpParams();
      if (filters.status)  params = params.set('status', filters.status);
      if (filters.source)  params = params.set('source', filters.source);
      if (filters.search)  params = params.set('search', filters.search);
      if (filters.sortBy)  params = params.set('sortBy', filters.sortBy);
      if (filters.page)    params = params.set('page', String(filters.page));
      if (filters.limit)   params = params.set('limit', String(filters.limit));

      http.get<{ ok: boolean; jobs: Job[]; total: number }>(`${base}/jobs`, { params }).pipe(
        tapResponse({
          next: ({ jobs, total }) => patchState(store, { jobs, total }),
          error: () => {},
        }),
      ).subscribe();
    }

    function startPolling() {
      pollSub?.unsubscribe();
      pollSub = interval(2000).pipe(
        switchMap(() => http.get<ScraperStatus & { ok: boolean }>(`${base}/scraper/status`)),
        tap((s) => patchState(store, { scraperStatus: s })),
        takeWhile((s) => s.running, true),
      ).subscribe({ complete: () => reloadData() });
    }

    return {
      loadJobs: rxMethod<JobFilters>(
        pipe(
          debounceTime(150),
          distinctUntilChanged((a, b) =>
            a.status   === b.status  &&
            a.source   === b.source  &&
            a.search   === b.search  &&
            a.sortBy   === b.sortBy  &&
            a.page     === b.page    &&
            a.limit    === b.limit
          ),
          tap((filters) => patchState(store, { loading: true, filters, error: null })),
          switchMap((filters) => {
            let params = new HttpParams();
            if (filters.status)  params = params.set('status', filters.status);
            if (filters.source)  params = params.set('source', filters.source);
            if (filters.search)  params = params.set('search', filters.search);
            if (filters.sortBy)  params = params.set('sortBy', filters.sortBy);
            if (filters.page)    params = params.set('page', String(filters.page));
            if (filters.limit)   params = params.set('limit', String(filters.limit));

            return http.get<{ ok: boolean; jobs: Job[]; total: number }>(`${base}/jobs`, { params }).pipe(
              tapResponse({
                next: ({ jobs, total }) => patchState(store, { jobs, total, loading: false }),
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
            next: ({ job }) => {
              const activeStatus = store.filters().status;
              const matchesFilter = !activeStatus || job.status === activeStatus;
              if (matchesFilter) {
                patchState(store, { jobs: store.jobs().map((j) => (j.id === id ? job : j)) });
              } else {
                patchState(store, {
                  jobs: store.jobs().filter((j) => j.id !== id),
                  total: store.total() - 1,
                });
              }
            },
            error: (err: Error) => patchState(store, { error: err.message }),
          }),
        ).subscribe();
      },

      deleteJob(id: number): void {
        http.delete(`${base}/jobs/${id}`).pipe(
          tapResponse({
            next: () => {
              patchState(store, {
                jobs: store.jobs().filter((j) => j.id !== id),
                total: store.total() - 1,
              });
              reloadData();
            },
            error: (err: Error) => patchState(store, { error: err.message }),
          }),
        ).subscribe();
      },

      setFilters(filters: Partial<JobFilters>): void {
        patchState(store, { filters: { ...store.filters(), ...filters } });
      },

      initScraper(): void {
        http.get<ScraperStatus & { ok: boolean }>(`${base}/scraper/status`).pipe(
          tapResponse({
            next: (s) => {
              patchState(store, { scraperStatus: s });
              if (s.running) startPolling();
            },
            error: () => {},
          }),
        ).subscribe();
      },

      runScraper(): void {
        // Optimistically mark as running so button disables immediately (before HTTP round-trip)
        patchState(store, { scraperStatus: { running: true, lastRun: store.scraperStatus()?.lastRun ?? null } });
        http.post<{ ok: boolean; started: boolean }>(`${base}/scraper/run`, {}).pipe(
          tapResponse({
            next: () => startPolling(),
            error: () => patchState(store, { scraperStatus: { running: false, lastRun: store.scraperStatus()?.lastRun ?? null } }),
          }),
        ).subscribe();
      },
    };
  }),
);
