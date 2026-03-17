import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthStore } from '../../../core/store/auth.store';

function passwordMatchValidator(ctrl: AbstractControl): ValidationErrors | null {
  const pwd = ctrl.get('password')?.value as string;
  const confirm = ctrl.get('confirmPassword')?.value as string;
  return pwd && confirm && pwd !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-reset-password',
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
        <h1>Reset password</h1>

        @if (!token()) {
          <p class="error-msg">Invalid reset link. <a routerLink="/auth/forgot-password">Request a new one.</a></p>
        } @else if (done()) {
          <div class="success-msg">Password updated! You can now sign in with your new password.</div>
          <a routerLink="/auth/login" mat-flat-button color="primary">Sign in</a>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline">
              <mat-label>New password</mat-label>
              <input
                matInput
                [type]="showPwd() ? 'text' : 'password'"
                formControlName="password"
                autocomplete="new-password"
              />
              <button mat-icon-button matSuffix type="button" (click)="showPwd.set(!showPwd())">
                <mat-icon>{{ showPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.get('password')?.hasError('minlength')) {
                <mat-error>Minimum 8 characters</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Confirm new password</mat-label>
              <input
                matInput
                [type]="showPwd() ? 'text' : 'password'"
                formControlName="confirmPassword"
                autocomplete="new-password"
              />
              @if (form.hasError('passwordMismatch') && form.get('confirmPassword')?.touched) {
                <mat-error>Passwords do not match</mat-error>
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
                Reset password
              }
            </button>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    .auth-page { display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 1rem; }
    .auth-card { width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 1rem; }
    h1 { margin: 0; font-size: 1.75rem; font-weight: 600; }
    form { display: flex; flex-direction: column; gap: 0.5rem; }
    mat-form-field { width: 100%; }
    button[type=submit] { width: 100%; height: 44px; }
    .error-msg { color: #f44336; font-size: 0.875rem; margin: 0; }
    .error-msg a { color: inherit; font-weight: 500; text-decoration: none; }
    .error-msg a:hover { text-decoration: underline; }
    .success-msg { padding: 1rem; background: #e8f5e9; border-radius: 8px; color: #2e7d32; }
  `],
})
export class ResetPasswordComponent implements OnInit {
  protected readonly authStore = inject(AuthStore);
  protected readonly token = signal<string | null>(null);
  protected readonly done = signal(false);
  protected readonly showPwd = signal(false);

  private readonly route = inject(ActivatedRoute);

  protected readonly form = inject(FormBuilder).group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator },
  );

  ngOnInit(): void {
    this.token.set(this.route.snapshot.queryParamMap.get('token'));
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid || !this.token()) return;
    const ok = await this.authStore.resetPassword({
      token: this.token()!,
      password: this.form.getRawValue().password!,
    });
    if (ok) this.done.set(true);
  }
}
