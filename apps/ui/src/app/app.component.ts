import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Subscription } from 'rxjs';
import { JobsStore } from '@core/store/jobs.store';
import { AuthStore } from '@core/store/auth.store';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatButtonModule, MatIconModule, MatSidenavModule,
    MatListModule, MatProgressSpinnerModule, MatTooltipModule,
    MatMenuModule, MatToolbarModule,
  ],
  template: `
    @if (authStore.isAuthenticated()) {
      <mat-sidenav-container class="!h-screen">
        <mat-sidenav
          #sidenav
          [mode]="isMobile() ? 'over' : 'side'"
          [opened]="!isMobile()"
          [autoFocus]="false"
          class="w-[230px] border-r border-slate-200 bg-white flex flex-col"
        >

          <!-- Brand -->
          <div class="flex items-center gap-2.5 px-4 pt-5 pb-4">
            <div class="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
              <mat-icon class="!text-white">work_outline</mat-icon>
            </div>
            <span class="text-[17px] font-bold text-slate-900 tracking-tight flex-1">JobHunt</span>
          </div>

          <div class="h-px bg-slate-100 mx-3 mb-2"></div>

          <!-- Navigation -->
          <mat-nav-list class="!px-2 flex-1">
            <a mat-list-item routerLink="/dashboard" routerLinkActive="nav-active" class="!rounded-lg !mb-0.5"
               (click)="isMobile() && sidenav.close()">
              <mat-icon matListItemIcon>dashboard</mat-icon>
              <span matListItemTitle>Dashboard</span>
            </a>
            <a mat-list-item routerLink="/jobs" routerLinkActive="nav-active" class="!rounded-lg !mb-0.5"
               (click)="isMobile() && sidenav.close()">
              <mat-icon matListItemIcon>list_alt</mat-icon>
              <span matListItemTitle>Jobs</span>
            </a>
            <a mat-list-item routerLink="/configurations" routerLinkActive="nav-active" class="!rounded-lg !mb-0.5"
               (click)="isMobile() && sidenav.close()">
              <mat-icon matListItemIcon>tune</mat-icon>
              <span matListItemTitle>Configurations</span>
            </a>
          </mat-nav-list>

          <!-- Scraper progress -->
          @if (store.scraperRunning()) {
            <div class="mx-3 mb-3 rounded-xl bg-violet-50 border border-violet-200 px-3 py-2.5">
              <div class="flex items-center gap-2 mb-1">
                <mat-spinner diameter="14" class="scraper-spinner" />
                <span class="text-xs font-semibold text-violet-700">Scraping jobs…</span>
              </div>
              @if (store.scraperCurrentPlatform(); as platform) {
                <p class="text-[11px] text-violet-500 ml-4 truncate">{{ platform }}</p>
              }
              @if (store.scraperPlatformResults().length > 0) {
                <p class="text-[11px] text-violet-400 ml-4 mt-0.5">
                  {{ store.scraperPlatformResults().length }} platform{{ store.scraperPlatformResults().length !== 1 ? 's' : '' }} done
                </p>
              }
            </div>
          }

          <!-- User footer -->
          <div class="border-t border-slate-100 mt-auto">
            <button
              mat-button
              class="w-full !justify-start !px-4 !py-2 !h-auto"
              [matMenuTriggerFor]="userMenu"
            >
              <div class="flex items-center w-full">
                @if (authStore.user()?.avatarUrl; as avatar) {
                  <img [src]="avatar" class="w-6 h-6 rounded-full mr-2" alt="avatar" referrerpolicy="no-referrer" />
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
          <!-- Mobile top toolbar -->
          @if (isMobile()) {
            <mat-toolbar class="mobile-toolbar !bg-white border-b border-slate-200 !shadow-sm">
              <button mat-icon-button (click)="sidenav.toggle()" aria-label="Toggle menu">
                <mat-icon>menu</mat-icon>
              </button>
              <div class="flex items-center gap-2 ml-1">
                <div class="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
                  <mat-icon class="!text-white !text-[16px] !w-4 !h-4">work_outline</mat-icon>
                </div>
                <span class="text-[16px] font-bold text-slate-900 tracking-tight">JobHunt</span>
              </div>
              @if (store.scraperRunning()) {
                <span class="ml-2 flex items-center" matTooltip="Scraper is running…">
                  <mat-spinner diameter="14" />
                </span>
              }
              <span class="flex-1"></span>
              <button mat-icon-button [matMenuTriggerFor]="userMenu" aria-label="User menu">
                @if (authStore.user()?.avatarUrl; as avatar) {
                  <img [src]="avatar" class="w-7 h-7 rounded-full" alt="avatar" referrerpolicy="no-referrer" />
                } @else {
                  <mat-icon>account_circle</mat-icon>
                }
              </button>
            </mat-toolbar>
          }

          <div class="p-4 pb-24 md:pb-8 md:p-6 lg:p-8 min-h-full">
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
  styles: [`
    mat-sidenav-container { height: 100vh; }
    .mobile-toolbar { position: sticky; top: 0; z-index: 100; }
    .scraper-spinner circle { stroke: #7c3aed; }
  `],
})
export class AppComponent implements OnInit, OnDestroy {
  readonly store = inject(JobsStore);
  readonly authStore = inject(AuthStore);
  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly isMobile = signal(false);
  private bpSub?: Subscription;

  ngOnInit() {
    this.authStore.init(window.location.pathname.startsWith('/auth'));
    this.store.initScraper();
    this.bpSub = this.breakpointObserver
      .observe([Breakpoints.XSmall, Breakpoints.Small])
      .subscribe(result => this.isMobile.set(result.matches));
  }

  ngOnDestroy() {
    this.bpSub?.unsubscribe();
  }
}
