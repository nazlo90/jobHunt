import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { JobsService } from '@core/services/jobs.service';
import { JobsStore } from '@core/store/jobs.store';
import { ToastService } from '@core/services/toast.service';
import { JOB_STATUSES, JobStatus } from '@core/models/job.model';

@Component({
  selector: 'app-add-job',
  imports: [
    RouterLink, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatInputModule, MatProgressSpinnerModule, MatTooltipModule,
  ],
  template: `
    <div>

      <!-- Header -->
      <div class="flex items-center gap-2 mb-6">
        <button mat-icon-button routerLink="/jobs" class="text-slate-500">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1 class="m-0 text-2xl font-bold text-slate-900">Add Job</h1>
      </div>

      <mat-card>
        <mat-card-content class="!pt-4">

          <!-- URL autocomplete -->
          <div class="flex items-start gap-3 mb-1">
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Job URL — paste to autocomplete fields</mat-label>
              <input matInput [ngModel]="autocompleteUrl()" (ngModelChange)="autocompleteUrl.set($event)" type="url"
                     placeholder="https://…" (keydown.enter)="autocomplete()">
              <mat-icon matPrefix>link</mat-icon>
              @if (autocompleteUrl() && !isValidUrl()) {
                <mat-error>Enter a valid URL starting with http:// or https://</mat-error>
              }
            </mat-form-field>
            <button mat-flat-button color="accent" (click)="autocomplete()"
                    [disabled]="!autocompleteUrl() || !isValidUrl() || autocompleting()"
                    matTooltip="Fetch job details from URL using AI"
                    class="mt-1 h-[52px]">
              <span class="flex items-center gap-1.5">
                @if (autocompleting()) {
                  <mat-spinner diameter="18"></mat-spinner>
                } @else {
                  <mat-icon>auto_awesome</mat-icon>
                }
                Autocomplete
              </span>
            </button>
          </div>

          <!-- Form fields grid -->
          <div class="grid grid-cols-2 gap-x-4">

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

            <mat-form-field appearance="outline" class="col-span-2">
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

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Notes</mat-label>
            <textarea matInput rows="4" [(ngModel)]="form.notes"></textarea>
          </mat-form-field>

        </mat-card-content>

        <mat-card-actions class="!px-4 !pb-4 flex gap-2">
          <button mat-flat-button color="primary" (click)="save()"
                  [disabled]="!form.company || !form.role || saving()">
            <span class="flex items-center gap-1.5">
              @if (saving()) { <mat-spinner diameter="18"></mat-spinner>Saving… } @else { <mat-icon>save</mat-icon>Save Job }
            </span>
          </button>
          <button mat-button routerLink="/jobs">Cancel</button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
})
export class AddJobComponent {
  private readonly jobsSvc = inject(JobsService);
  private readonly store = inject(JobsStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly statuses = JOB_STATUSES;

  autocompleteUrl = signal('');
  autocompleting = signal(false);

  isValidUrl = computed(() => {
    try {
      const u = new URL(this.autocompleteUrl());
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch { return false; }
  });

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

  saving = signal(false);

  autocomplete() {
    if (!this.isValidUrl()) return;
    this.autocompleting.set(true);
    this.jobsSvc.autocompleteFromUrl(this.autocompleteUrl()).subscribe({
      next: (data: any) => {
        this.form.url = this.autocompleteUrl();
        this.form.company = data.company || this.form.company;
        this.form.role = data.role || this.form.role;
        this.form.salary = data.salary ?? this.form.salary;
        this.form.location = data.location ?? this.form.location;
        this.form.techStack = data.techStack ?? this.form.techStack;
        this.form.source = data.source || this.form.source;
        this.form.notes = data.notes ?? this.form.notes;
        this.autocompleting.set(false);
        this.toast.success('Fields filled from URL');
      },
      error: () => { this.autocompleting.set(false); },
    });
  }

  save() {
    this.saving.set(true);
    this.store.addJob(this.form).subscribe({
      next: (job) => {
        this.toast.success('Job saved');
        this.router.navigate(['/jobs', job.id]);
      },
      error: () => { this.saving.set(false); },
    });
  }
}
