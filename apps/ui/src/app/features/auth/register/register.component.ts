import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthStore } from '../../../core/store/auth.store';
import { environment } from '../../../../environments/environment';

function passwordMatchValidator(ctrl: AbstractControl): ValidationErrors | null {
  const pwd = ctrl.get('password')?.value as string;
  const confirm = ctrl.get('confirmPassword')?.value as string;
  return pwd && confirm && pwd !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-register',
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
        <h1>Create account</h1>

        <a mat-stroked-button class="google-btn" [href]="googleUrl">
          <mat-icon>open_in_new</mat-icon>
          Sign up with Google
        </a>

        <div class="divider"><span>or</span></div>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>Name (optional)</mat-label>
            <input matInput formControlName="name" autocomplete="name" />
          </mat-form-field>

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
            <mat-label>Confirm password</mat-label>
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
              Create account
            }
          </button>
        </form>

        <div class="auth-links">
          Already have an account? <a routerLink="/auth/login">Sign in</a>
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
    .auth-links { text-align: center; font-size: 0.875rem; }
    .auth-links a { color: var(--mat-sys-primary, #6750a4); text-decoration: none; font-weight: 500; }
    .auth-links a:hover { text-decoration: underline; }
  `],
})
export class RegisterComponent implements OnInit {
  protected readonly authStore = inject(AuthStore);
  protected readonly showPwd = signal(false);

  ngOnInit(): void {
    this.authStore.clearError();
  }
  protected readonly googleUrl = `${environment.apiBaseUrl}/auth/google`;

  protected readonly form = inject(FormBuilder).group(
    {
      name: [''],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator },
  );

  protected submit(): void {
    if (this.form.invalid) return;
    const { email, password, name } = this.form.getRawValue();
    this.authStore.register({ email: email!, password: password!, name: name || undefined });
  }
}
