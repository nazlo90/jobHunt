import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthStore } from '../../../core/store/auth.store';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <h1>Sign in</h1>

        <a mat-stroked-button class="google-btn" [href]="googleUrl">
          Continue with Google
        </a>

        <div class="divider"><span>or</span></div>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" />
            @if (form.get('email')?.hasError('email')) {
              <mat-error>Enter a valid email</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input
              matInput
              [type]="showPwd() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="current-password"
            />
            <button mat-icon-button matSuffix type="button" (click)="showPwd.set(!showPwd())">
              <mat-icon>{{ showPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
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
              Sign in
            }
          </button>
        </form>

        <div class="auth-links">
          <a routerLink="/auth/forgot-password">Forgot password?</a>
          <span>·</span>
          <a routerLink="/auth/register">Create account</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page { display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 1rem; }
    .auth-card { width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 1rem; }
    h1 { margin: 0 0 0.5rem; font-size: 1.75rem; font-weight: 600; }
    .google-btn { width: 100%; justify-content: center; gap: 0.5rem; }
    .divider { display: flex; align-items: center; gap: 1rem; color: #888; }
    .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: currentColor; }
    form { display: flex; flex-direction: column; gap: 0.5rem; }
    mat-form-field { width: 100%; }
    button[type=submit] { width: 100%; height: 44px; }
    .error-msg { color: #f44336; font-size: 0.875rem; margin: 0; }
    .auth-links { display: flex; gap: 0.5rem; justify-content: center; font-size: 0.875rem; }
    .auth-links a { color: var(--mat-sys-primary, #6750a4); text-decoration: none; font-weight: 500; }
    .auth-links a:hover { text-decoration: underline; }
  `],
})
export class LoginComponent implements OnInit {
  protected readonly authStore = inject(AuthStore);
  protected readonly showPwd = signal(false);

  ngOnInit(): void {
    this.authStore.clearError();
  }
  protected readonly googleUrl = `${environment.apiBaseUrl}/auth/google`;

  protected readonly form = inject(FormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected submit(): void {
    if (this.form.invalid) return;
    const { email, password } = this.form.getRawValue();
    this.authStore.login({ email: email!, password: password! });
  }
}
