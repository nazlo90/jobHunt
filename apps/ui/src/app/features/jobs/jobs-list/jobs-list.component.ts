import { Component, OnInit, inject } from '@angular/core';
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
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { JobsStore } from '../../../core/store/jobs.store';
import { JOB_STATUSES } from '../../../core/models/job.model';

@Component({
  selector: 'app-jobs-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule, ReactiveFormsModule,
    MatTableModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatChipsModule, MatProgressBarModule,
    MatPaginatorModule,
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

      <table mat-table [dataSource]="store.jobs()" class="jobs-table mat-elevation-z1">
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
  `],
})
export class JobsListComponent implements OnInit {
  readonly store = inject(JobsStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly statuses = JOB_STATUSES;
  readonly displayedColumns = ['priority', 'company', 'role', 'status', 'salary', 'source', 'createdAt'];

  searchCtrl = new FormControl('');
  selectedStatus = '';
  selectedSource = '';
  selectedSort = 'created_at';
  pageSize = 25;
  pageIndex = 0;

  ngOnInit() {
    const params = this.route.snapshot.queryParams;
    this.searchCtrl.setValue(params['search'] ?? '', { emitEvent: false });
    this.selectedStatus = params['status'] ?? '';
    this.selectedSource = params['source'] ?? '';
    this.selectedSort = params['sortBy'] ?? 'created_at';
    this.pageSize = Number(params['limit'] ?? 25);
    this.pageIndex = Math.max(0, Number(params['page'] ?? 1) - 1);

    this.applyFilters();

    this.searchCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
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
        page: filters.page > 1 ? filters.page : null,
        limit: filters.limit !== 25 ? filters.limit : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    this.store.loadJobs(filters);
  }

  statusClass(status: string): string {
    return `status-badge status-${status.toLowerCase().replace(' ', '-')}`;
  }
}
