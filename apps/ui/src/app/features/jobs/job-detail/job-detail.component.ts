import { Component, OnInit, inject, signal, linkedSignal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { JobsStore } from '../../../core/store/jobs.store';
import { JobsService } from '../../../core/services/jobs.service';
import { CvService } from '../../../core/services/cv.service';
import { Job, AdaptedCv, JOB_STATUSES } from '../../../core/models/job.model';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  // Angular 21: route param bound via input() via withComponentInputBinding()
  inputs: ['id'],
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatSelectModule,
    MatInputModule, MatTabsModule, MatChipsModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="job-detail">
      @if (job(); as j) {
        <div class="detail-header">
          <button mat-icon-button routerLink="/jobs">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div>
            <h1>{{ j.company }}</h1>
            <p class="role">{{ j.role }}</p>
          </div>
          @if (j.url) {
            <a mat-stroked-button [href]="j.url" target="_blank">
              <mat-icon>open_in_new</mat-icon> Open Job
            </a>
          }
        </div>

        <mat-tab-group>
          <mat-tab label="Details">
            <div class="tab-content">
              <div class="field-row">
                <label>Status</label>
                <mat-select [(ngModel)]="editStatus" (ngModelChange)="updateField('status', $event)">
                  @for (s of statuses; track s) {
                    <mat-option [value]="s">{{ s }}</mat-option>
                  }
                </mat-select>
              </div>
              <div class="field-row">
                <label>Priority</label>
                <mat-select [(ngModel)]="editPriority" (ngModelChange)="updateField('priority', $event)">
                  @for (p of [1,2,3,4,5]; track p) {
                    <mat-option [value]="p">{{ '★'.repeat(p) }}</mat-option>
                  }
                </mat-select>
              </div>
              <div class="field-row"><label>Salary</label><span>{{ j.salary || '—' }}</span></div>
              <div class="field-row"><label>Location</label><span>{{ j.location || '—' }}</span></div>
              <div class="field-row"><label>Tech Stack</label><span>{{ j.techStack || '—' }}</span></div>
              <div class="field-row"><label>Source</label><mat-chip>{{ j.source }}</mat-chip></div>
              <div class="field-row">
                <label>Applied Date</label>
                <input matInput type="date" [(ngModel)]="editAppliedDate"
                       (change)="updateField('appliedDate', editAppliedDate)">
              </div>
              <div class="field-row">
                <label>Contact</label>
                <input matInput [(ngModel)]="editContact"
                       (blur)="updateField('contact', editContact)">
              </div>
              <div class="notes-row">
                <label>Notes</label>
                <textarea matInput rows="4" [(ngModel)]="editNotes"
                          (blur)="updateField('notes', editNotes)"></textarea>
              </div>
            </div>
          </mat-tab>

          <mat-tab label="CV Adapter">
            <div class="tab-content">
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Paste Job Description</mat-label>
                <textarea matInput rows="8" [(ngModel)]="jobDescription"
                          placeholder="Paste the full job description here..."></textarea>
              </mat-form-field>
              <button mat-raised-button color="primary" (click)="generateCv()"
                      [disabled]="!jobDescription || cvLoading()">
                @if (cvLoading()) {
                  <mat-spinner diameter="18" style="display:inline-block;margin-right:8px"></mat-spinner>Generating…
                } @else {
                  <mat-icon>auto_awesome</mat-icon> Generate Adapted CV
                }
              </button>

              @if (latestCv(); as cv) {
                <mat-card class="cv-result">
                  <mat-card-header>
                    <mat-card-title>Relevance: {{ cv.relevanceScore }}/100</mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <h4>Profile</h4><p>{{ cv.adaptedProfile }}</p>
                    <h4>Missing Skills</h4>
                    <div class="chips-row">
                      @for (skill of cv.missingSkills; track skill) {
                        <mat-chip color="warn">{{ skill }}</mat-chip>
                      }
                    </div>
                    <h4>Cover Letter</h4>
                    <p class="cover-letter">{{ cv.coverLetter }}</p>
                    <h4>Advice</h4><p>{{ cv.advice }}</p>
                  </mat-card-content>
                </mat-card>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      } @else {
        <mat-spinner></mat-spinner>
      }
    </div>
  `,
  styles: [`
    .job-detail { max-width: 800px; }
    .detail-header { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
    h1 { margin: 0; font-size: 22px; font-weight: 600; }
    .role { margin: 4px 0 0; color: #555; }
    .tab-content { padding: 20px 0; display: flex; flex-direction: column; gap: 16px; }
    .field-row { display: flex; align-items: center; gap: 16px; }
    .field-row label { width: 120px; font-weight: 500; color: #555; flex-shrink: 0; }
    .notes-row { display: flex; flex-direction: column; gap: 8px; }
    .notes-row label { font-weight: 500; color: #555; }
    .cv-result { margin-top: 16px; }
    .chips-row { display: flex; gap: 8px; flex-wrap: wrap; }
    .cover-letter { white-space: pre-wrap; font-size: 14px; line-height: 1.6; }
  `],
})
export class JobDetailComponent implements OnInit {
  // Angular 21: route param auto-bound via withComponentInputBinding()
  id!: string;

  private readonly store = inject(JobsStore);
  private readonly jobsSvc = inject(JobsService);
  private readonly cvService = inject(CvService);

  readonly job = signal<Job | null>(null);
  readonly latestCv = signal<AdaptedCv | null>(null);
  readonly cvLoading = signal(false);
  readonly statuses = JOB_STATUSES;

  // linkedSignal: stays in sync with job(), overridable for local edits
  editStatus = linkedSignal(() => this.job()?.status ?? 'Bookmarked');
  editPriority = linkedSignal(() => this.job()?.priority ?? 3);

  editAppliedDate = '';
  editContact = '';
  editNotes = '';
  jobDescription = '';

  ngOnInit() {
    this.jobsSvc.getJob(Number(this.id)).subscribe((res) => {
      this.job.set(res.job);
      this.editAppliedDate = res.job.appliedDate ?? '';
      this.editContact = res.job.contact ?? '';
      this.editNotes = res.job.notes ?? '';
    });
  }

  updateField(field: string, value: unknown) {
    const id = this.job()?.id;
    if (!id) return;
    this.store.updateJob(id, { [field]: value } as Partial<Job>);
    // Optimistically update local signal too
    this.job.update((j) => j ? { ...j, [field]: value } : j);
  }

  generateCv() {
    const id = this.job()?.id ?? null;
    this.cvLoading.set(true);
    this.cvService.generate(id, this.jobDescription).subscribe({
      next: (res) => { this.latestCv.set(res.cv); this.cvLoading.set(false); },
      error: () => this.cvLoading.set(false),
    });
  }
}
