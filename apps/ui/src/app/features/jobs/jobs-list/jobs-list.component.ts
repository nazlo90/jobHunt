import { Component, OnInit, OnDestroy, inject, DestroyRef, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { debounceTime, distinctUntilChanged, Subscription } from 'rxjs';
import { JobsStore } from '@core/store/jobs.store';
import { ToastService } from '@core/services/toast.service';
import { JOB_STATUSES, JobStatus } from '@core/models/job.model';

const ALL_COLUMNS = ['select', 'priority', 'company', 'role', 'status', 'salary', 'source', 'createdAt', 'actions'] as const;
const TABLET_COLUMNS = ['select', 'priority', 'company', 'role', 'status', 'actions'] as const;
const MOBILE_COLUMNS = ['company', 'role', 'status', 'actions'] as const;

@Component({
  selector: 'app-jobs-list',
  imports: [
    RouterLink, FormsModule, ReactiveFormsModule, DatePipe,
    MatTableModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatChipsModule, MatProgressBarModule,
    MatPaginatorModule, MatCheckboxModule, MatTooltipModule, MatDividerModule,
  ],
  template: `
    <div class="w-full">

      <!-- Page header -->
      <div class="flex justify-between items-center mb-6">
        <h1 class="m-0 text-2xl font-bold text-slate-900">
          Jobs <span class="text-base text-slate-400 font-normal">({{ store.totalJobs() }})</span>
        </h1>
        <button mat-flat-button color="primary" routerLink="/jobs/new">
          <span class="flex items-center gap-1.5"><mat-icon>add</mat-icon>Add Job</span>
        </button>
      </div>

      <!-- Filters -->
      <div class="flex gap-3 flex-wrap mb-4 [&>mat-form-field]:flex-shrink-0">
        <mat-form-field appearance="outline" class="flex-1 min-w-[200px]">
          <mat-label>Search</mat-label>
          <input matInput [formControl]="searchCtrl" placeholder="Company, role, tech…">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select [(ngModel)]="selectedStatus" (ngModelChange)="onFilterChange()">
            <mat-option value="">All</mat-option>
            @for (s of statuses; track s) {
              <mat-option [value]="s">{{ s }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Source</mat-label>
          <mat-select [(ngModel)]="selectedSource" (ngModelChange)="onFilterChange()">
            <mat-option value="">All</mat-option>
            @for (s of store.sources(); track s) {
              <mat-option [value]="s">{{ s }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Min Stars</mat-label>
          <mat-select [(ngModel)]="selectedMinPriority" (ngModelChange)="onFilterChange()">
            <mat-option [value]="0">Any</mat-option>
            @for (p of [1,2,3,4,5]; track p) {
              <mat-option [value]="p">{{ '★'.repeat(p) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Sort by</mat-label>
          <mat-select [(ngModel)]="selectedSort" (ngModelChange)="onFilterChange()">
            <mat-option value="created_at">Date Added</mat-option>
            <mat-option value="priority">Priority</mat-option>
            <mat-option value="company">Company</mat-option>
            <mat-option value="salary">Salary</mat-option>
            <mat-option value="applied_date">Applied Date</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      @if (store.loading()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      }

      <!-- Table -->
      <table mat-table [dataSource]="store.jobs()" class="w-full bg-white rounded-lg overflow-hidden shadow-sm">

        <ng-container matColumnDef="select">
          <th mat-header-cell *matHeaderCellDef (click)="$event.stopPropagation()">
            <mat-checkbox [checked]="allSelected()" [indeterminate]="someSelected()"
                          (change)="toggleSelectAll($event.checked)">
            </mat-checkbox>
          </th>
          <td mat-cell *matCellDef="let job" (click)="$event.stopPropagation()">
            <mat-checkbox [checked]="isSelected(job.id)" (change)="store.toggleSelection(job.id)">
            </mat-checkbox>
          </td>
        </ng-container>

        <ng-container matColumnDef="priority">
          <th mat-header-cell *matHeaderCellDef>★</th>
          <td mat-cell *matCellDef="let job">
            <span class="text-amber-400 text-xs tracking-tighter">{{ '★'.repeat(job.priority) }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="company">
          <th mat-header-cell *matHeaderCellDef>Company</th>
          <td mat-cell *matCellDef="let job">
            <a [routerLink]="['/jobs', job.id]" class="text-violet-600 font-medium no-underline hover:underline">
              {{ job.company }}
            </a>
          </td>
        </ng-container>

        <ng-container matColumnDef="role">
          <th mat-header-cell *matHeaderCellDef>Role</th>
          <td mat-cell *matCellDef="let job">{{ job.role }}</td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let job">
            <span [class]="statusClass(job.status)">{{ job.status }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="salary">
          <th mat-header-cell *matHeaderCellDef>Salary</th>
          <td mat-cell *matCellDef="let job">{{ job.salary || '—' }}</td>
        </ng-container>

        <ng-container matColumnDef="source">
          <th mat-header-cell *matHeaderCellDef>Source</th>
          <td mat-cell *matCellDef="let job"><mat-chip>{{ job.source }}</mat-chip></td>
        </ng-container>

        <ng-container matColumnDef="createdAt">
          <th mat-header-cell *matHeaderCellDef>Added</th>
          <td mat-cell *matCellDef="let job">{{ job.createdAt | date:'MMM d' }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let job">
            <div class="flex items-center">
              @if (job.url) {
                <a mat-icon-button [href]="job.url" target="_blank" rel="noopener"
                   (click)="$event.stopPropagation()" matTooltip="Open job posting">
                  <mat-icon class="!text-slate-400">open_in_new</mat-icon>
                </a>
              } @else {
                <span class="w-10"></span>
              }
              <button mat-icon-button (click)="deleteJob(job.id, $event)" title="Delete job">
                <mat-icon class="!text-red-500">delete</mat-icon>
              </button>
            </div>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns()"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns();"
            class="job-row" [routerLink]="['/jobs', row.id]"></tr>
      </table>

      <mat-paginator
        [length]="store.totalJobs()"
        [pageSize]="pageSize"
        [pageIndex]="pageIndex"
        [pageSizeOptions]="[10, 25, 50, 100]"
        (page)="onPageChange($event)"
        showFirstLastButtons>
      </mat-paginator>

    </div>

    <!-- Bulk actions floating bar -->
    @if (store.selectedIds().length > 0) {
      <div class="bulk-bar">
        <span class="text-sm font-bold text-violet-600 whitespace-nowrap px-1">
          {{ store.selectedIds().length }} selected
        </span>
        <mat-divider vertical class="!h-7 !mx-1.5"></mat-divider>

        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-40">
          <mat-label>Set status</mat-label>
          <mat-select [(ngModel)]="bulkStatusValue" (ngModelChange)="bulkChangeStatus($event)">
            @for (s of statuses; track s) {
              <mat-option [value]="s">{{ s }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <button mat-stroked-button color="primary" (click)="exportCsv()" matTooltip="Export selected to CSV">
          <mat-icon>download</mat-icon> CSV
        </button>

        <button mat-flat-button class="!bg-red-600 !text-white hover:!bg-red-700" (click)="bulkDelete()">
          <mat-icon>delete</mat-icon> Delete
        </button>

        <button mat-icon-button (click)="store.clearSelection()" matTooltip="Clear selection">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    }
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .job-row:hover { background: #f5f3ff; cursor: pointer; }
    .bulk-bar {
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.08);
      z-index: 1000;
      animation: slideUp 0.18s ease;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateX(-50%) translateY(10px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
  `],
})
export class JobsListComponent implements OnInit, OnDestroy {
  readonly store = inject(JobsStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private bpSub?: Subscription;

  readonly statuses = JOB_STATUSES;
  readonly isMobile = signal(false);
  readonly isTablet = signal(false);

  readonly displayedColumns = computed(() => {
    if (this.isMobile()) return [...MOBILE_COLUMNS];
    if (this.isTablet()) return [...TABLET_COLUMNS];
    return [...ALL_COLUMNS];
  });

  searchCtrl = new FormControl('');
  selectedStatus = '';
  selectedSource = '';
  selectedSort = 'created_at';
  selectedMinPriority = 0;
  pageSize = 25;
  pageIndex = 0;
  bulkStatusValue: JobStatus | null = null;

  readonly allSelected = computed(() => {
    const jobs = this.store.jobs();
    const ids = this.store.selectedIds();
    return jobs.length > 0 && jobs.every(j => ids.includes(j.id));
  });

  readonly someSelected = computed(() => {
    const ids = this.store.selectedIds();
    return ids.length > 0 && !this.allSelected();
  });

  isSelected(id: number): boolean {
    return this.store.selectedIds().includes(id);
  }

  toggleSelectAll(checked: boolean) {
    if (checked) this.store.selectAll(this.store.jobs().map(j => j.id));
    else this.store.clearSelection();
  }

  ngOnInit() {
    this.bpSub = this.breakpointObserver
      .observe(['(max-width: 599px)', '(max-width: 959px)'])
      .subscribe(result => {
        this.isMobile.set(result.breakpoints['(max-width: 599px)']);
        this.isTablet.set(!result.breakpoints['(max-width: 599px)'] && result.breakpoints['(max-width: 959px)']);
      });

    const params = this.route.snapshot.queryParams;
    const saved = this.store.filters();
    this.searchCtrl.setValue(params['search'] ?? '', { emitEvent: false });
    this.selectedStatus = params['status'] ?? saved.status ?? '';
    this.selectedSource = params['source'] ?? saved.source ?? '';
    this.selectedSort = params['sortBy'] ?? saved.sortBy ?? 'created_at';
    this.selectedMinPriority = Number(params['minPriority'] ?? saved.minPriority ?? 0);
    this.pageSize = Number(params['limit'] ?? saved.limit ?? 25);
    this.pageIndex = Math.max(0, Number(params['page'] ?? 1) - 1);

    this.store.loadJobs({
      search: this.searchCtrl.value || undefined,
      status: this.selectedStatus || undefined,
      source: this.selectedSource || undefined,
      sortBy: this.selectedSort,
      minPriority: this.selectedMinPriority || undefined,
      page: this.pageIndex + 1,
      limit: this.pageSize,
    });
    this.store.loadStats(undefined);

    this.searchCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.pageIndex = 0;
      this.applyFilters();
    });
  }

  onFilterChange() {
    this.pageIndex = 0;
    this.applyFilters();
  }

  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.applyFilters();
  }

  applyFilters() {
    const filters = {
      search: this.searchCtrl.value || undefined,
      status: this.selectedStatus || undefined,
      source: this.selectedSource || undefined,
      sortBy: this.selectedSort,
      minPriority: this.selectedMinPriority || undefined,
      page: this.pageIndex + 1,
      limit: this.pageSize,
    };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: filters.search ?? null,
        status: filters.status ?? null,
        source: filters.source ?? null,
        sortBy: filters.sortBy !== 'created_at' ? filters.sortBy : null,
        minPriority: filters.minPriority ?? null,
        page: filters.page > 1 ? filters.page : null,
        limit: filters.limit !== 25 ? filters.limit : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.store.loadJobs(filters);
  }

  deleteJob(id: number, event: Event) {
    event.stopPropagation();
    if (confirm('Delete this job?')) {
      this.store.deleteJob(id);
      this.toast.success('Job deleted');
    }
  }

  bulkDelete() {
    const ids = this.store.selectedIds();
    if (confirm(`Delete ${ids.length} job(s)?`)) {
      this.store.bulkDelete(ids);
      this.toast.success(`${ids.length} job(s) deleted`);
    }
  }

  bulkChangeStatus(status: JobStatus) {
    const ids = this.store.selectedIds();
    this.store.bulkUpdateStatus(ids, status);
    this.bulkStatusValue = null;
    this.toast.success(`Updated ${ids.length} job(s) to "${status}"`);
  }

  exportCsv() {
    const ids = new Set(this.store.selectedIds());
    const rows = this.store.jobs().filter(j => ids.has(j.id));
    const headers = ['id', 'company', 'role', 'status', 'salary', 'source', 'location', 'url', 'createdAt'];
    const csv = [
      headers.join(','),
      ...rows.map(j =>
        headers.map(h => {
          const val = (j as unknown as Record<string, unknown>)[h] ?? '';
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jobs-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast.success(`Exported ${rows.length} job(s)`);
  }

  statusClass(status: string): string {
    return `status-badge status-${status.toLowerCase().replace(/\s+/g, '-')}`;
  }

  ngOnDestroy() {
    this.bpSub?.unsubscribe();
  }
}
