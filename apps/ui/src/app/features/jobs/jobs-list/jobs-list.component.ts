import { Component, OnInit, inject, DestroyRef, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
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
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { JobsStore } from '../../../core/store/jobs.store';
import { JOB_STATUSES, JobStatus } from '../../../core/models/job.model';

@Component({
  selector: 'app-jobs-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule, ReactiveFormsModule,
    MatTableModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatChipsModule, MatProgressBarModule,
    MatPaginatorModule, MatCheckboxModule, MatTooltipModule, MatDividerModule,
  ],
  template: `
    <div class="jobs-list">
      <div class="list-header">
        <h1>Jobs <span class="count">({{ store.totalJobs() }})</span></h1>
        <button mat-raised-button color="primary" routerLink="/jobs/new">
          <span class="btn-content"><mat-icon>add</mat-icon>Add Job</span>
        </button>
      </div>

      <div class="filters">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search</mat-label>
          <input matInput [formControl]="searchCtrl" placeholder="Company, role, tech...">
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

      <!-- Bulk actions toolbar -->
      @if (store.selectedIds().length > 0) {
        <div class="bulk-toolbar">
          <span class="sel-count">{{ store.selectedIds().length }} selected</span>
          <mat-divider vertical></mat-divider>

          <mat-form-field appearance="outline" class="bulk-status-field">
            <mat-label>Set status</mat-label>
            <mat-select [(ngModel)]="bulkStatusValue" (ngModelChange)="bulkChangeStatus($event)">
              @for (s of statuses; track s) {
                <mat-option [value]="s">{{ s }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <button mat-stroked-button color="primary" (click)="exportCsv()" matTooltip="Export selected to CSV">
            <mat-icon>download</mat-icon> Export CSV
          </button>

          <button mat-flat-button class="bulk-delete-btn" (click)="bulkDelete()" matTooltip="Delete selected">
            <mat-icon>delete</mat-icon> Delete
          </button>

          <button mat-icon-button (click)="store.clearSelection()" matTooltip="Clear selection">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      }

      <table mat-table [dataSource]="store.jobs()" class="jobs-table mat-elevation-z1">

        <ng-container matColumnDef="select">
          <th mat-header-cell *matHeaderCellDef (click)="$event.stopPropagation()">
            <mat-checkbox
              [checked]="allSelected()"
              [indeterminate]="someSelected()"
              (change)="toggleSelectAll($event.checked)">
            </mat-checkbox>
          </th>
          <td mat-cell *matCellDef="let job" (click)="$event.stopPropagation()">
            <mat-checkbox
              [checked]="isSelected(job.id)"
              (change)="store.toggleSelection(job.id)">
            </mat-checkbox>
          </td>
        </ng-container>

        <ng-container matColumnDef="priority">
          <th mat-header-cell *matHeaderCellDef>★</th>
          <td mat-cell *matCellDef="let job">
            <span class="priority-star">{{ '★'.repeat(job.priority) }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="company">
          <th mat-header-cell *matHeaderCellDef>Company</th>
          <td mat-cell *matCellDef="let job">
            <a [routerLink]="['/jobs', job.id]" class="company-link">{{ job.company }}</a>
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
            <button mat-icon-button color="warn" (click)="deleteJob(job.id, $event)"
                    title="Delete job">
              <mat-icon>delete</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"
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
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .jobs-list { width: 100%; }
    .btn-content { display: inline-flex; align-items: center; gap: 6px; }
    .list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    h1 { font-size: 26px; font-weight: 700; margin: 0; color: #1a1a2e; }
    .count { font-size: 16px; color: #999; font-weight: 400; }
    .filters { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
    .search-field { flex: 1; min-width: 200px; }
    .jobs-table { width: 100%; background: #fff; border-radius: 8px; overflow: hidden; }
    .job-row:hover { background: #f5f7ff; cursor: pointer; }
    .company-link { color: #3f51b5; text-decoration: none; font-weight: 500; }
    .company-link:hover { text-decoration: underline; }
    .priority-star { color: #ffc107; font-size: 12px; letter-spacing: -1px; }

    .bulk-toolbar {
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
      flex-wrap: nowrap;
      z-index: 1000;
      animation: slideUp 0.18s ease;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateX(-50%) translateY(10px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    .sel-count {
      font-weight: 700;
      font-size: 14px;
      color: #3f51b5;
      white-space: nowrap;
      padding: 0 4px;
    }
    .bulk-toolbar mat-divider { height: 28px; margin: 0 6px; }
    .bulk-status-field { margin-bottom: -1.25em; width: 160px; }
    .bulk-toolbar button { white-space: nowrap; }
    .bulk-delete-btn { background: #e53935 !important; color: #fff !important; }
    .bulk-delete-btn mat-icon { color: #fff !important; }
    .bulk-delete-btn:hover { background: #c62828 !important; }
  `],
})
export class JobsListComponent implements OnInit {
  readonly store = inject(JobsStore);
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly statuses = JOB_STATUSES;
  readonly displayedColumns = ['select', 'priority', 'company', 'role', 'status', 'salary', 'source', 'createdAt', 'actions'];

