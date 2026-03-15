import { Component, OnInit, inject, signal, input, DestroyRef, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { CvService } from '@core/services/cv.service';
import { ToastService } from '@core/services/toast.service';
import { AdaptedCv } from '@core/models/job.model';
import { UserCv } from '@core/models/user-cv.model';
import { CvPreviewDialogComponent } from '@shared/cv-preview-dialog/cv-preview-dialog.component';
import { buildCvHtml } from '@shared/cv-html.utils';

@Component({
  selector: 'app-job-review',
  standalone: true,
  imports: [
    RouterLink, DatePipe, FormsModule,
    MatButtonModule, MatIconModule, MatSelectModule, MatInputModule,
    MatCardModule, MatChipsModule, MatProgressSpinnerModule, MatTooltipModule,
  ],
  template: `
    <div class="flex flex-col gap-4 py-5">

      <!-- CV Selection -->
      <div class="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4">
        @if (userCvs().length === 0) {
          <div class="flex items-center gap-2 text-sm text-slate-500">
            <mat-icon class="!text-lg !w-[18px] !h-[18px]">info_outline</mat-icon>
            <span>No CVs uploaded yet. Go to <a routerLink="/settings" class="text-violet-600">Settings</a> to add one.</span>
          </div>
        } @else {
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Select CV to compare</mat-label>
            <mat-select [ngModel]="selectedCvId()" (ngModelChange)="selectedCvId.set($event)">
              @for (cv of userCvs(); track cv.id) {
                <mat-option [value]="cv.id">{{ cv.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          @if (selectedCvId()) {
            <p class="flex items-center gap-1.5 text-xs text-violet-600 mt-1">
              <mat-icon class="!text-base">check_circle</mat-icon>
              AI will compare your CV against the job description and score the match.
            </p>
          }
        }
      </div>

      <!-- Job description -->
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Paste Job Description</mat-label>
        <textarea matInput rows="8" [(ngModel)]="jobDescription"
                  placeholder="Paste the full job description here…"></textarea>
      </mat-form-field>

      <!-- Analyze button -->
      <div class="flex items-center gap-3">
        <button mat-flat-button color="primary" (click)="reviewJob()"
                [disabled]="!jobDescription || cvLoading() || !selectedCvId()">
          @if (cvLoading()) {
            <span class="flex items-center gap-1.5"><mat-spinner diameter="18"></mat-spinner>Analyzing…</span>
          } @else {
            <span class="flex items-center gap-1.5"><mat-icon>manage_search</mat-icon>Analyze Match</span>
          }
        </button>
        @if (!selectedCvId() && userCvs().length > 0) {
          <span class="text-xs text-amber-600">Select a CV above to enable analysis.</span>
        }
      </div>

      <!-- Review result -->
      @if (latestCv(); as cv) {
        <mat-card class="!mt-2">
          <mat-card-header>
            <mat-card-title class="flex items-center gap-2">
              <span class="text-lg font-bold"
                    [class.text-emerald-600]="cv.relevanceScore >= 70"
                    [class.text-amber-600]="cv.relevanceScore >= 50 && cv.relevanceScore < 70"
                    [class.text-red-600]="cv.relevanceScore < 50">
                {{ cv.relevanceScore }}/100
              </span>
              Relevance Score
            </mat-card-title>
            @if (cv.createdAt) {
              <mat-card-subtitle>Reviewed {{ cv.createdAt | date:'medium' }}</mat-card-subtitle>
            }
          </mat-card-header>
          <mat-card-content>

            <div class="cv-section">
              <h4>Adapted Profile</h4>
              <p>{{ cv.adaptedProfile }}</p>
            </div>

            <div class="cv-section">
              <h4>Keywords Found</h4>
              <div class="flex flex-wrap gap-2">
                @for (kw of cv.keywordsFound; track kw) {
                  <mat-chip class="!bg-emerald-50 !text-emerald-700">{{ kw }}</mat-chip>
                }
              </div>
            </div>

            <div class="cv-section">
              <h4>Missing Skills</h4>
              <div class="flex flex-wrap gap-2">
                @for (skill of cv.missingSkills; track skill) {
                  <mat-chip class="!bg-rose-50 !text-rose-700">{{ skill }}</mat-chip>
                }
                @if (!cv.missingSkills.length) {
                  <span class="text-sm text-slate-400 italic">None — great match!</span>
                }
              </div>
            </div>

            @if (cv.topExperience.length) {
              <div class="cv-section">
                <h4>Tailored Experience</h4>
                @for (exp of cv.topExperience; track exp.company) {
                  <div class="mb-3">
                    <div class="text-sm mb-1">
                      <strong>{{ exp.role }}</strong> — {{ exp.company }}
                      <span class="text-xs text-slate-400 ml-2">{{ exp.period }}</span>
                    </div>
                    <ul class="m-0 pl-5 space-y-0.5">
                      @for (b of exp.bullets; track b) {
                        <li class="text-[13px] leading-relaxed">{{ b }}</li>
                      }
                    </ul>
                  </div>
                }
              </div>
            }

            <div class="cv-section">
              <div class="flex items-center gap-1">
                <h4 class="!m-0">Cover Letter</h4>
                <button mat-icon-button (click)="copy(cv.coverLetter)" matTooltip="Copy to clipboard">
                  <mat-icon>content_copy</mat-icon>
                </button>
              </div>
              <p class="whitespace-pre-wrap text-sm leading-relaxed mt-1">{{ cv.coverLetter }}</p>
            </div>

            <div class="cv-section !mb-0">
              <h4>Advice</h4>
              <p>{{ cv.advice }}</p>
            </div>

          </mat-card-content>
        </mat-card>

        <!-- CV Adapter -->
        <mat-card class="!border !border-violet-200 !bg-violet-50">
          <mat-card-header>
            <mat-card-title class="flex items-center gap-2">
              <mat-icon class="text-violet-600">description</mat-icon>
              CV Adapter
            </mat-card-title>
            <mat-card-subtitle>
              Generates a tailored version of your CV — only profile, skills and employment bullets are changed.
              Personal info, education and languages stay untouched.
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="flex flex-wrap gap-2 mt-2">
              <button mat-raised-button color="primary" (click)="adaptCv()" [disabled]="adaptLoading()">
                @if (adaptLoading()) {
                  <span class="flex items-center gap-1.5"><mat-spinner diameter="18"></mat-spinner>Adapting…</span>
                } @else {
                  <span class="flex items-center gap-1.5"><mat-icon>auto_fix_high</mat-icon>Adapt CV to this Job</span>
                }
              </button>
              @if (adaptedCvText()) {
                <button mat-stroked-button (click)="previewAdaptedCv()">
                  <span class="flex items-center gap-1.5"><mat-icon>visibility</mat-icon>Preview</span>
                </button>
                <button mat-stroked-button (click)="saveAdaptedCvAsPdf()">
                  <span class="flex items-center gap-1.5"><mat-icon>picture_as_pdf</mat-icon>Save as PDF</span>
                </button>
              }
            </div>
            @if (adaptedCvText()) {
              <p class="flex items-center gap-1.5 text-xs text-emerald-600 mt-3">
                <mat-icon class="!text-base">check_circle</mat-icon>
                CV adapted — use Preview to review, then Save as PDF.
              </p>
            }
          </mat-card-content>
        </mat-card>
      }

    </div>
  `,
  styles: [`
    .cv-section { margin-bottom: 20px; }
    .cv-section h4 {
      margin: 0 0 8px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
    }
    .cv-section p { margin: 0; font-size: 14px; line-height: 1.6; }
  `],
})
export class JobReviewComponent implements OnInit {
  readonly jobId = input.required<number>();
  readonly userCvs = input.required<UserCv[]>();

  private readonly cvService = inject(CvService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly latestCv = signal<AdaptedCv | null>(null);
  readonly adaptedCvText = signal<string | null>(null);
  readonly cvLoading = signal(false);
  readonly adaptLoading = signal(false);
  readonly selectedCvId = signal<number | null>(null);
  jobDescription = '';

  constructor() {
    // Auto-select first CV when list loads
    effect(() => {
      const cvs = this.userCvs();
      if (cvs.length > 0 && !this.selectedCvId()) {
        this.selectedCvId.set(cvs[0].id);
      }
    });
  }

  ngOnInit() {
    this.cvService.getReview(this.jobId()).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ cv }) => {
      if (cv) {
        this.latestCv.set(cv);
        if (cv.jobDescription && !this.jobDescription) {
          this.jobDescription = cv.jobDescription;
        }
      }
    });
  }

  reviewJob() {
    const cvId = this.selectedCvId();
    if (!cvId) return;
    this.cvLoading.set(true);
    this.adaptedCvText.set(null);
    this.cvService.review(this.jobId(), this.jobDescription, cvId).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (res) => {
        this.latestCv.set(res.cv);
        this.cvLoading.set(false);
        this.toast.success('Analysis complete');
      },
      error: () => this.cvLoading.set(false),
    });
  }

  adaptCv() {
    const cvId = this.latestCv()?.id;
    if (!cvId) return;
    this.adaptLoading.set(true);
    this.adaptedCvText.set(null);
    this.cvService.adapt(cvId).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (res) => {
        this.adaptedCvText.set(res.adaptedCvText);
        this.adaptLoading.set(false);
        this.toast.success('CV adapted successfully');
      },
      error: () => this.adaptLoading.set(false),
    });
  }

  previewAdaptedCv() {
    const text = this.adaptedCvText();
    if (!text) return;
    const cv = this.latestCv();
    const title = `Adapted CV — ${cv?.company || cv?.role || 'Preview'}`;
    this.dialog.open(CvPreviewDialogComponent, {
      data: { html: buildCvHtml(text, title), title },
      width: '960px',
      maxWidth: '95vw',
      height: '90vh',
      panelClass: 'cv-preview-dialog-panel',
    });
  }

  saveAdaptedCvAsPdf() {
    const text = this.adaptedCvText();
    if (!text) return;
    const cv = this.latestCv();
    const title = `Adapted CV — ${cv?.company || cv?.role || 'Preview'}`;
    const html = buildCvHtml(text, title);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) return;
    win.addEventListener('load', () => { URL.revokeObjectURL(url); setTimeout(() => win.print(), 200); });
  }

  copy(text: string) {
    navigator.clipboard.writeText(text);
    this.toast.success('Copied to clipboard');
  }
}
