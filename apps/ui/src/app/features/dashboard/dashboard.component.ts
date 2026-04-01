import { Component, OnInit, signal, inject, DestroyRef, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { JobsStore } from '@core/store/jobs.store';
import { ScraperProfileService } from '@core/services/scraper-profile.service';
import { UserCvService } from '@core/services/user-cv.service';
import { ScraperProfile } from '@core/models/scraper-profile.model';

@Component({
  selector: 'app-dashboard',
  imports: [
    DatePipe, RouterLink, MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSelectModule, MatFormFieldModule, MatTooltipModule,
  ],
  template: `
    <div class="w-full">

      <div class="mb-7">
        <h1 class="m-0 text-2xl font-bold text-slate-900">Dashboard</h1>
      </div>

      <!-- ── Onboarding banner (shows until steps 1 & 2 done) ── -->
      @if (!onboardingDone()) {
        <div class="mb-6 rounded-xl border border-violet-200 bg-violet-50 p-5">
          <div class="flex items-start gap-3 mb-4">
            <div class="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
              <mat-icon class="!text-white">rocket_launch</mat-icon>
            </div>
            <div>
              <p class="font-semibold text-slate-900 m-0">Get started with JobHunt</p>
              <p class="text-sm text-slate-500 m-0">Complete these steps to start finding jobs automatically.</p>
            </div>
          </div>

          <div class="flex flex-col gap-2">

            <!-- Step 1: Upload CV -->
            <div class="flex items-center gap-3 rounded-lg p-3 transition-colors"
                 [class.bg-emerald-50]="step1Done()" [class.bg-white]="!step1Done()">
              <div class="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                   [class.bg-emerald-500]="step1Done()" [class.bg-slate-200]="!step1Done()">
                @if (step1Done()) {
                  <mat-icon class="!text-white !text-[16px] !w-4 !h-4">check</mat-icon>
                } @else {
                  <span class="text-[12px] font-bold text-slate-500">1</span>
                }
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium m-0" [class.text-emerald-700]="step1Done()" [class.text-slate-700]="!step1Done()">
                  Upload a CV
                </p>
                @if (!step1Done()) {
                  <p class="text-xs text-slate-400 m-0">Required for AI-powered CV adapting</p>
                }
              </div>
              @if (!step1Done()) {
                <a mat-stroked-button routerLink="/configurations"
                   class="!text-sm !py-1">
                  Upload CV
                </a>
              }
            </div>

            <!-- Step 2: Configure search terms -->
            <div class="flex items-center gap-3 rounded-lg p-3 transition-colors"
                 [class.bg-emerald-50]="step2Done()" [class.bg-white]="!step2Done()">
              <div class="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                   [class.bg-emerald-500]="step2Done()" [class.bg-slate-200]="!step2Done()">
                @if (step2Done()) {
                  <mat-icon class="!text-white !text-[16px] !w-4 !h-4">check</mat-icon>
                } @else {
                  <span class="text-[12px] font-bold text-slate-500">2</span>
                }
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium m-0" [class.text-emerald-700]="step2Done()" [class.text-slate-700]="!step2Done()">
                  Set up search terms
                </p>
                @if (!step2Done()) {
                  <p class="text-xs text-slate-400 m-0">Tell the scraper what roles to look for</p>
                }
              </div>
              @if (!step2Done()) {
                <a mat-stroked-button routerLink="/configurations" [queryParams]="{tab: 'scraper'}"
                   class="!text-sm !py-1">
                  Add Search Terms
                </a>
              }
            </div>

          </div>
        </div>
      }

      @if (store.statsLoading()) {
        <div class="flex justify-center py-12">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else if (store.stats(); as stats) {

        <!-- ── Empty state hero ── -->
        @if (stats.total === 0 && onboardingDone()) {
          <mat-card class="mb-6">
            <mat-card-content class="!p-8 text-center">
              <div class="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-4">
                <mat-icon class="!text-4xl text-violet-500">search</mat-icon>
              </div>
              <h2 class="text-xl font-bold text-slate-800 m-0 mb-2">No jobs yet</h2>
              <p class="text-slate-500 text-sm mb-5 max-w-sm mx-auto">
                Run the scraper to automatically collect jobs from all your configured platforms,
                or add a job manually.
              </p>
              <div class="flex justify-center gap-3 flex-wrap">
                @if (store.scraperStopping()) {
                  <button mat-flat-button disabled>
                    <span class="flex items-center gap-1.5"><mat-spinner diameter="18" />Stopping…</span>
                  </button>
                } @else if (store.scraperRunning()) {
                  <button mat-flat-button color="warn" (click)="store.stopScraper()">
                    <span class="flex items-center gap-1.5"><mat-icon>stop</mat-icon>Stop</span>
                  </button>
                } @else {
                  <button mat-flat-button color="primary" (click)="store.runScraper(selectedProfileId)">
                    <span class="flex items-center gap-1.5"><mat-icon>refresh</mat-icon>Run Scraper</span>
                  </button>
                }
                <a mat-stroked-button routerLink="/jobs/new">
                  <mat-icon>add</mat-icon> Add Job Manually
                </a>
              </div>
            </mat-card-content>
          </mat-card>
        }

        <!-- ── Stat cards ── -->
        @if (stats.total > 0) {
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">

            <mat-card>
              <mat-card-content class="!p-5">
                <div class="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
                  <mat-icon>work_outline</mat-icon>
                </div>
                <div class="text-4xl font-bold text-slate-900 leading-none">{{ stats.total }}</div>
                <div class="text-sm text-slate-500 mt-1">Total Jobs</div>
              </mat-card-content>
            </mat-card>

            <mat-card>
              <mat-card-content class="!p-5">
                <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                  <mat-icon>trending_up</mat-icon>
                </div>
                <div class="text-4xl font-bold text-amber-600 leading-none">{{ store.pipeline() }}</div>
                <div class="text-sm text-slate-500 mt-1">In Pipeline</div>
              </mat-card-content>
            </mat-card>

            <mat-card>
              <mat-card-content class="!p-5">
                <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                  <mat-icon>check_circle_outline</mat-icon>
                </div>
                <div class="text-4xl font-bold text-emerald-600 leading-none">{{ store.offers() }}</div>
                <div class="text-sm text-slate-500 mt-1">Offers</div>
              </mat-card-content>
            </mat-card>

            <mat-card>
              <mat-card-content class="!p-5">
                <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                  <mat-icon>calendar_today</mat-icon>
                </div>
                <div class="text-4xl font-bold text-blue-600 leading-none">{{ store.thisWeek() }}</div>
                <div class="text-sm text-slate-500 mt-1">Applied This Week</div>
              </mat-card-content>
            </mat-card>

          </div>

          <!-- Bottom row -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">

            <mat-card>
              <mat-card-header><mat-card-title>By Status</mat-card-title></mat-card-header>
              <mat-card-content>
                @for (item of stats.byStatus; track item.status) {
                  <div class="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0 text-sm">
                    <span class="text-slate-600">{{ item.status }}</span>
                    <strong class="text-slate-900">{{ item.count }}</strong>
                  </div>
                }
              </mat-card-content>
            </mat-card>

            <mat-card>
              <mat-card-header><mat-card-title>By Source</mat-card-title></mat-card-header>
              <mat-card-content>
                @for (item of stats.bySource; track item.source) {
                  <div class="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0 text-sm">
                    <span class="text-slate-600">{{ item.source }}</span>
                    <strong class="text-slate-900">{{ item.count }}</strong>
                  </div>
                }
              </mat-card-content>
            </mat-card>

            <mat-card>
              <mat-card-header><mat-card-title>Scraper</mat-card-title></mat-card-header>
              <mat-card-content>
                @if (store.scraperStatus(); as s) {
                  <p class="text-sm text-slate-600 mb-1">
                    Last run: {{ s.lastRun?.finishedAt | date:'short' }}
                  </p>
                  <p class="text-sm text-slate-500">
                    New: {{ s.lastRun?.inserted ?? 0 }}
                    &nbsp;|&nbsp; Updated: {{ s.lastRun?.updated ?? 0 }}
                    &nbsp;|&nbsp; Removed: {{ s.lastRun?.deleted ?? 0 }}
                  </p>
                  @if (s.lastRun?.errors?.length) {
                    <p class="text-sm text-red-500 mt-1">{{ s.lastRun!.errors.length }} error(s)</p>
                  }
                }
              </mat-card-content>
              <mat-card-actions class="flex items-center gap-2 flex-wrap !px-4 !pb-3 mt-6">
                <mat-form-field appearance="outline" class="w-44" subscriptSizing="dynamic">
                  <mat-label>Profile</mat-label>
                  <mat-select [(value)]="selectedProfileId">
                    @for (p of profiles(); track p.id) {
                      <mat-option [value]="p.id">{{ p.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                @if (store.scraperStopping()) {
                  <button mat-raised-button disabled>
                    <span class="flex items-center gap-1.5"><mat-spinner diameter="18"></mat-spinner>Stopping…</span>
                  </button>
                } @else if (store.scraperRunning()) {
                  <button mat-raised-button color="warn" (click)="store.stopScraper()">
                    <span class="flex items-center gap-1.5"><mat-icon>stop</mat-icon>Stop</span>
                  </button>
                } @else {
                  <button mat-raised-button color="primary" (click)="store.runScraper(selectedProfileId)">
                    <span class="flex items-center gap-1.5"><mat-icon>refresh</mat-icon>Run Scraper</span>
                  </button>
                }
              </mat-card-actions>
            </mat-card>

          </div>
        }
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  readonly store = inject(JobsStore);
  private readonly profileSvc = inject(ScraperProfileService);
  private readonly userCvSvc = inject(UserCvService);
  private readonly destroyRef = inject(DestroyRef);

  readonly profiles = signal<ScraperProfile[]>([]);
  selectedProfileId: number | undefined = undefined;

  // Onboarding state
  readonly hasCvs = signal(false);
  readonly hasSearchTerms = signal(false);

  readonly step1Done = computed(() => this.hasCvs());
  readonly step2Done = computed(() => this.hasSearchTerms());
  readonly onboardingDone = computed(() => this.step1Done() && this.step2Done());

  ngOnInit() {
    this.store.loadStats(undefined);

    this.profileSvc.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ profiles }) => {
        this.profiles.set(profiles);
        const active = profiles.find(p => p.isActive) ?? profiles[0];
        if (active) {
          this.selectedProfileId = active.id;
          this.hasSearchTerms.set((active.searchTerms?.length ?? 0) > 0);
        }
      },
    });

    this.userCvSvc.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ cvs }) => this.hasCvs.set(cvs.length > 0),
    });

  }
}
