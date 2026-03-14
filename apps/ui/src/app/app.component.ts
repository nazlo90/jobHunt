import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatButtonModule, MatIconModule,
    MatSidenavModule, MatListModule,
  ],
  template: `
    <mat-sidenav-container class="app-container">
      <mat-sidenav mode="side" opened class="app-sidenav">
        <div class="sidenav-header">
          <div class="brand-icon"><mat-icon>work_outline</mat-icon></div>
          <span class="brand-name">JobHunt</span>
        </div>
        <div class="sidenav-divider"></div>
        <mat-nav-list class="nav-list">
          <a mat-list-item routerLink="/dashboard" routerLinkActive="active-link">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span matListItemTitle>Dashboard</span>
          </a>
          <a mat-list-item routerLink="/jobs" routerLinkActive="active-link">
            <mat-icon matListItemIcon>list_alt</mat-icon>
            <span matListItemTitle>Jobs</span>
          </a>
        </mat-nav-list>
      </mat-sidenav>
      <mat-sidenav-content class="app-content">
        <div class="content-wrap">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .app-container { height: 100vh; }
    .app-sidenav {
      width: 230px;
      border-right: 1px solid #e0e0e0;
      background: #fff;
    }
    .sidenav-header {
      display: flex; align-items: center; gap: 10px;
      padding: 20px 16px 16px;
    }
    .brand-icon {
      width: 36px; height: 36px; border-radius: 10px;
      background: #3f51b5; display: flex; align-items: center; justify-content: center;
    }
    .brand-icon mat-icon { color: #fff; font-size: 20px; width: 20px; height: 20px; }
    .brand-name { font-size: 17px; font-weight: 700; color: #1a1a2e; letter-spacing: -0.3px; }
    .sidenav-divider { height: 1px; background: #f0f0f0; margin: 0 12px 8px; }
    .nav-list { padding: 0 8px; }
    .nav-list a { border-radius: 8px; margin-bottom: 2px; }
    .active-link {
      background: #e8eaf6 !important;
      color: #3f51b5 !important;
      border-left: 3px solid #3f51b5;
    }
    .active-link mat-icon { color: #3f51b5; }
    .app-content { background: #f0f2f5; }
    .content-wrap {
      padding: 32px 24px;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .content-wrap > * { width: 100%; }
  `],
})
export class AppComponent {}
