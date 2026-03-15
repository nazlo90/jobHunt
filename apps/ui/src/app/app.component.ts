import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { JobsStore } from '@core/store/jobs.store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatButtonModule, MatIconModule, MatSidenavModule,
    MatListModule, MatProgressSpinnerModule, MatTooltipModule,
  ],
  template: `
    <mat-sidenav-container class="!h-screen">
      <mat-sidenav mode="side" opened class="w-[230px] border-r border-slate-200 bg-white flex flex-col">

        <!-- Brand -->
        <div class="flex items-center gap-2.5 px-4 pt-5 pb-4">
          <div class="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
            <mat-icon class="!text-white">work_outline</mat-icon>
          </div>
          <span class="text-[17px] font-bold text-slate-900 tracking-tight flex-1">JobHunt</span>
          @if (store.scraperRunning()) {
            <span class="flex items-center" matTooltip="Scraper is running…">
              <mat-spinner diameter="16" />
            </span>
          }
        </div>

        <div class="h-px bg-slate-100 mx-3 mb-2"></div>

        <!-- Navigation -->
        <mat-nav-list class="!px-2 flex-1">
          <a mat-list-item routerLink="/dashboard" routerLinkActive="nav-active" class="!rounded-lg !mb-0.5">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span matListItemTitle>Dashboard</span>
          </a>
          <a mat-list-item routerLink="/jobs" routerLinkActive="nav-active" class="!rounded-lg !mb-0.5">
            <mat-icon matListItemIcon>list_alt</mat-icon>
            <span matListItemTitle>Jobs</span>
          </a>
          <a mat-list-item routerLink="/settings" routerLinkActive="nav-active" class="!rounded-lg !mb-0.5">
            <mat-icon matListItemIcon>tune</mat-icon>
            <span matListItemTitle>Settings</span>
          </a>
        </mat-nav-list>

        <!-- Scraper footer -->
        @if (store.scraperRunning()) {
          <div class="flex items-center gap-2 px-4 py-2.5 text-xs text-slate-400 border-t border-slate-100 mt-auto">
            <mat-spinner diameter="14" />
            <span>Scraping in progress…</span>
          </div>
        }
      </mat-sidenav>

      <mat-sidenav-content class="bg-slate-50">
        <div class="p-8 min-h-full">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`mat-sidenav-container { height: 100vh; }`],
})
export class AppComponent implements OnInit {
  readonly store = inject(JobsStore);

  ngOnInit() {
    this.store.initScraper();
  }
}
