import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { JobsService } from '../../../core/services/jobs.service';
import { JOB_STATUSES, JobStatus } from '../../../core/models/job.model';

@Component({
  selector: 'app-add-job',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatInputModule,
    MatProgressSpinnerModule, MatTooltipModule,
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
          <div class="autocomplete-row">
            <mat-form-field appearance="outline" class="url-field">
              <mat-label>Job URL — paste to autocomplete fields</mat-label>
              <input matInput [(ngModel)]="autocompleteUrl" type="url"
                     placeholder="https://..." (keydown.enter)="autocomplete()">
              <mat-icon matPrefix>link</mat-icon>
              @if (autocompleteUrl && !isValidUrl) {
                <mat-error>Enter a valid URL starting with http:// or https://</mat-error>
              }
            </mat-form-field>
            <button mat-flat-button color="accent" (click)="autocomplete()"
                    [disabled]="!autocompleteUrl || !isValidUrl || autocompleting"
                    matTooltip="Fetch job details from URL using AI">
              @if (autocompleting) {
                <mat-spinner diameter="18" style="display:inline-block;margin-right:6px"></mat-spinner>
              } @else {
                <mat-icon>auto_awesome</mat-icon>
              }
              Autocomplete
            </button>
          </div>

          @if (autocompleteError) {
            <p class="error"><mat-icon style="vertical-align:middle;font-size:16px">error_outline</mat-icon> {{ autocompleteError }}</p>
          }

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
    .autocomplete-row {
      display: flex; align-items: flex-start; gap: 12px; margin-bottom: 4px;
    }
    .url-field { flex: 1; }
    .autocomplete-row button {
      margin-top: 4px; height: 52px; white-space: nowrap;
      display: flex; align-items: center; gap: 4px;
    }
    .fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
    .full-width { width: 100%; }
    .error { color: #c62828; font-size: 14px; margin-top: 8px; }
    mat-card-actions { padding: 8px 16px 16px; display: flex; gap: 8px; }
  `],
})
export class AddJobComponent {
  private readonly jobsSvc = inject(JobsService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly statuses = JOB_STATUSES;

  autocompleteUrl = '';
  autocompleting = false;
  autocompleteError = '';

  get isValidUrl(): boolean {
    try {
      const u = new URL(this.autocompleteUrl);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  form = {
    company: '',
    role: '',
    status: 'Saved' as JobStatus,
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

  autocomplete() {
    if (!this.isValidUrl) return;
    this.autocompleting = true;
    this.autocompleteError = '';
    this.jobsSvc.autocompleteFromUrl(this.autocompleteUrl).subscribe({
      next: (data: any) => {
        this.form.url = this.autocompleteUrl;
        this.form.company = data.company || this.form.company;
        this.form.role = data.role || this.form.role;
        this.form.salary = data.salary ?? this.form.salary;
        this.form.location = data.location ?? this.form.location;
        this.form.techStack = data.techStack ?? this.form.techStack;
        this.form.source = data.source || this.form.source;
        this.form.notes = data.notes ?? this.form.notes;
        this.autocompleting = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        const raw = err.error?.message;
        this.autocompleteError = Array.isArray(raw)
          ? raw.join(', ')
          : (raw ?? err.message ?? 'Autocomplete failed. Check the URL and try again.');
        this.autocompleting = false;
        this.cdr.markForCheck();
      },
    });
  }

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
