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
          <mat-icon>work_outline</mat-icon>
          <span>JobHunt</span>
        </div>
        <mat-nav-list>
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
        <router-outlet />
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .app-container { height: 100vh; }
    .app-sidenav { width: 220px; padding-top: 8px; }
    .app-content { padding: 24px; }
    .sidenav-header {
      display: flex; align-items: center; gap: 8px;
      padding: 16px; font-size: 18px; font-weight: 600; color: #3f51b5;
    }
    .active-link { background: rgba(63,81,181,0.1); }
  `],
})
export class AppComponent {}
