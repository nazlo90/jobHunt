import { Component, OnInit, inject, signal, linkedSignal } from '@angular/core';
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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
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
    MatInputModule, MatTabsModule, MatChipsModule, MatProgressSpinnerModule, MatTooltipModule,
    MatDatepickerModule, MatNativeDateModule,
  ],
  template: `
    <div class="job-detail">
      @if (job(); as j) {
        <div class="detail-header">
          <button mat-icon-button routerLink="/jobs" class="back-btn">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="header-titles">
            <h1>{{ j.company }}</h1>
            <p class="role">{{ j.role }}</p>
          </div>
          @if (j.url) {
            <a mat-stroked-button [href]="j.url" target="_blank" class="open-btn">
              <mat-icon>open_in_new</mat-icon> Open Job
            </a>
          }
        </div>

        <mat-tab-group>
          <mat-tab label="Details">
            <div class="tab-content">
              <div class="fields-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Status</mat-label>
                  <mat-select [(ngModel)]="editStatus" (ngModelChange)="updateField('status', $event)">
                    @for (s of statuses; track s) {
                      <mat-option [value]="s">{{ s }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Priority</mat-label>
                  <mat-select [(ngModel)]="editPriority" (ngModelChange)="updateField('priority', $event)">
                    @for (p of [1,2,3,4,5]; track p) {
                      <mat-option [value]="p">{{ '★'.repeat(p) }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Applied Date</mat-label>
                  <input matInput [matDatepicker]="picker" [(ngModel)]="editAppliedDateObj"
                         (dateChange)="onAppliedDateChange($event.value)">
                  <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
                  <mat-datepicker #picker></mat-datepicker>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Contact</mat-label>
                  <input matInput [(ngModel)]="editContact"
                         (blur)="updateField('contact', editContact)">
                </mat-form-field>
              </div>

              <div class="info-grid">
                <div class="info-item"><span class="info-label">Salary</span><span>{{ j.salary || '—' }}</span></div>
                <div class="info-item"><span class="info-label">Location</span><span>{{ j.location || '—' }}</span></div>
                <div class="info-item"><span class="info-label">Tech Stack</span><span>{{ j.techStack || '—' }}</span></div>
                <div class="info-item"><span class="info-label">Source</span><mat-chip>{{ j.source }}</mat-chip></div>
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Notes</mat-label>
                <textarea matInput rows="4" [(ngModel)]="editNotes"
                          (blur)="updateField('notes', editNotes)"></textarea>
              </mat-form-field>
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
                  <span class="btn-content"><mat-spinner diameter="18"></mat-spinner>Generating…</span>
                } @else {
                  <span class="btn-content"><mat-icon>auto_awesome</mat-icon>Generate Adapted CV</span>
                }
              </button>

              @if (latestCv(); as cv) {
                <mat-card class="cv-result">
                  <mat-card-header>
                    <mat-card-title>
                      <span class="score-badge" [class.score-high]="cv.relevanceScore >= 70"
                            [class.score-mid]="cv.relevanceScore >= 50 && cv.relevanceScore < 70"
                            [class.score-low]="cv.relevanceScore < 50">
                        {{ cv.relevanceScore }}/100
                      </span>
                      Relevance Score
                    </mat-card-title>
                  </mat-card-header>
                  <mat-card-content>

                    <div class="cv-section">
                      <h4>Adapted Profile</h4>
                      <p>{{ cv.adaptedProfile }}</p>
                    </div>

                    <div class="cv-section">
                      <h4>Keywords Found</h4>
                      <div class="chips-row">
                        @for (kw of cv.keywordsFound; track kw) {
                          <mat-chip class="chip-match">{{ kw }}</mat-chip>
                        }
                      </div>
                    </div>

                    <div class="cv-section">
                      <h4>Missing Skills</h4>
                      <div class="chips-row">
                        @for (skill of cv.missingSkills; track skill) {
                          <mat-chip class="chip-missing">{{ skill }}</mat-chip>
                        }
                        @if (!cv.missingSkills.length) {
                          <span class="none-label">None — great match!</span>
                        }
                      </div>
                    </div>

                    @if (cv.topExperience.length) {
                      <div class="cv-section">
                        <h4>Tailored Experience</h4>
                        @for (exp of cv.topExperience; track exp.company) {
                          <div class="exp-block">
                            <div class="exp-header">
                              <strong>{{ exp.role }}</strong> — {{ exp.company }}
                              <span class="exp-period">{{ exp.period }}</span>
                            </div>
                            <ul>
                              @for (b of exp.bullets; track b) {
                                <li>{{ b }}</li>
                              }
                            </ul>
                          </div>
                        }
                      </div>
                    }

                    <div class="cv-section">
                      <div class="section-header">
                        <h4>Cover Letter</h4>
                        <button mat-icon-button (click)="copy(cv.coverLetter)" matTooltip="Copy to clipboard">
                          <mat-icon>content_copy</mat-icon>
                        </button>
                      </div>
                      <p class="preformatted">{{ cv.coverLetter }}</p>
                    </div>

                    @if (cv.adaptedCvText) {
                      <div class="cv-section">
                        <div class="section-header">
                          <h4>Full Adapted CV</h4>
                          <button mat-icon-button (click)="copy(cv.adaptedCvText!)" matTooltip="Copy to clipboard">
                            <mat-icon>content_copy</mat-icon>
                          </button>
                        </div>
                        <pre class="cv-text">{{ cv.adaptedCvText }}</pre>
                      </div>
                    }

                    <div class="cv-section">
                      <h4>Advice</h4>
                      <p>{{ cv.advice }}</p>
                    </div>

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
    :host { display: block; width: 100%; }
    .job-detail { width: 100%; }
    .detail-header {
      display: flex; align-items: center; gap: 12px; margin-bottom: 24px;
      background: #fff; border-radius: 12px; padding: 16px 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }
    .header-titles { flex: 1; }
    .back-btn { color: #555; flex-shrink: 0; }
    .open-btn { flex-shrink: 0; }
    h1 { margin: 0; font-size: 20px; font-weight: 700; color: #1a1a2e; }
    .role { margin: 2px 0 0; color: #666; font-size: 14px; }
    .tab-content { padding: 20px 0; display: flex; flex-direction: column; gap: 4px; }
    .fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
    .info-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
      background: #fff; border: 1px solid #e0e0e0; border-radius: 8px;
      padding: 16px; margin-bottom: 4px;
    }
    .info-item { display: flex; flex-direction: column; gap: 4px; }
    .info-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; color: #999; }
    .full-width { width: 100%; }
    .btn-content { display: inline-flex; align-items: center; gap: 6px; }
    .cv-result { margin-top: 16px; }
    .cv-section { margin-bottom: 20px; }
    .cv-section h4 { margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #666; }
    .section-header { display: flex; align-items: center; gap: 4px; }
    .section-header h4 { margin: 0; }
    .chips-row { display: flex; gap: 8px; flex-wrap: wrap; }
    .chip-match { background: #e8f5e9 !important; color: #2e7d32 !important; }
    .chip-missing { background: #fce4ec !important; color: #c62828 !important; }
    .none-label { font-size: 13px; color: #888; font-style: italic; }
    .score-badge { font-size: 18px; font-weight: 700; margin-right: 6px; }
    .score-high { color: #2e7d32; }
    .score-mid { color: #e65100; }
    .score-low { color: #c62828; }
    .exp-block { margin-bottom: 12px; }
    .exp-header { font-size: 14px; margin-bottom: 4px; }
    .exp-period { font-size: 12px; color: #888; margin-left: 8px; }
    .exp-block ul { margin: 4px 0 0 18px; padding: 0; }
    .exp-block li { font-size: 13px; line-height: 1.5; margin-bottom: 2px; }
    .preformatted { white-space: pre-wrap; font-size: 14px; line-height: 1.6; }
    .cv-text { white-space: pre-wrap; font-size: 12px; line-height: 1.6; font-family: monospace; background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; }
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
  editAppliedDateObj: Date | null = null;
  editContact = '';
  editNotes = '';
  jobDescription = '';

  ngOnInit() {
    this.jobsSvc.getJob(Number(this.id)).subscribe((res) => {
      this.job.set(res.job);
      this.editAppliedDate = res.job.appliedDate ?? '';
      this.editAppliedDateObj = res.job.appliedDate ? new Date(res.job.appliedDate) : null;
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

  onAppliedDateChange(date: Date | null) {
    if (!date) return;
    const str = date.toISOString().split('T')[0];
    this.editAppliedDate = str;
    this.updateField('appliedDate', str);
  }

  copy(text: string) {
    navigator.clipboard.writeText(text);
  }
}
