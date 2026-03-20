import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { JobsStore } from '@core/store/jobs.store';
import { ScraperProfileService } from '@core/services/scraper-profile.service';
import { ScraperProfile } from '@core/models/scraper-profile.model';

@Component({
  selector: 'app-dashboard',
  imports: [
    DatePipe, MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSelectModule, MatFormFieldModule, MatTooltipModule,
  ],
  template: `
    <div class="w-full">

      <div class="mb-7">
        <h1 class="m-0 text-2xl font-bold text-slate-900">Dashboard</h1>
      </div>

      @if (store.statsLoading()) {
        <div class="flex justify-center py-12">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else if (store.stats(); as stats) {

        <!-- Stat cards -->
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
            <mat-card-actions class="flex items-center gap-2 flex-wrap !px-4 !pb-3 mt-4">
              <mat-form-field appearance="outline" class="w-44" subscriptSizing="dynamic">
                <mat-label>Profile</mat-label>
                <mat-select [(value)]="selectedProfileId">
                  @for (p of profiles(); track p.id) {
                    <mat-option [value]="p.id">
                      {{ p.name }}
                      @if (p.isActive) { <span class="text-emerald-600 text-[10px]"> ●</span> }
                    </mat-option>
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
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  readonly store = inject(JobsStore);
  private readonly profileSvc = inject(ScraperProfileService);
  private readonly destroyRef = inject(DestroyRef);

  readonly profiles = signal<ScraperProfile[]>([]);
  selectedProfileId: number | undefined = undefined;

  ngOnInit() {
    this.store.loadStats(undefined);
    this.profileSvc.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ profiles }) => {
        this.profiles.set(profiles);
        const active = profiles.find(p => p.isActive) ?? profiles[0];
        if (active) this.selectedProfileId = active.id;
      },
    });
  }
}
