import { computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ToastService } from '@core/services/toast.service';
import {
  signalStore,
  withState,
  withComputed,
  withMethods,
  patchState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, switchMap, tap, debounceTime, distinctUntilChanged, interval, Subscription, Observable } from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import { Job, JobStats, JobStatus } from '@core/models/job.model';
import { ScraperStatus, JobFilters, JobsState } from '@core/models/jobs.store.model';
import { environment } from '@env/environment';

export type { ScraperStatus, JobFilters };

const initialState: JobsState = {
  jobs: [],
  stats: null,
  loading: false,
  statsLoading: false,
  filters: { page: 1, limit: 25 },
  total: 0,
  error: null,
  scraperStatus: null,
  scraperStopping: false,
  selectedIds: [],
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
    scraperCurrentPlatform: computed(() => scraperStatus()?.currentPlatform ?? null),
    scraperPlatformResults: computed(() => scraperStatus()?.platformResults ?? []),
  })),

  withMethods((store, http = inject(HttpClient), toast = inject(ToastService)) => {
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
      if (filters.status)      params = params.set('status', filters.status);
      if (filters.source)      params = params.set('source', filters.source);
      if (filters.search)      params = params.set('search', filters.search);
      if (filters.sortBy)      params = params.set('sortBy', filters.sortBy);
      if (filters.page)        params = params.set('page', String(filters.page));
      if (filters.limit)       params = params.set('limit', String(filters.limit));
      if (filters.minPriority) params = params.set('minPriority', String(filters.minPriority));

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
        tap((s) => {
          const prevCount = store.scraperPlatformResults().length;
          patchState(store, { scraperStatus: s });
          // Reload jobs list each time a new platform finishes
          if ((s.platformResults?.length ?? 0) > prevCount) {
            reloadData();
          }
        }),
        takeWhile((s) => s.running, true),
      ).subscribe({
        complete: () => {
          patchState(store, { scraperStopping: false });
          reloadData();
          const last = store.scraperStatus()?.lastRun;
          if (last) {
            const msg = `Scraping done — ${last.inserted} new, ${last.updated} updated`;
            toast.success(msg, 5000);
          }
        },
      });
    }

    return {
      loadJobs: rxMethod<JobFilters>(
        pipe(
          debounceTime(150),
          distinctUntilChanged((a, b) =>
            a.status      === b.status      &&
            a.source      === b.source      &&
            a.search      === b.search      &&
            a.sortBy      === b.sortBy      &&
            a.page        === b.page        &&
            a.limit       === b.limit       &&
            a.minPriority === b.minPriority
          ),
          tap((filters) => patchState(store, { loading: true, filters, error: null })),
          switchMap((filters) => {
            let params = new HttpParams();
            if (filters.status)      params = params.set('status', filters.status);
            if (filters.source)      params = params.set('source', filters.source);
            if (filters.search)      params = params.set('search', filters.search);
            if (filters.sortBy)      params = params.set('sortBy', filters.sortBy);
            if (filters.page)        params = params.set('page', String(filters.page));
            if (filters.limit)       params = params.set('limit', String(filters.limit));
            if (filters.minPriority) params = params.set('minPriority', String(filters.minPriority));

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

      addJob(data: Partial<Job>): Observable<Job> {
        return new Observable<Job>((observer) => {
          http.post<{ ok: boolean; job: Job }>(`${base}/jobs`, data).pipe(
            tapResponse({
              next: ({ job }) => {
                const activeStatus = store.filters().status;
                if (!activeStatus || job.status === activeStatus) {
                  patchState(store, { jobs: [job, ...store.jobs()], total: store.total() + 1 });
                }
                reloadData();
                observer.next(job);
                observer.complete();
              },
              error: (err: Error) => {
                patchState(store, { error: err.message });
                observer.error(err);
              },
            }),
          ).subscribe();
        });
      },

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

      stopScraper(): void {
        patchState(store, { scraperStopping: true });
        http.post(`${base}/scraper/stop`, {}).subscribe({
          error: () => patchState(store, { scraperStopping: false }),
        });
      },

      toggleSelection(id: number): void {
        const current = store.selectedIds();
        patchState(store, {
          selectedIds: current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
        });
      },

      selectAll(ids: number[]): void {
        patchState(store, { selectedIds: ids });
      },

      clearSelection(): void {
        patchState(store, { selectedIds: [] });
      },

      bulkDelete(ids: number[]): void {
        http.delete<{ ok: boolean; deleted: number }>(`${base}/jobs/bulk`, { body: { ids } }).pipe(
          tapResponse({
            next: ({ deleted }) => {
              patchState(store, {
                jobs: store.jobs().filter((j) => !ids.includes(j.id)),
                total: store.total() - deleted,
                selectedIds: [],
              });
              reloadData();
            },
            error: (err: Error) => patchState(store, { error: err.message }),
          }),
        ).subscribe();
      },

      bulkUpdateStatus(ids: number[], status: JobStatus): void {
        http.patch<{ ok: boolean; updated: number; jobs: Job[] }>(`${base}/jobs/bulk/status`, { ids, status }).pipe(
          tapResponse({
            next: ({ jobs: updatedJobs }) => {
              const updatedMap = new Map(updatedJobs.map((j) => [j.id, j]));
              const activeStatus = store.filters().status;
              let jobs = store.jobs().map((j) => updatedMap.get(j.id) ?? j);
              if (activeStatus) {
                const before = jobs.length;
                jobs = jobs.filter((j) => j.status === activeStatus);
                const removed = before - jobs.length;
                patchState(store, { jobs, total: store.total() - removed, selectedIds: [] });
              } else {
                patchState(store, { jobs, selectedIds: [] });
              }
            },
            error: (err: Error) => patchState(store, { error: err.message }),
          }),
        ).subscribe();
      },

      runScraper(profileId?: number): void {
        // Optimistically mark as running so button disables immediately (before HTTP round-trip)
        patchState(store, { scraperStatus: { running: true, lastRun: store.scraperStatus()?.lastRun ?? null } });
        http.post<{ ok: boolean; started: boolean }>(`${base}/scraper/run`, profileId ? { profileId } : {}).pipe(
          tapResponse({
            next: () => startPolling(),
            error: () => patchState(store, { scraperStatus: { running: false, lastRun: store.scraperStatus()?.lastRun ?? null } }),
          }),
        ).subscribe();
      },
    };
  }),
);
