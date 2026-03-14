import { Component, OnInit, inject, linkedSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
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
  ],
  template: `
    <div class="jobs-list">
      <div class="list-header">
        <h1>Jobs <span class="count">({{ store.totalJobs() }})</span></h1>
        <button mat-raised-button color="primary" routerLink="/jobs/new">
          <mat-icon>add</mat-icon> Add Job
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
          <mat-select [(ngModel)]="selectedStatus" (ngModelChange)="applyFilters()">
            <mat-option value="">All</mat-option>
            @for (s of statuses; track s) {
              <mat-option [value]="s">{{ s }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Source</mat-label>
          <mat-select [(ngModel)]="selectedSource" (ngModelChange)="applyFilters()">
            <mat-option value="">All</mat-option>
            @for (s of store.sources(); track s) {
              <mat-option [value]="s">{{ s }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Sort by</mat-label>
          <mat-select [(ngModel)]="selectedSort" (ngModelChange)="applyFilters()">
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
    </div>
  `,
  styles: [`
    .jobs-list { max-width: 1200px; }
    .list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    h1 { font-size: 24px; font-weight: 600; margin: 0; }
    .count { font-size: 16px; color: #888; font-weight: 400; }
    .filters { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
    .search-field { flex: 1; min-width: 200px; }
    .jobs-table { width: 100%; }
    .job-row:hover { background: #f5f5f5; cursor: pointer; }
    .company-link { color: #3f51b5; text-decoration: none; font-weight: 500; }
    .status-badge { padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .priority-star { color: #ffc107; font-size: 12px; }
  `],
})
export class JobsListComponent implements OnInit {
  readonly store = inject(JobsStore);

  readonly statuses = JOB_STATUSES;
  readonly displayedColumns = ['priority', 'company', 'role', 'status', 'salary', 'source', 'createdAt'];

  searchCtrl = new FormControl('');
  selectedStatus = '';
  selectedSource = '';
  selectedSort = 'created_at';

  ngOnInit() {
    this.store.loadJobs({});

    this.searchCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
    ).subscribe(() => this.applyFilters());
  }

  applyFilters() {
    this.store.loadJobs({
      search: this.searchCtrl.value ?? '',
      status: this.selectedStatus,
      source: this.selectedSource,
      sortBy: this.selectedSort,
    });
  }

  statusClass(status: string): string {
    return `status-badge status-${status.toLowerCase().replace(' ', '-')}`;
  }
}
