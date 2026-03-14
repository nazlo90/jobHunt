import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { JobsStore } from '../../core/store/jobs.store';
import { ScraperService, ScraperStatus } from '../../core/services/scraper.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="dashboard">
      <h1>Dashboard</h1>

      @if (store.statsLoading()) {
        <mat-spinner diameter="40"></mat-spinner>
      } @else if (store.stats(); as stats) {
        <div class="stats-grid">
          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-number">{{ stats.total }}</div>
              <div class="stat-label">Total Jobs</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card accent">
            <mat-card-content>
              <div class="stat-number">{{ store.pipeline() }}</div>
              <div class="stat-label">In Pipeline</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card success">
            <mat-card-content>
              <div class="stat-number">{{ store.offers() }}</div>
              <div class="stat-label">Offers</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card info">
            <mat-card-content>
              <div class="stat-number">{{ store.thisWeek() }}</div>
              <div class="stat-label">Applied This Week</div>
            </mat-card-content>
          </mat-card>
        </div>

        <div class="bottom-row">
          <mat-card>
            <mat-card-header><mat-card-title>By Status</mat-card-title></mat-card-header>
            <mat-card-content>
              @for (item of stats.byStatus; track item.status) {
                <div class="breakdown-row">
                  <span>{{ item.status }}</span>
                  <strong>{{ item.count }}</strong>
                </div>
              }
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-header><mat-card-title>By Source</mat-card-title></mat-card-header>
            <mat-card-content>
              @for (item of stats.bySource; track item.source) {
                <div class="breakdown-row">
                  <span>{{ item.source }}</span>
                  <strong>{{ item.count }}</strong>
                </div>
              }
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-header><mat-card-title>Scraper</mat-card-title></mat-card-header>
            <mat-card-content>
              @if (scraperStatus(); as s) {
                <p>Last run: {{ s.lastRun?.finishedAt | date:'short' }}</p>
                <p>New jobs: {{ s.lastRun?.inserted ?? 0 }}</p>
                @if (s.lastRun?.errors?.length) {
                  <p class="error-text">{{ s.lastRun!.errors.length }} error(s)</p>
                }
              }
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button color="primary" (click)="runScraper()" [disabled]="scraperRunning()">
                @if (scraperRunning()) {
                  <mat-spinner diameter="18" style="display:inline-block;margin-right:8px"></mat-spinner>Running…
                } @else {
                  <mat-icon>refresh</mat-icon> Run Scraper
                }
              </button>
            </mat-card-actions>
          </mat-card>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard { max-width: 1100px; }
    h1 { margin-bottom: 24px; font-size: 24px; font-weight: 600; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-number { font-size: 40px; font-weight: 700; line-height: 1.1; }
    .stat-label { font-size: 13px; color: #666; margin-top: 4px; }
    .stat-card.accent .stat-number { color: #ff9800; }
    .stat-card.success .stat-number { color: #4caf50; }
    .stat-card.info .stat-number { color: #2196f3; }
    .bottom-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    .breakdown-row { display: flex; justify-content: space-between; padding: 4px 0; }
    .error-text { color: #f44336; font-size: 13px; }
  `],
})
export class DashboardComponent implements OnInit {
  readonly store = inject(JobsStore);
  readonly scraperSvc = inject(ScraperService);
  readonly scraperStatus = signal<ScraperStatus | null>(null);
  readonly scraperRunning = signal(false);

  ngOnInit() {
    this.store.loadStats(undefined);
    this.scraperSvc.getStatus().subscribe((s) => this.scraperStatus.set(s));
  }

  runScraper() {
    this.scraperRunning.set(true);
    this.scraperSvc.run().subscribe({
      next: () => {
        this.scraperRunning.set(false);
        this.store.loadStats(undefined);
        this.scraperSvc.getStatus().subscribe((s) => this.scraperStatus.set(s));
      },
      error: () => this.scraperRunning.set(false),
    });
  }
}
