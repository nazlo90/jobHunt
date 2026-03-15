import { Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ScraperProfileService } from '@core/services/scraper-profile.service';
import { ToastService } from '@core/services/toast.service';
import { ScraperProfile } from '@core/models/scraper-profile.model';
import { CvManagerComponent } from './components/cv-manager.component';
import { ProfileSelectorComponent } from './components/profile-selector.component';
import { ScraperFormComponent } from './components/scraper-form.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    MatCardModule, MatDividerModule, MatProgressSpinnerModule,
    CvManagerComponent, ProfileSelectorComponent, ScraperFormComponent,
  ],
  template: `
    <div>

      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-slate-900 m-0">Settings</h1>
        <p class="text-sm text-slate-500 mt-1">Manage your CVs and configure the job scraper.</p>
      </div>

      <!-- My CVs -->
      <mat-card class="mb-5">
        <mat-card-header>
          <mat-card-title>My CVs</mat-card-title>
          <mat-card-subtitle>Upload PDF CVs to use in the CV Adapter.</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="!pt-3">
          <app-cv-manager />
        </mat-card-content>
      </mat-card>

      <mat-divider class="!my-6" />

      <!-- Scraper Profiles -->
      <mat-card class="mb-5">
        <mat-card-header>
          <mat-card-title>Scraper Profiles</mat-card-title>
          <mat-card-subtitle>
            Each profile has its own search terms, keywords, and filters.
            The active profile is used when you run the scraper.
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="!pt-4">
          @if (profilesLoading()) {
            <div class="flex justify-center py-8">
              <mat-spinner diameter="32" />
            </div>
          } @else {
            <app-profile-selector
              [profiles]="profiles()"
              [selected]="selectedProfile()"
              [activating]="activating()"
              (profileSelected)="selectProfile($event)"
              (activateClicked)="activateProfile()"
              (newProfile)="promptNewProfile()"
              (duplicateProfile)="promptDuplicateProfile()"
              (renameProfile)="promptRenameProfile()"
              (deleteProfile)="deleteProfile()" />
          }
        </mat-card-content>
      </mat-card>

      <!-- Scraper Form (per profile) -->
      @if (!profilesLoading() && selectedProfile()) {
        <app-scraper-form
          [profile]="selectedProfile()!"
          (profileUpdated)="onProfileUpdated($event)" />
      }
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  private readonly profileSvc = inject(ScraperProfileService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly profiles = signal<ScraperProfile[]>([]);
  readonly selectedProfile = signal<ScraperProfile | null>(null);
  readonly profilesLoading = signal(true);
  readonly activating = signal(false);

  ngOnInit() {
    this.loadProfiles();
  }

  private loadProfiles() {
    this.profileSvc.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ profiles }) => {
        this.profiles.set(profiles);
        const active = profiles.find(p => p.isActive) ?? profiles[0] ?? null;
        if (active) this.selectedProfile.set(active);
        this.profilesLoading.set(false);
      },
      error: () => this.profilesLoading.set(false),
    });
  }

  selectProfile(id: number) {
    const profile = this.profiles().find(p => p.id === id);
    if (profile) this.selectedProfile.set(profile);
  }

  activateProfile() {
    const profile = this.selectedProfile();
    if (!profile) return;
    this.activating.set(true);
    this.profileSvc.activate(profile.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ profile: updated }) => {
        this.profiles.update(list => list.map(p => ({ ...p, isActive: p.id === updated.id })));
        this.selectedProfile.set(updated);
        this.toast.success(`"${updated.name}" is now active`);
        this.activating.set(false);
      },
      error: () => this.activating.set(false),
    });
  }

  promptNewProfile() {
    const name = prompt('Profile name:');
    if (!name?.trim()) return;
    this.profileSvc.create(name.trim()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ profile }) => {
        this.profiles.update(list => [...list, profile]);
        this.selectedProfile.set(profile);
        this.toast.success(`Profile "${profile.name}" created`);
      },
    });
  }

  promptRenameProfile() {
    const profile = this.selectedProfile();
    if (!profile) return;
    const name = prompt('New profile name:', profile.name);
    if (!name?.trim() || name.trim() === profile.name) return;
    this.profileSvc.update(profile.id, { name: name.trim() }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ profile: updated }) => {
        this.profiles.update(list => list.map(p => p.id === updated.id ? updated : p));
        this.selectedProfile.set(updated);
        this.toast.success(`Profile renamed to "${updated.name}"`);
      },
    });
  }

  promptDuplicateProfile() {
    const profile = this.selectedProfile();
    if (!profile) return;
    const name = prompt('Name for the duplicate:', `${profile.name} (copy)`);
    if (!name?.trim()) return;
    this.profileSvc.duplicate(profile.id, name.trim()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ profile: copy }) => {
        this.profiles.update(list => [...list, copy]);
        this.selectedProfile.set(copy);
        this.toast.success(`Profile "${copy.name}" created`);
      },
    });
  }

  deleteProfile() {
    const profile = this.selectedProfile();
    if (!profile) return;
    if (!confirm(`Delete profile "${profile.name}"? This cannot be undone.`)) return;
    this.profileSvc.delete(profile.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        const remaining = this.profiles().filter(p => p.id !== profile.id);
        this.profiles.set(remaining);
        const next = remaining.find(p => p.isActive) ?? remaining[0] ?? null;
        this.selectedProfile.set(next);
        this.toast.success('Profile deleted');
      },
    });
  }

  onProfileUpdated(updated: ScraperProfile) {
    this.profiles.update(list => list.map(p => p.id === updated.id ? updated : p));
    this.selectedProfile.set(updated);
  }
}
