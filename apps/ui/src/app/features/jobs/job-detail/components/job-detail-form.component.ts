import { Component, input, output, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Job, JOB_STATUSES, JobStatus } from '../../../../core/models/job.model';

interface FormFields {
  company: string;
  role: string;
  url: string;
  status: JobStatus;
  priority: number;
  salary: string;
  location: string;
  techStack: string;
  appliedDate: string;
  appliedDateObj: Date | null;
  contact: string;
  notes: string;
}

@Component({
  selector: 'app-job-detail-form',
  standalone: true,
  imports: [
    FormsModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatDatepickerModule, MatNativeDateModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="flex flex-col gap-1 py-5">

      <div class="grid grid-cols-2 gap-x-4">

        <mat-form-field appearance="outline">
          <mat-label>Company</mat-label>
          <input matInput [(ngModel)]="fields.company" (ngModelChange)="markDirty()">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Role</mat-label>
          <input matInput [(ngModel)]="fields.role" (ngModelChange)="markDirty()">
        </mat-form-field>

        <mat-form-field appearance="outline" class="col-span-2">
          <mat-label>URL</mat-label>
          <input matInput [(ngModel)]="fields.url" type="url" (ngModelChange)="markDirty()">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select [(ngModel)]="fields.status" (ngModelChange)="markDirty()">
            @for (s of statuses; track s) {
              <mat-option [value]="s">{{ s }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Priority</mat-label>
          <mat-select [(ngModel)]="fields.priority" (ngModelChange)="markDirty()">
            @for (p of [1,2,3,4,5]; track p) {
              <mat-option [value]="p">{{ '★'.repeat(p) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Salary</mat-label>
          <input matInput [(ngModel)]="fields.salary" (ngModelChange)="markDirty()">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Location</mat-label>
          <input matInput [(ngModel)]="fields.location" (ngModelChange)="markDirty()">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Tech Stack</mat-label>
          <input matInput [(ngModel)]="fields.techStack" (ngModelChange)="markDirty()">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Applied Date</mat-label>
          <input matInput [matDatepicker]="picker" [(ngModel)]="fields.appliedDateObj"
                 (dateChange)="onAppliedDateChange($event.value)">
          <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Contact</mat-label>
          <input matInput [(ngModel)]="fields.contact" (ngModelChange)="markDirty()">
        </mat-form-field>

      </div>

      <!-- Source chip (read-only) -->
      <div class="flex items-center gap-2 py-1">
        <span class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Source</span>
        <mat-chip>{{ job().source }}</mat-chip>
      </div>

      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Notes</mat-label>
        <textarea matInput rows="4" [(ngModel)]="fields.notes" (ngModelChange)="markDirty()"></textarea>
      </mat-form-field>

      <!-- Save button -->
      <div class="flex items-center gap-3 pt-2">
        <button mat-flat-button color="primary" (click)="saveChanges()"
                [disabled]="!isDirty()">
          <span class="flex items-center gap-1.5">
            <mat-icon>save</mat-icon> Save Details
          </span>
        </button>
        @if (isDirty()) {
          <span class="text-xs text-amber-600 font-medium">Unsaved changes</span>
        }
      </div>

    </div>
  `,
})
export class JobDetailFormComponent {
  readonly job = input.required<Job>();
  readonly saved = output<Partial<Job>>();

  readonly statuses = JOB_STATUSES;
  readonly isDirty = signal(false);

  fields: FormFields = {
    company: '', role: '', url: '',
    status: 'New' as JobStatus, priority: 3,
    salary: '', location: '', techStack: '',
    appliedDate: '', appliedDateObj: null,
    contact: '', notes: '',
  };

  constructor() {
    effect(() => {
      const j = this.job();
      this.fields = {
        company: j.company ?? '',
        role: j.role ?? '',
        url: j.url ?? '',
        status: j.status,
        priority: j.priority,
        salary: j.salary ?? '',
        location: j.location ?? '',
        techStack: j.techStack ?? '',
        appliedDate: j.appliedDate ?? '',
        appliedDateObj: j.appliedDate ? new Date(j.appliedDate) : null,
        contact: j.contact ?? '',
        notes: j.notes ?? '',
      };
      this.isDirty.set(false);
    });
  }

  markDirty() {
    this.isDirty.set(true);
  }

  onAppliedDateChange(date: Date | null) {
    if (!date) return;
    this.fields.appliedDate = date.toISOString().split('T')[0];
    this.fields.appliedDateObj = date;
    this.markDirty();
  }

  saveChanges() {
    this.saved.emit({
      company: this.fields.company,
      role: this.fields.role,
      url: this.fields.url,
      status: this.fields.status,
      priority: this.fields.priority,
      salary: this.fields.salary,
      location: this.fields.location,
      techStack: this.fields.techStack,
      appliedDate: this.fields.appliedDate || undefined,
      contact: this.fields.contact,
      notes: this.fields.notes,
    });
    this.isDirty.set(false);
  }
}
