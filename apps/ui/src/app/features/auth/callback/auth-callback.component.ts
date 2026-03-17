import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthStore } from '../../../core/store/auth.store';

@Component({
  selector: 'app-auth-callback',
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="callback-page">
      <mat-spinner />
      <p>Signing you in…</p>
    </div>
  `,
  styles: [`
    .callback-page { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 1rem; }
  `],
})
export class AuthCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStore);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.router.navigate(['/auth/login']);
      return;
    }

    // Remove token from URL to prevent history/referrer leaks
    window.history.replaceState({}, '', '/auth/callback');

    this.authStore.setAccessToken(token);
    this.authStore.loadCurrentUser().then(() => {
      this.router.navigate(['/dashboard']);
    });
  }
}
