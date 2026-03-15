import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { JobsStore } from '../../core/store/jobs.store';
import { ScraperProfileService } from '../../core/services/scraper-profile.service';
import { ScraperProfile } from '../../core/models/scraper-profile.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSelectModule, MatFormFieldModule, MatTooltipModule,
  ],
  template: `
    <div class="dashboard">
      <div class="page-header">
        <h1>Dashboard</h1>
      </div>

      @if (store.statsLoading()) {
        <div class="spinner-wrap"><mat-spinner diameter="40"></mat-spinner></div>
      } @else if (store.stats(); as stats) {
        <div class="stats-grid">
          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-icon-wrap default"><mat-icon>work_outline</mat-icon></div>
              <div class="stat-number">{{ stats.total }}</div>
              <div class="stat-label">Total Jobs</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card accent">
            <mat-card-content>
              <div class="stat-icon-wrap accent"><mat-icon>trending_up</mat-icon></div>
              <div class="stat-number">{{ store.pipeline() }}</div>
              <div class="stat-label">In Pipeline</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card success">
            <mat-card-content>
              <div class="stat-icon-wrap success"><mat-icon>check_circle_outline</mat-icon></div>
              <div class="stat-number">{{ store.offers() }}</div>
              <div class="stat-label">Offers</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card info">
            <mat-card-content>
              <div class="stat-icon-wrap info"><mat-icon>calendar_today</mat-icon></div>
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
              @if (store.scraperStatus(); as s) {
                <p>Last run: {{ s.lastRun?.finishedAt | date:'short' }}</p>
                <p>New: {{ s.lastRun?.inserted ?? 0 }} &nbsp;|&nbsp; Updated: {{ s.lastRun?.updated ?? 0 }} &nbsp;|&nbsp; Removed: {{ s.lastRun?.deleted ?? 0 }}</p>
                @if (s.lastRun?.errors?.length) {
                  <p class="error-text">{{ s.lastRun!.errors.length }} error(s)</p>
                }
              }
            </mat-card-content>
            <mat-card-actions class="scraper-actions">
              <mat-form-field appearance="outline" class="profile-select" subscriptSizing="dynamic">
                <mat-label>Profile</mat-label>
                <mat-select [(value)]="selectedProfileId">
                  @for (p of profiles(); track p.id) {
                    <mat-option [value]="p.id">
                      {{ p.name }}
                      @if (p.isActive) { <span class="active-dot"> ●</span> }
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>
              @if (store.scraperStopping()) {
                <button mat-raised-button disabled>
                  <span class="btn-content"><mat-spinner diameter="18"></mat-spinner>Stopping…</span>
                </button>
              } @else if (store.scraperRunning()) {
                <button mat-raised-button color="warn" (click)="store.stopScraper()">
                  <span class="btn-content"><mat-icon>stop</mat-icon>Stop</span>
                </button>
              } @else {
                <button mat-raised-button color="primary" (click)="store.runScraper(selectedProfileId)">
                  <span class="btn-content"><mat-icon>refresh</mat-icon>Run Scraper</span>
                </button>
              }
            </mat-card-actions>
          </mat-card>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .dashboard { width: 100%; }
    .btn-content { display: inline-flex; align-items: center; gap: 6px; }
    .page-header { margin-bottom: 28px; }
    h1 { margin: 0; font-size: 26px; font-weight: 700; color: #1a1a2e; }
    .spinner-wrap { display: flex; justify-content: center; padding: 48px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card mat-card-content { padding: 20px !important; }
    .stat-icon-wrap {
      width: 40px; height: 40px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 12px;
    }
    .stat-icon-wrap mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .stat-icon-wrap.default { background: #e8eaf6; color: #3f51b5; }
    .stat-icon-wrap.accent  { background: #fff3e0; color: #e65100; }
    .stat-icon-wrap.success { background: #e8f5e9; color: #2e7d32; }
    .stat-icon-wrap.info    { background: #e3f2fd; color: #1565c0; }
    .stat-number { font-size: 36px; font-weight: 700; line-height: 1.1; color: #1a1a2e; }
    .stat-label { font-size: 13px; color: #777; margin-top: 4px; }
    .stat-card.accent .stat-number { color: #e65100; }
    .stat-card.success .stat-number { color: #2e7d32; }
    .stat-card.info .stat-number { color: #1565c0; }
    .bottom-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    .breakdown-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 6px 0; border-bottom: 1px solid #f5f5f5; font-size: 14px;
    }
    .breakdown-row:last-child { border-bottom: none; }
    .error-text { color: #f44336; font-size: 13px; }
    .scraper-actions { display: flex; align-items: center; gap: 10px; padding: 8px 16px 12px; flex-wrap: wrap; }
    .profile-select { width: 180px; }
    .active-dot { color: #2e7d32; font-size: 10px; }
  `],
})
export class DashboardComponent implements OnInit {
  readonly store = inject(JobsStore);
  private readonly profileSvc = inject(ScraperProfileService);

  profiles = signal<ScraperProfile[]>([]);
  selectedProfileId: number | undefined = undefined;

  ngOnInit() {
    this.store.loadStats(undefined);
    this.profileSvc.list().subscribe({
      next: ({ profiles }) => {
        this.profiles.set(profiles);
        const active = profiles.find(p => p.isActive) ?? profiles[0];
        if (active) this.selectedProfileId = active.id;
      },
    });
  }
}