  searchCtrl = new FormControl('');
  selectedStatus = 'New';
  selectedSource = '';
  selectedSort = 'created_at';
  selectedMinPriority = 0;
  pageSize = 25;
  pageIndex = 0;
  bulkStatusValue: JobStatus | null = null;

  readonly allSelected = computed(() => {
    const jobs = this.store.jobs();
    const ids = this.store.selectedIds();
    return jobs.length > 0 && jobs.every((j) => ids.includes(j.id));
  });

  readonly someSelected = computed(() => {
    const ids = this.store.selectedIds();
    return ids.length > 0 && !this.allSelected();
  });

  isSelected(id: number): boolean {
    return this.store.selectedIds().includes(id);
  }

  toggleSelectAll(checked: boolean): void {
    if (checked) {
      this.store.selectAll(this.store.jobs().map((j) => j.id));
    } else {
      this.store.clearSelection();
    }
  }

  ngOnInit() {
    const params = this.route.snapshot.queryParams;
    this.searchCtrl.setValue(params['search'] ?? '', { emitEvent: false });
    this.selectedStatus = params['status'] ?? 'New';
    this.selectedSource = params['source'] ?? '';
    this.selectedSort = params['sortBy'] ?? 'created_at';
    this.selectedMinPriority = Number(params['minPriority'] ?? 0);
    this.pageSize = Number(params['limit'] ?? 25);
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

  // Single-row actions
  deleteJob(id: number, event: Event) {
    event.stopPropagation();
    if (confirm('Delete this job?')) {
      this.store.deleteJob(id);
    }
  }

  saveJob(id: number, event: Event) {
    event.stopPropagation();
    this.store.updateJob(id, { status: 'Saved' });
  }

  archiveJob(id: number, event: Event) {
    event.stopPropagation();
    this.store.updateJob(id, { status: 'Archived' });
  }

  // Bulk actions
  bulkDelete() {
    const ids = this.store.selectedIds();
    if (confirm(`Delete ${ids.length} job(s)?`)) {
      this.store.bulkDelete(ids);
    }
  }

  bulkSave() {
    this.store.bulkUpdateStatus(this.store.selectedIds(), 'Saved');
  }

  bulkArchive() {
    this.store.bulkUpdateStatus(this.store.selectedIds(), 'Archived');
  }

  bulkChangeStatus(status: JobStatus) {
    this.store.bulkUpdateStatus(this.store.selectedIds(), status);
    this.bulkStatusValue = null;
  }

  exportCsv() {
    const ids = new Set(this.store.selectedIds());
    const rows = this.store.jobs().filter((j) => ids.has(j.id));
    const headers = ['id', 'company', 'role', 'status', 'salary', 'source', 'location', 'url', 'createdAt'];
    const csv = [
      headers.join(','),
      ...rows.map((j) =>
        headers.map((h) => {
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
  }

  statusClass(status: string): string {
    return `status-badge status-${status.toLowerCase().replace(/\s+/g, '-')}`;
  }
}
