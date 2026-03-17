import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { JobsStore } from '@core/store/jobs.store';
import { AuthStore } from '@core/store/auth.store';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatButtonModule, MatIconModule, MatSidenavModule,
    MatListModule, MatProgressSpinnerModule, MatTooltipModule,
    MatMenuModule,
  ],
  template: `
    @if (authStore.isAuthenticated()) {
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

          <!-- User footer -->
          <div class="border-t border-slate-100 mt-auto">
            @if (store.scraperRunning()) {
              <div class="flex items-center gap-2 px-4 py-2 text-xs text-slate-400">
                <mat-spinner diameter="14" />
                <span>Scraping in progress…</span>
              </div>
            }
            <button
              mat-button
              class="w-full !justify-start !px-4 !py-2 !h-auto"
              [matMenuTriggerFor]="userMenu"
            >
              <div class="flex items-center w-full">
                @if (authStore.user()?.avatarUrl; as avatar) {
                  <img [src]="avatar" class="w-6 h-6 rounded-full mr-2" alt="avatar" />
                } @else {
                  <mat-icon class="mr-2">account_circle</mat-icon>
                }
                <span class="truncate text-sm text-slate-700">
                  {{ authStore.user()?.name || authStore.user()?.email }}
                </span>
              </div>
            </button>
          </div>
        </mat-sidenav>

        <mat-sidenav-content class="bg-slate-50">
          <div class="p-8 min-h-full">
            <router-outlet />
          </div>
        </mat-sidenav-content>
      </mat-sidenav-container>
    } @else {
      <!-- Auth pages — no sidebar -->
      <router-outlet />
    }

    <mat-menu #userMenu>
      <button mat-menu-item (click)="authStore.logout()">
        <mat-icon>logout</mat-icon>
        Sign out
      </button>
    </mat-menu>
  `,
  styles: [`mat-sidenav-container { height: 100vh; }`],
})
export class AppComponent implements OnInit {
  readonly store = inject(JobsStore);
  readonly authStore = inject(AuthStore);
  ngOnInit() {
    // Skip the refresh call on auth routes — no session to restore there
    this.authStore.init(window.location.pathname.startsWith('/auth'));
    this.store.initScraper();
  }
}
