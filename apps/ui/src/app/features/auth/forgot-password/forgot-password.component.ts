import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthStore } from '../../../core/store/auth.store';

@Component({
  selector: 'app-forgot-password',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <h1>Forgot password?</h1>
        <p class="subtitle">Enter your email and we'll send you a reset link.</p>

        @if (sent()) {
          <div class="success-msg">
            Check your inbox — if that email is registered, a reset link has been sent.
          </div>
          <a routerLink="/auth/login" mat-stroked-button>Back to sign in</a>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email" />
              @if (form.get('email')?.hasError('email')) {
                <mat-error>Enter a valid email</mat-error>
              }
            </mat-form-field>

            @if (authStore.error()) {
              <p class="error-msg">{{ authStore.error() }}</p>
            }

            <button
              mat-flat-button
              color="primary"
              type="submit"
              [disabled]="form.invalid || authStore.loading()"
            >
              @if (authStore.loading()) {
                <mat-spinner diameter="20" />
              } @else {
                Send reset link
              }
            </button>
          </form>

          <div class="auth-links">
            <a routerLink="/auth/login">Back to sign in</a>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .auth-page { display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 1rem; }
    .auth-card { width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 1rem; }
    h1 { margin: 0; font-size: 1.75rem; font-weight: 600; }
    .subtitle { margin: 0; color: #888; }
    form { display: flex; flex-direction: column; gap: 0.5rem; }
    mat-form-field { width: 100%; }
    button[type=submit] { width: 100%; height: 44px; }
    .error-msg { color: #f44336; font-size: 0.875rem; margin: 0; }
    .success-msg { padding: 1rem; background: #e8f5e9; border-radius: 8px; color: #2e7d32; }
    .auth-links { text-align: center; font-size: 0.875rem; }
    .auth-links a { color: var(--mat-sys-primary, #6750a4); text-decoration: none; font-weight: 500; }
    .auth-links a:hover { text-decoration: underline; }
  `],
})
export class ForgotPasswordComponent implements OnInit {
  protected readonly authStore = inject(AuthStore);
  protected readonly sent = signal(false);

  ngOnInit(): void {
    this.authStore.clearError();
  }

  protected readonly form = inject(FormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) return;
    const ok = await this.authStore.forgotPassword({ email: this.form.getRawValue().email! });
    if (ok) this.sent.set(true);
  }
}
