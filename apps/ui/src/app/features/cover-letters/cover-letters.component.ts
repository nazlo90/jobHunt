import { Component, OnInit, OnDestroy, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, EMPTY } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { CvService } from '@core/services/cv.service';
import { UserCvService } from '@core/services/user-cv.service';
import { ToastService } from '@core/services/toast.service';
import { UserCv } from '@core/models/user-cv.model';

const STORAGE_KEY = 'cover_letter_selected_cv';

@Component({
  selector: 'app-cover-letters',
  imports: [
    FormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule,
    MatButtonToggleModule,
  ],
  template: `
    <div class="max-w-2xl">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-slate-900 m-0">Cover Letters</h1>
        <p class="text-sm text-slate-500 mt-1">Paste a job URL to auto-fill the description, pick your CV, then generate.</p>
      </div>

      <div class="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4">

        <!-- Job URL -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Job URL</mat-label>
          <mat-icon matPrefix class="mr-2 text-slate-400">link</mat-icon>
          <input
            matInput
            placeholder="https://..."
            [(ngModel)]="jobUrl"
            (ngModelChange)="onUrlChange($event)"
          />
          @if (parsing()) {
            <mat-spinner matSuffix diameter="18" class="parse-spinner mr-2" />
          } @else if (jobUrl) {
            <button matSuffix mat-icon-button (click)="clearUrl()">
              <mat-icon>close</mat-icon>
            </button>
          }
          @if (parseError()) {
            <mat-error>Could not parse this URL — paste the description manually.</mat-error>
          }
        </mat-form-field>

        <!-- CV selector -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>My CV</mat-label>
          <mat-select [(ngModel)]="selectedCvId" (ngModelChange)="onCvChange($event)" [disabled]="!cvs().length">
            @for (cv of cvs(); track cv.id) {
              <mat-option [value]="cv.id">{{ cv.name }}</mat-option>
            }
            @if (!cvs().length) {
              <mat-option [value]="null" disabled>No CVs uploaded yet</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <!-- Language -->
        <div class="flex items-center gap-3">
          <span class="text-sm text-slate-500">Language:</span>
          <mat-button-toggle-group [(ngModel)]="language" [hideSingleSelectionIndicator]="true">
            <mat-button-toggle value="en">EN</mat-button-toggle>
            <mat-button-toggle value="uk">UA</mat-button-toggle>
          </mat-button-toggle-group>
        </div>

        <!-- Job Description — optional, auto-filled from URL -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Job Description</mat-label>
          <textarea
            matInput
            placeholder="Auto-filled from URL, or paste manually…"
            [(ngModel)]="jobDescription"
            rows="8"
            class="resize-y"
          ></textarea>
        </mat-form-field>

        <button
          mat-flat-button
          color="primary"
          [disabled]="!canGenerate()"
          (click)="generate()"
          class="self-start"
        >
          @if (loading()) {
            <mat-spinner diameter="18" class="inline-spinner mr-1" />
          } @else {
            <mat-icon class="mr-1">auto_awesome</mat-icon>
          }
          {{ loading() ? 'Generating...' : 'Generate Cover Letter' }}
        </button>
      </div>

      @if (coverLetter()) {
        <div class="bg-white border border-slate-200 rounded-xl p-5 mt-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-semibold text-slate-800">Cover Letter</span>
            <button
              mat-icon-button
              [matTooltip]="copied() ? 'Copied!' : 'Copy to clipboard'"
              (click)="copy()"
            >
              <mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
            </button>
          </div>
          <hr class="border-slate-100 mb-4" />
          <pre class="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed m-0">{{ coverLetter() }}</pre>
        </div>
      }
    </div>
  `,
  styles: [`
    :host ::ng-deep .inline-spinner circle { stroke: white; }
    :host ::ng-deep .parse-spinner circle { stroke: #7c3aed; }
    :host ::ng-deep .mat-mdc-form-field-subscript-wrapper { min-height: 0; }
  `],
})
export class CoverLettersComponent implements OnInit, OnDestroy {
  private readonly cvService = inject(CvService);
  private readonly userCvService = inject(UserCvService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly cvs = signal<UserCv[]>([]);
  readonly loading = signal(false);
  readonly parsing = signal(false);
  readonly parseError = signal(false);
  readonly coverLetter = signal('');
  readonly copied = signal(false);

  jobUrl = '';
  jobDescription = '';
  selectedCvId: number | null = null;
  language: 'en' | 'uk' = 'en';

  private readonly urlSubject = new Subject<string>();
  private copyTimeout?: ReturnType<typeof setTimeout>;

  readonly canGenerate = () =>
    !!this.selectedCvId && this.jobDescription.trim().length > 0 && !this.loading() && !this.parsing();

  ngOnInit() {
    this.userCvService.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ cvs }) => {
        this.cvs.set(cvs);
        if (cvs.length) {
          const saved = localStorage.getItem(STORAGE_KEY);
          const savedId = saved ? Number(saved) : null;
          const match = savedId && cvs.find(c => c.id === savedId);
          this.selectedCvId = match ? match.id : cvs[0].id;
        }
      },
    });

    this.urlSubject.pipe(
      debounceTime(800),
      distinctUntilChanged(),
      switchMap(url => {
        if (!url) return EMPTY;
        try { new URL(url); } catch { return EMPTY; }
        this.parsing.set(true);
        this.parseError.set(false);
        return this.cvService.parseJobDescription(url);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: ({ jobDescription }) => {
        this.jobDescription = jobDescription;
        this.parsing.set(false);
      },
      error: () => {
        this.parseError.set(true);
        this.parsing.set(false);
      },
    });
  }

  ngOnDestroy() {
    clearTimeout(this.copyTimeout);
  }

  onUrlChange(url: string) {
    this.parseError.set(false);
    this.urlSubject.next(url);
  }

  clearUrl() {
    this.jobUrl = '';
    this.jobDescription = '';
    this.parseError.set(false);
  }

  onCvChange(id: number) {
    localStorage.setItem(STORAGE_KEY, String(id));
  }

  generate() {
    if (!this.canGenerate() || this.selectedCvId === null) return;
    this.loading.set(true);
    this.cvService.generateCoverLetter(this.selectedCvId, this.jobDescription.trim(), this.language)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ coverLetter }) => {
          this.coverLetter.set(coverLetter);
          this.loading.set(false);
        },
        error: () => {
          this.toast.error('Failed to generate cover letter. Please try again.');
          this.loading.set(false);
        },
      });
  }

  copy() {
    navigator.clipboard.writeText(this.coverLetter());
    this.copied.set(true);
    clearTimeout(this.copyTimeout);
    this.copyTimeout = setTimeout(() => this.copied.set(false), 2000);
  }
}
