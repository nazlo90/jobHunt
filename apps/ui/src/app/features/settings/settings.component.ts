import { Component, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { FormsModule } from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { ScraperConfigService } from '../../core/services/scraper-config.service';
import { UserCvService } from '../../core/services/user-cv.service';
import { ScraperConfig } from '../../core/models/scraper-config.model';
import { UserCv } from '../../core/models/user-cv.model';
import { CvPreviewDialogComponent } from '../../shared/cv-preview-dialog/cv-preview-dialog.component';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

type ArrayField = 'searchTerms' | 'strongKeywords' | 'additionalKeywords' | 'excludeTitle' | 'excludeKeywords';

const ALL_SOURCES = [
  'Djinni', 'RemoteOK', 'Wellfound', 'Remotive', 'WeWorkRemotely',
  'HackerNews', 'Himalayas', 'Jobicy', 'TheMuse', 'DOU',
  'LinkedIn', 'Greenhouse',
];

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatChipsModule, MatSlideToggleModule, MatButtonModule,
    MatIconModule, MatSnackBarModule, MatProgressSpinnerModule,
    MatDividerModule, MatListModule, FormsModule, MatTooltipModule,
  ],
  template: `
    <div class="settings-container">
      <div class="page-header">
        <h1>Settings</h1>
        <p class="subtitle">Manage your CVs and configure the job scraper.</p>
      </div>

      <!-- My CVs Section -->
      <mat-card class="section-card">
        <mat-card-header>
          <mat-card-title>My CVs</mat-card-title>
          <mat-card-subtitle>Upload PDF CVs to use in the CV Adapter.</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="cv-upload-row">
            <input #cvFileInput type="file" accept=".pdf" style="display:none"
                   (change)="onCvFileSelected($event)">
            <mat-form-field appearance="outline" class="cv-name-field">
              <mat-label>CV name</mat-label>
              <input matInput [(ngModel)]="newCvName" placeholder="e.g. Senior Frontend CV" />
            </mat-form-field>
            <button mat-stroked-button (click)="cvFileInput.click()" [disabled]="cvUploading()">
              @if (cvUploading()) {
                <span class="btn-content"><mat-spinner diameter="18"></mat-spinner>Uploading…</span>
              } @else {
                <span class="btn-content"><mat-icon>upload_file</mat-icon>Upload PDF</span>
              }
            </button>
          </div>
          <p class="field-hint">Give the CV a name, then click "Upload PDF" to select a file.</p>

          @if (userCvs().length) {
            <mat-list class="cv-list">
              @for (cv of userCvs(); track cv.id) {
                <mat-list-item>
                  <mat-icon matListItemIcon>description</mat-icon>
                  <span matListItemTitle>{{ cv.name }}</span>
                  <span matListItemLine class="cv-filename">{{ cv.filename }}</span>
                  <div matListItemMeta class="cv-item-actions">
                    <button mat-icon-button (click)="previewCv(cv)" matTooltip="Preview CV">
                      <mat-icon>visibility</mat-icon>
                    </button>
                    <button mat-icon-button (click)="deleteCv(cv.id)" matTooltip="Delete CV">
                      <mat-icon color="warn">delete</mat-icon>
                    </button>
                  </div>
                </mat-list-item>
              }
            </mat-list>
          } @else {
            <p class="empty-cvs">No CVs uploaded yet.</p>
          }
        </mat-card-content>
      </mat-card>

      <mat-divider class="section-divider" />

      @if (loading()) {
        <div class="loading-wrap">
          <mat-spinner diameter="40" />
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="save()">

          <mat-card class="section-card">
            <mat-card-header><mat-card-title>Search Terms</mat-card-title></mat-card-header>
            <mat-card-content>
              <p class="field-hint">LinkedIn will be searched for each of these terms.</p>
              <mat-chip-grid #searchTermsGrid>
                @for (term of chips['searchTerms'](); track term) {
                  <mat-chip-row (removed)="removeChip('searchTerms', term)">
                    {{ term }}
                    <button matChipRemove><mat-icon>cancel</mat-icon></button>
                  </mat-chip-row>
                }
                <input placeholder="Add search term…"
                  [matChipInputFor]="searchTermsGrid"
                  [matChipInputSeparatorKeyCodes]="separatorKeys"
                  (matChipInputTokenEnd)="addChip('searchTerms', $event)" />
              </mat-chip-grid>
            </mat-card-content>
          </mat-card>

          <mat-card class="section-card">
            <mat-card-header><mat-card-title>Filters</mat-card-title></mat-card-header>
            <mat-card-content class="filters-grid">
              <mat-form-field appearance="outline">
                <mat-label>Min Salary</mat-label>
                <input matInput type="number" formControlName="minSalary" min="0" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Min Score</mat-label>
                <mat-select formControlName="minScore">
                  @for (p of priorityOptions; track p) {
                    <mat-option [value]="p">{{ '★'.repeat(p) }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <div class="toggles-row">
                <mat-slide-toggle formControlName="remoteOnly" color="primary">Remote Only</mat-slide-toggle>
                <mat-slide-toggle formControlName="requireStrongMatch" color="primary">Require Strong Match</mat-slide-toggle>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="section-card">
            <mat-card-header><mat-card-title>Keywords</mat-card-title></mat-card-header>
            <mat-card-content>
              <p class="field-label">Strong Keywords</p>
              <p class="field-hint">Jobs matching these score higher.</p>
              <mat-chip-grid #strongGrid>
                @for (kw of chips['strongKeywords'](); track kw) {
                  <mat-chip-row (removed)="removeChip('strongKeywords', kw)">
                    {{ kw }}<button matChipRemove><mat-icon>cancel</mat-icon></button>
                  </mat-chip-row>
                }
                <input placeholder="Add keyword…" [matChipInputFor]="strongGrid"
                  [matChipInputSeparatorKeyCodes]="separatorKeys"
                  (matChipInputTokenEnd)="addChip('strongKeywords', $event)" />
              </mat-chip-grid>

              <mat-divider class="chip-divider" />

              <p class="field-label">Additional Keywords</p>
              <p class="field-hint">Secondary keywords used in scoring.</p>
              <mat-chip-grid #additionalGrid>
                @for (kw of chips['additionalKeywords'](); track kw) {
                  <mat-chip-row (removed)="removeChip('additionalKeywords', kw)">
                    {{ kw }}<button matChipRemove><mat-icon>cancel</mat-icon></button>
                  </mat-chip-row>
                }
                <input placeholder="Add keyword…" [matChipInputFor]="additionalGrid"
                  [matChipInputSeparatorKeyCodes]="separatorKeys"
                  (matChipInputTokenEnd)="addChip('additionalKeywords', $event)" />
              </mat-chip-grid>
            </mat-card-content>
          </mat-card>

          <mat-card class="section-card">
            <mat-card-header><mat-card-title>Exclusions</mat-card-title></mat-card-header>
            <mat-card-content>
              <p class="field-label">Exclude by Title</p>
              <p class="field-hint">Jobs whose title contains any of these will be filtered out.</p>
              <mat-chip-grid #excludeTitleGrid>
                @for (kw of chips['excludeTitle'](); track kw) {
                  <mat-chip-row (removed)="removeChip('excludeTitle', kw)">
                    {{ kw }}<button matChipRemove><mat-icon>cancel</mat-icon></button>
                  </mat-chip-row>
                }
                <input placeholder="Add title exclusion…" [matChipInputFor]="excludeTitleGrid"
                  [matChipInputSeparatorKeyCodes]="separatorKeys"
                  (matChipInputTokenEnd)="addChip('excludeTitle', $event)" />
              </mat-chip-grid>

              <mat-divider class="chip-divider" />

              <p class="field-label">Exclude Keywords</p>
              <p class="field-hint">Jobs whose description contains these will be filtered out.</p>
              <mat-chip-grid #excludeKwGrid>
                @for (kw of chips['excludeKeywords'](); track kw) {
                  <mat-chip-row (removed)="removeChip('excludeKeywords', kw)">
                    {{ kw }}<button matChipRemove><mat-icon>cancel</mat-icon></button>
                  </mat-chip-row>
                }
                <input placeholder="Add keyword exclusion…" [matChipInputFor]="excludeKwGrid"
                  [matChipInputSeparatorKeyCodes]="separatorKeys"
                  (matChipInputTokenEnd)="addChip('excludeKeywords', $event)" />
              </mat-chip-grid>
            </mat-card-content>
          </mat-card>

          <mat-card class="section-card">
            <mat-card-header><mat-card-title>Scraper Platforms</mat-card-title></mat-card-header>
            <mat-card-content>
              <p class="field-hint">Toggle which platforms are scraped during each run.</p>
              <div class="platforms-grid">
                @for (source of allSources; track source) {
                  <mat-slide-toggle color="primary"
                    [checked]="enabledSources().includes(source)"
                    (change)="toggleSource(source, $event.checked)">
                    {{ source }}
                  </mat-slide-toggle>
                }
              </div>
            </mat-card-content>
          </mat-card>

          <div class="actions-row">
            <button mat-flat-button color="primary" type="submit" [disabled]="saving()">
              @if (saving()) { <mat-spinner diameter="18" /> } @else { Save Changes }
            </button>
          </div>

        </form>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .page-header { margin-bottom: 24px; }
    .page-header h1 { margin: 0 0 4px; font-size: 24px; font-weight: 700; color: #1a1a2e; }
    .subtitle { margin: 0; color: #666; font-size: 14px; }
    .loading-wrap { display: flex; justify-content: center; padding: 60px 0; }
    .section-card { margin-bottom: 20px; }
    .section-card mat-card-content { padding-top: 12px; }
    .section-divider { margin: 8px 0 24px; }
    .field-hint { font-size: 12px; color: #888; margin: 0 0 10px; }
    .field-label { font-size: 13px; font-weight: 600; color: #444; margin: 16px 0 2px; }
    .field-label:first-child { margin-top: 0; }
    .chip-divider { margin: 20px 0; }
    .filters-grid { display: flex; flex-direction: column; gap: 8px; }
    .filters-grid mat-form-field { width: 200px; }
    .toggles-row { display: flex; gap: 24px; align-items: center; padding: 8px 0; }
    .actions-row { display: flex; justify-content: flex-end; padding: 8px 0 16px; }
    .actions-row button mat-spinner { display: inline-block; }
    .cv-upload-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 4px; }
    .cv-name-field { width: 260px; }
    .btn-content { display: inline-flex; align-items: center; gap: 6px; }
    .cv-list { padding: 0; margin-top: 8px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
    .cv-filename { font-size: 11px; color: #999; }
    .cv-item-actions { display: flex; align-items: center; }
    .empty-cvs { font-size: 13px; color: #aaa; font-style: italic; margin: 12px 0 4px; }
    .platforms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px 24px; padding-top: 4px; }
  `],
})
export class SettingsComponent implements OnInit {
  private readonly configSvc = inject(ScraperConfigService);
  private readonly userCvSvc = inject(UserCvService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly separatorKeys = [ENTER, COMMA] as const;
  readonly priorityOptions = [1, 2, 3, 4, 5];
  readonly allSources = ALL_SOURCES;

  loading = signal(true);
  saving = signal(false);
  cvUploading = signal(false);
  userCvs = signal<UserCv[]>([]);
  enabledSources = signal<string[]>([...ALL_SOURCES]);
  newCvName = '';

  chips: Record<ArrayField, ReturnType<typeof signal<string[]>>> = {
    searchTerms: signal([]),
    strongKeywords: signal([]),
    additionalKeywords: signal([]),
    excludeTitle: signal([]),
    excludeKeywords: signal([]),
  };

  form = this.fb.group({
    minSalary: [0, [Validators.required, Validators.min(0)]],
    minScore: [2, [Validators.required, Validators.min(0)]],
    remoteOnly: [true],
    requireStrongMatch: [true],
  });

  ngOnInit() {
    this.loadUserCvs();
    this.configSvc.get().subscribe({
      next: ({ config }) => {
        this.form.patchValue({
          minSalary: config.minSalary,
          minScore: config.minScore,
          remoteOnly: config.remoteOnly,
          requireStrongMatch: config.requireStrongMatch,
        });
        for (const field of Object.keys(this.chips) as ArrayField[]) {
          this.chips[field].set([...(config[field] as string[])]);
        }
        this.enabledSources.set(config.enabledSources ?? [...ALL_SOURCES]);
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to load config', 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  private loadUserCvs() {
    this.userCvSvc.list().subscribe({
      next: ({ cvs }) => this.userCvs.set(cvs),
      error: () => this.snackBar.open('Failed to load CVs', 'Close', { duration: 3000 }),
    });
  }

  async onCvFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const name = this.newCvName.trim() || file.name.replace(/\.pdf$/i, '');
    this.cvUploading.set(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const cvText = await this.extractTextFromPdf(arrayBuffer);
      this.userCvSvc.create(name, cvText, file).subscribe({
        next: ({ cv }) => {
          this.userCvs.update(list => [cv, ...list]);
          this.newCvName = '';
          this.snackBar.open('CV uploaded', undefined, { duration: 2500 });
        },
        error: () => this.snackBar.open('Upload failed', 'Close', { duration: 3000 }),
        complete: () => this.cvUploading.set(false),
      });
    } catch {
      this.snackBar.open('Failed to parse PDF', 'Close', { duration: 3000 });
      this.cvUploading.set(false);
    }
    input.value = '';
  }

  private async extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = (content.items as Array<{ str?: string }>)
        .map(item => item.str ?? '')
        .join(' ');
      pages.push(pageText);
    }
    return pages.join('\n\n');
  }

  previewCv(cv: UserCv) {
    this.dialog.open(CvPreviewDialogComponent, {
      data: { fileUrl: this.userCvSvc.fileUrl(cv.id), title: cv.name },
      width: '960px',
      maxWidth: '95vw',
      height: '90vh',
      panelClass: 'cv-preview-dialog-panel',
    });
  }

  deleteCv(id: number) {
    this.userCvSvc.remove(id).subscribe({
      next: () => this.userCvs.update(list => list.filter(c => c.id !== id)),
      error: () => this.snackBar.open('Failed to delete CV', 'Close', { duration: 3000 }),
    });
  }

  addChip(field: ArrayField, event: MatChipInputEvent) {
    const value = (event.value ?? '').trim().toLowerCase();
    if (value && !this.chips[field]().includes(value)) {
      this.chips[field].update(arr => [...arr, value]);
    }
    event.chipInput.clear();
  }

  removeChip(field: ArrayField, item: string) {
    this.chips[field].update(arr => arr.filter(v => v !== item));
  }

  toggleSource(source: string, enabled: boolean) {
    this.enabledSources.update(list =>
      enabled ? [...list, source] : list.filter(s => s !== source)
    );
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);

    const payload: Partial<ScraperConfig> = {
      ...this.form.value as Partial<ScraperConfig>,
      searchTerms: this.chips['searchTerms'](),
      strongKeywords: this.chips['strongKeywords'](),
      additionalKeywords: this.chips['additionalKeywords'](),
      excludeTitle: this.chips['excludeTitle'](),
      excludeKeywords: this.chips['excludeKeywords'](),
      enabledSources: this.enabledSources(),
    };

    this.configSvc.update(payload).subscribe({
      next: () => {
        this.snackBar.open('Settings saved', undefined, { duration: 2500 });
        this.saving.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to save settings', 'Close', { duration: 3000 });
        this.saving.set(false);
      },
    });
  }
}
