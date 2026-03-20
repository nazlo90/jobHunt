import { Component, inject, signal, input, output, effect, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ScraperProfileService } from '@core/services/scraper-profile.service';
import { ToastService } from '@core/services/toast.service';
import { ScraperProfile } from '@core/models/scraper-profile.model';
import { ArrayField, ALL_SOURCES } from '@core/constants/scraper.const';

@Component({
  selector: 'app-scraper-form',
  imports: [
    ReactiveFormsModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatChipsModule, MatSlideToggleModule, MatButtonModule,
    MatIconModule, MatDividerModule, MatProgressSpinnerModule,
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="save()" class="overflow-x-hidden">

      <!-- Search Terms -->
      <mat-card class="mb-5">
        <mat-card-header>
          <mat-card-title>Search Terms</mat-card-title>
          <mat-card-subtitle>Each term is searched separately on LinkedIn and other platforms.</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="!pt-3">
          <div class="field-wrap">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Search Terms</mat-label>
              <mat-chip-grid #searchGrid class="w-full">
                @for (term of chips['searchTerms'](); track term) {
                  <mat-chip-row (removed)="removeChip('searchTerms', term)">
                    {{ term }}<button matChipRemove><mat-icon>cancel</mat-icon></button>
                  </mat-chip-row>
                }
                <input placeholder="e.g. Senior Frontend Developer…"
                  [matChipInputFor]="searchGrid"
                  [matChipInputSeparatorKeyCodes]="separatorKeys"
                  (matChipInputTokenEnd)="addChip('searchTerms', $event)" />
              </mat-chip-grid>
              <mat-hint>Type a term and press <kbd class="kbd">Enter</kbd> or <kbd class="kbd">,</kbd> to add it. Click × to remove.</mat-hint>
            </mat-form-field>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Filters -->
      <mat-card class="mb-5">
        <mat-card-header><mat-card-title>Filters</mat-card-title></mat-card-header>
        <mat-card-content class="!pt-3">
          <div class="flex gap-4 flex-wrap mb-3">
            <mat-form-field appearance="outline" class="w-44">
              <mat-label>Min Salary</mat-label>
              <input matInput type="number" formControlName="minSalary" min="0">
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-44">
              <mat-label>Min Score</mat-label>
              <mat-select formControlName="minScore">
                @for (p of [1,2,3,4,5]; track p) {
                  <mat-option [value]="p">{{ '★'.repeat(p) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
          <div class="flex gap-6 items-center py-1">
            <mat-slide-toggle formControlName="remoteOnly" color="primary">Remote Only</mat-slide-toggle>
            <mat-slide-toggle formControlName="requireStrongMatch" color="primary">Require Strong Match</mat-slide-toggle>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Keywords -->
      <mat-card class="mb-5">
        <mat-card-header>
          <mat-card-title>Keywords</mat-card-title>
          <mat-card-subtitle>Used to score and rank jobs by relevance.</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="!pt-3">
          <div class="field-wrap">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Strong Keywords</mat-label>
              <mat-chip-grid #strongGrid class="w-full">
                @for (kw of chips['strongKeywords'](); track kw) {
                  <mat-chip-row (removed)="removeChip('strongKeywords', kw)">
                    {{ kw }}<button matChipRemove><mat-icon>cancel</mat-icon></button>
                  </mat-chip-row>
                }
                <input placeholder="e.g. TypeScript, React…"
                  [matChipInputFor]="strongGrid"
                  [matChipInputSeparatorKeyCodes]="separatorKeys"
                  (matChipInputTokenEnd)="addChip('strongKeywords', $event)" />
              </mat-chip-grid>
              <mat-hint>Jobs matching these keywords get a higher relevance score. Press <kbd class="kbd">Enter</kbd> or <kbd class="kbd">,</kbd> to add.</mat-hint>
            </mat-form-field>
          </div>
          <div class="field-wrap">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Additional Keywords</mat-label>
              <mat-chip-grid #additionalGrid class="w-full">
                @for (kw of chips['additionalKeywords'](); track kw) {
                  <mat-chip-row (removed)="removeChip('additionalKeywords', kw)">
                    {{ kw }}<button matChipRemove><mat-icon>cancel</mat-icon></button>
                  </mat-chip-row>
                }
                <input placeholder="e.g. GraphQL, Node.js…"
                  [matChipInputFor]="additionalGrid"
                  [matChipInputSeparatorKeyCodes]="separatorKeys"
                  (matChipInputTokenEnd)="addChip('additionalKeywords', $event)" />
              </mat-chip-grid>
              <mat-hint>Secondary keywords — still boost score, but less than strong keywords.</mat-hint>
            </mat-form-field>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Exclusions -->
      <mat-card class="mb-5">
        <mat-card-header>
          <mat-card-title>Exclusions</mat-card-title>
          <mat-card-subtitle>Jobs matching these will be filtered out before saving.</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="!pt-3">
          <div class="field-wrap">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Exclude by Job Title</mat-label>
              <mat-chip-grid #excludeTitleGrid class="w-full">
                @for (kw of chips['excludeTitle'](); track kw) {
                  <mat-chip-row (removed)="removeChip('excludeTitle', kw)">
                    {{ kw }}<button matChipRemove><mat-icon>cancel</mat-icon></button>
                  </mat-chip-row>
                }
                <input placeholder="e.g. junior, intern, manager…"
                  [matChipInputFor]="excludeTitleGrid"
                  [matChipInputSeparatorKeyCodes]="separatorKeys"
                  (matChipInputTokenEnd)="addChip('excludeTitle', $event)" />
              </mat-chip-grid>
              <mat-hint>Jobs whose title contains any of these words will be skipped. Press <kbd class="kbd">Enter</kbd> or <kbd class="kbd">,</kbd> to add.</mat-hint>
            </mat-form-field>
          </div>
          <div class="field-wrap">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Exclude by Description Keyword</mat-label>
              <mat-chip-grid #excludeKwGrid class="w-full">
                @for (kw of chips['excludeKeywords'](); track kw) {
                  <mat-chip-row (removed)="removeChip('excludeKeywords', kw)">
                    {{ kw }}<button matChipRemove><mat-icon>cancel</mat-icon></button>
                  </mat-chip-row>
                }
                <input placeholder="e.g. WordPress, Ruby, Golang…"
                  [matChipInputFor]="excludeKwGrid"
                  [matChipInputSeparatorKeyCodes]="separatorKeys"
                  (matChipInputTokenEnd)="addChip('excludeKeywords', $event)" />
              </mat-chip-grid>
              <mat-hint>Jobs whose description contains these words will be skipped.</mat-hint>
            </mat-form-field>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Platforms -->
      <mat-card class="mb-5">
        <mat-card-header><mat-card-title>Scraper Platforms</mat-card-title></mat-card-header>
        <mat-card-content>
          <p class="text-xs text-slate-400 mb-3">Toggle which platforms are scraped during each run.</p>
          <div class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
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

      <!-- Save -->
      <div class="flex justify-end pb-4">
        <button mat-flat-button color="primary" type="submit" [disabled]="saving()">
          <span class="flex items-center gap-1.5">
            @if (saving()) { <mat-spinner diameter="18" /> } @else { <mat-icon>save</mat-icon> }
            Save Changes
          </span>
        </button>
      </div>

    </form>
  `,
  styles: [`
    .field-wrap { display: block; width: 100%; min-width: 0; overflow: hidden; margin-bottom: 20px; }
    .field-wrap:last-child { margin-bottom: 0; }
    .field-wrap mat-form-field { display: block; }
  `],
})
export class ScraperFormComponent {
  private readonly profileSvc = inject(ScraperProfileService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly profile = input.required<ScraperProfile>();
  readonly profileUpdated = output<ScraperProfile>();

  readonly separatorKeys = [ENTER, COMMA] as const;
  readonly allSources = ALL_SOURCES;
  readonly saving = signal(false);
  readonly enabledSources = signal<string[]>([...ALL_SOURCES]);

  readonly chips: Record<ArrayField, ReturnType<typeof signal<string[]>>> = {
    searchTerms: signal([]),
    strongKeywords: signal([]),
    additionalKeywords: signal([]),
    excludeTitle: signal([]),
    excludeKeywords: signal([]),
  };

  readonly form = this.fb.group({
    minSalary: [0, [Validators.required, Validators.min(0)]],
    minScore: [2, [Validators.required, Validators.min(0)]],
    remoteOnly: [true],
    requireStrongMatch: [true],
  });

  constructor() {
    // Reset form whenever the profile input changes
    effect(() => {
      const p = this.profile();
      this.form.patchValue({
        minSalary: p.minSalary,
        minScore: p.minScore,
        remoteOnly: p.remoteOnly,
        requireStrongMatch: p.requireStrongMatch,
      });
      for (const field of Object.keys(this.chips) as ArrayField[]) {
        this.chips[field].set([...(p[field] as string[])]);
      }
      this.enabledSources.set(p.enabledSources ?? [...ALL_SOURCES]);
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
      enabled ? [...list, source] : list.filter(s => s !== source),
    );
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);

    const payload: Partial<ScraperProfile> = {
      ...this.form.value as Partial<ScraperProfile>,
      searchTerms: this.chips['searchTerms'](),
      strongKeywords: this.chips['strongKeywords'](),
      additionalKeywords: this.chips['additionalKeywords'](),
      excludeTitle: this.chips['excludeTitle'](),
      excludeKeywords: this.chips['excludeKeywords'](),
      enabledSources: this.enabledSources(),
    };

    this.profileSvc.update(this.profile().id, payload).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: ({ profile }) => {
        this.profileUpdated.emit(profile);
        this.toast.success('Profile saved');
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }
}
