import { Component, OnInit, inject, signal, linkedSignal, input, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
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
import { UserCvService } from '../../../core/services/user-cv.service';
import { Job, AdaptedCv, JOB_STATUSES } from '../../../core/models/job.model';
import { UserCv } from '../../../core/models/user-cv.model';
import { CvPreviewDialogComponent } from '../../../shared/cv-preview-dialog/cv-preview-dialog.component';
import { buildCvHtml } from '../../../shared/cv-html.utils';

interface EditFields {
  company:        string;
  role:           string;
  url:            string;
  salary:         string;
  location:       string;
  techStack:      string;
  appliedDate:    string;
  appliedDateObj: Date | null;
  contact:        string;
  notes:          string;
}

@Component({
  selector: 'app-job-detail',
  standalone: true,
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
            <h1>{{ fields.company || j.company }}</h1>
            <p class="role">{{ fields.role || j.role }}</p>
          </div>
          @if (fields.url || j.url) {
            <a mat-stroked-button [href]="fields.url || j.url" target="_blank" class="open-btn">
              <mat-icon>open_in_new</mat-icon> Open Job
            </a>
          }
          <button mat-icon-button color="warn" (click)="deleteJob(j.id)" title="Delete job">
            <mat-icon>delete</mat-icon>
          </button>
        </div>

        <mat-tab-group>
          <mat-tab label="Details">
            <div class="tab-content">
              <div class="fields-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Company</mat-label>
                  <input matInput [(ngModel)]="fields.company"
                         (blur)="updateField('company', fields.company)">
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Role</mat-label>
                  <input matInput [(ngModel)]="fields.role"
                         (blur)="updateField('role', fields.role)">
                </mat-form-field>

                <mat-form-field appearance="outline" class="span-2">
                  <mat-label>URL</mat-label>
                  <input matInput [(ngModel)]="fields.url" type="url"
                         (blur)="updateField('url', fields.url)">
                </mat-form-field>

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
                  <mat-label>Salary</mat-label>
                  <input matInput [(ngModel)]="fields.salary"
                         (blur)="updateField('salary', fields.salary)">
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Location</mat-label>
                  <input matInput [(ngModel)]="fields.location"
                         (blur)="updateField('location', fields.location)">
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Tech Stack</mat-label>
                  <input matInput [(ngModel)]="fields.techStack"
                         (blur)="updateField('techStack', fields.techStack)">
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
                  <input matInput [(ngModel)]="fields.contact"
                         (blur)="updateField('contact', fields.contact)">
                </mat-form-field>
              </div>

              <div class="source-row">
                <span class="info-label">Source</span>
                <mat-chip>{{ j.source }}</mat-chip>
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Notes</mat-label>
                <textarea matInput rows="4" [(ngModel)]="fields.notes"
                          (blur)="updateField('notes', fields.notes)"></textarea>
              </mat-form-field>
            </div>
          </mat-tab>

          <mat-tab label="CV Adapter">
            <div class="tab-content">

              <!-- CV Selection -->
              <div class="cv-select-section">
                @if (userCvs().length === 0) {
                  <div class="no-cvs-notice">
                    <mat-icon>info_outline</mat-icon>
                    <span>No CVs uploaded yet. Go to <a routerLink="/settings">Settings</a> to add one.</span>
                  </div>
                } @else {
                  <mat-form-field appearance="outline" class="cv-select-field">
                    <mat-label>Select CV to adapt</mat-label>
                    <mat-select [(ngModel)]="selectedCvId">
                      @for (cv of userCvs(); track cv.id) {
                        <mat-option [value]="cv.id">{{ cv.name }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  @if (selectedCvId()) {
                    <p class="cv-selected-note">
                      <mat-icon class="note-icon">check_circle</mat-icon>
                      AI will adapt the selected CV to match this job without changing its structure.
                    </p>
                  }
                }
              </div>

              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Paste Job Description</mat-label>
                <textarea matInput rows="8" [(ngModel)]="jobDescription"
                          placeholder="Paste the full job description here..."></textarea>
              </mat-form-field>

              <button mat-raised-button color="primary" (click)="generateCv()"
                      [disabled]="!jobDescription || cvLoading() || !selectedCvId()">
                @if (cvLoading()) {
                  <span class="btn-content"><mat-spinner diameter="18"></mat-spinner>Generating…</span>
                } @else {
                  <span class="btn-content"><mat-icon>auto_awesome</mat-icon>Generate Adapted CV</span>
                }
              </button>

              @if (!selectedCvId() && userCvs().length > 0) {
                <p class="warn-note">Select a CV above to enable generation.</p>
              }

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
                    <mat-card-subtitle>
                      @if (cv.adaptedCvText) {
                        <div class="cv-actions">
                          <button mat-flat-button color="primary" (click)="previewCv(cv)">
                            <span class="btn-content"><mat-icon>visibility</mat-icon>Preview CV</span>
                          </button>
                        </div>
                      }
                    </mat-card-subtitle>
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
    .fields-grid .span-2 { grid-column: span 2; }
    .source-row { display: flex; align-items: center; gap: 8px; padding: 4px 0 8px; }
    .info-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; color: #999; }
    .full-width { width: 100%; }
    .btn-content { display: inline-flex; align-items: center; gap: 6px; }
    .cv-select-section { background: #f8f9ff; border: 1.5px dashed #c5cae9; border-radius: 10px; padding: 16px 20px; margin-bottom: 8px; }
    .cv-select-field { width: 100%; }
    .no-cvs-notice { display: flex; align-items: center; gap: 8px; color: #888; font-size: 13px; }
    .no-cvs-notice a { color: #3949ab; }
    .no-cvs-notice mat-icon { font-size: 18px; height: 18px; width: 18px; }
    .cv-selected-note { display: flex; align-items: center; gap: 6px; margin: 4px 0 0; font-size: 12px; color: #3949ab; }
    .note-icon { font-size: 16px; height: 16px; width: 16px; }
    .warn-note { font-size: 12px; color: #e65100; margin: 4px 0 0; }
    .cv-result { margin-top: 16px; }
    .cv-actions { margin-top: 8px; display: flex; gap: 8px; }
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
  `],
})
export class JobDetailComponent implements OnInit {
  // Route param auto-bound via withComponentInputBinding()
  readonly id = input.required<string>();

  private readonly store      = inject(JobsStore);
  private readonly jobsSvc    = inject(JobsService);
  private readonly cvService  = inject(CvService);
  private readonly userCvSvc  = inject(UserCvService);
  private readonly router     = inject(Router);
  private readonly dialog     = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly job       = signal<Job | null>(null);
  readonly latestCv  = signal<AdaptedCv | null>(null);
  readonly cvLoading = signal(false);
  readonly userCvs   = signal<UserCv[]>([]);
  readonly selectedCvId = signal<number | null>(null);
  readonly statuses  = JOB_STATUSES;

  // linkedSignal: stays in sync with job(), overridable for local edits
  editStatus   = linkedSignal(() => this.job()?.status   ?? 'Bookmarked');
  editPriority = linkedSignal(() => this.job()?.priority ?? 3);

  fields: EditFields = {
    company:        '',
    role:           '',
    url:            '',
    salary:         '',
    location:       '',
    techStack:      '',
    appliedDate:    '',
    appliedDateObj: null,
    contact:        '',
    notes:          '',
  };

  jobDescription = '';

  ngOnInit() {
    this.jobsSvc.getJob(Number(this.id())).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((res) => {
      this.job.set(res.job);
      this.fields = {
        company:        res.job.company     ?? '',
        role:           res.job.role        ?? '',
        url:            res.job.url         ?? '',
        salary:         res.job.salary      ?? '',
        location:       res.job.location    ?? '',
        techStack:      res.job.techStack   ?? '',
        appliedDate:    res.job.appliedDate ?? '',
        appliedDateObj: res.job.appliedDate ? new Date(res.job.appliedDate) : null,
        contact:        res.job.contact     ?? '',
        notes:          res.job.notes       ?? '',
      };
    });

    this.userCvSvc.list().pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ cvs }) => {
      this.userCvs.set(cvs);
      if (cvs.length > 0) this.selectedCvId.set(cvs[0].id);
    });
  }

  updateField(field: string, value: unknown) {
    const id = this.job()?.id;
    if (!id) return;
    this.store.updateJob(id, { [field]: value } as Partial<Job>);
    this.job.update((j) => j ? { ...j, [field]: value } : j);
  }

  generateCv() {
    const cvId = this.selectedCvId();
    if (!cvId) return;
    const jobId = this.job()?.id ?? null;
    this.cvLoading.set(true);
    this.cvService.generate(jobId, this.jobDescription, cvId).subscribe({
      next: (res) => {
        this.latestCv.set(res.cv);
        this.cvLoading.set(false);
      },
      error: () => this.cvLoading.set(false),
    });
  }

  previewCv(cv: AdaptedCv) {
    if (!cv.adaptedCvText) return;
    this.openPreviewDialog(cv.adaptedCvText, `Adapted CV — ${cv.company || cv.role || 'Preview'}`);
  }

  onAppliedDateChange(date: Date | null) {
    if (!date) return;
    const str = date.toISOString().split('T')[0];
    this.fields.appliedDate    = str;
    this.fields.appliedDateObj = date;
    this.updateField('appliedDate', str);
  }

  deleteJob(id: number) {
    if (confirm('Delete this job?')) {
      this.store.deleteJob(id);
      this.router.navigate(['/jobs']);
    }
  }

  copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  private openPreviewDialog(cvText: string, title: string) {
    this.dialog.open(CvPreviewDialogComponent, {
      data: { html: buildCvHtml(cvText, title), title },
      width: '960px',
      maxWidth: '95vw',
      height: '90vh',
      panelClass: 'cv-preview-dialog-panel',
    });
  }
}
