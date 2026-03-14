import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { JobsService } from '../../../core/services/jobs.service';
import { JOB_STATUSES, JobStatus } from '../../../core/models/job.model';

@Component({
  selector: 'app-add-job',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatInputModule,
  ],
  template: `
    <div class="add-job">
      <div class="header">
        <button mat-icon-button routerLink="/jobs">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Add Job</h1>
      </div>

      <mat-card>
        <mat-card-content>
          <div class="fields-grid">
            <mat-form-field appearance="outline">
              <mat-label>Company *</mat-label>
              <input matInput [(ngModel)]="form.company" required>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Role *</mat-label>
              <input matInput [(ngModel)]="form.role" required>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Status</mat-label>
              <mat-select [(ngModel)]="form.status">
                @for (s of statuses; track s) {
                  <mat-option [value]="s">{{ s }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Priority</mat-label>
              <mat-select [(ngModel)]="form.priority">
                @for (p of [1,2,3,4,5]; track p) {
                  <mat-option [value]="p">{{ '★'.repeat(p) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>URL</mat-label>
              <input matInput [(ngModel)]="form.url" type="url">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Salary</mat-label>
              <input matInput [(ngModel)]="form.salary">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Location</mat-label>
              <input matInput [(ngModel)]="form.location">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Source</mat-label>
              <input matInput [(ngModel)]="form.source">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Tech Stack</mat-label>
              <input matInput [(ngModel)]="form.techStack">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Contact</mat-label>
              <input matInput [(ngModel)]="form.contact">
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Notes</mat-label>
            <textarea matInput rows="4" [(ngModel)]="form.notes"></textarea>
          </mat-form-field>

          @if (error) {
            <p class="error">{{ error }}</p>
          }
        </mat-card-content>

        <mat-card-actions>
          <button mat-raised-button color="primary" (click)="save()"
                  [disabled]="!form.company || !form.role || saving">
            @if (saving) { Saving… } @else { Save Job }
          </button>
          <button mat-button routerLink="/jobs">Cancel</button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .header { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; }
    h1 { margin: 0; font-size: 22px; font-weight: 700; color: #1a1a2e; }
    .fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
    .full-width { width: 100%; }
    .error { color: #c62828; font-size: 14px; margin-top: 8px; }
    mat-card-actions { padding: 8px 16px 16px; display: flex; gap: 8px; }
  `],
})
export class AddJobComponent {
  private readonly jobsSvc = inject(JobsService);
  private readonly router = inject(Router);

  readonly statuses = JOB_STATUSES;

  form = {
    company: '',
    role: '',
    status: 'Bookmarked' as JobStatus,
    priority: 3,
    url: '',
    salary: '',
    location: '',
    source: 'manual',
    techStack: '',
    contact: '',
    notes: '',
  };

  saving = false;
  error = '';

  save() {
    this.saving = true;
    this.error = '';
    this.jobsSvc.createJob(this.form).subscribe({
      next: ({ job }) => this.router.navigate(['/jobs', job.id]),
      error: (err) => {
        this.error = err.message ?? 'Failed to save job';
        this.saving = false;
      },
    });
  }
}
