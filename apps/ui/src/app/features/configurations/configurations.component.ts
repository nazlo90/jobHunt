import { Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ScraperProfileService } from '@core/services/scraper-profile.service';
import { ToastService } from '@core/services/toast.service';
import { ScraperProfile } from '@core/models/scraper-profile.model';
import { CvManagerComponent } from '../settings/components/cv-manager.component';
import { ProfileSelectorComponent } from '../settings/components/profile-selector.component';
import { ScraperFormComponent } from '../settings/components/scraper-form.component';

@Component({
  selector: 'app-configurations',
  imports: [
    MatTabsModule, MatProgressSpinnerModule,
    CvManagerComponent, ProfileSelectorComponent, ScraperFormComponent,
  ],
  template: `
    <div>
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-slate-900 m-0">Configurations</h1>
        <p class="text-sm text-slate-500 mt-1">Manage your CVs and configure the job scraper.</p>
      </div>

      <mat-tab-group animationDuration="150ms" class="configs-tabs" [selectedIndex]="activeTab()">

        <!-- ── Tab 1: My CVs ── -->
        <mat-tab label="My CVs">
          <div class="py-5">
            <p class="text-sm text-slate-500 mb-6">
              Upload your CV as a PDF. The CV Adapter uses it to generate tailored applications for each job.
              You can upload multiple CVs (e.g. one per role type) and choose which to use per job.
            </p>
            <app-cv-manager />
          </div>
        </mat-tab>

        <!-- ── Tab 2: Scraper Profiles ── -->
        <mat-tab label="Scraper Profiles">
          <div class="py-5">
            <p class="text-sm text-slate-500 mb-6">
              Profiles let you save different search configurations — e.g. one for frontend roles, another for fullstack.
              Selecting a profile makes it active; the scraper always uses the active profile.
            </p>

            @if (profilesLoading()) {
              <div class="flex justify-center py-10">
                <mat-spinner diameter="32" />
              </div>
            } @else {
              <app-profile-selector
                [profiles]="profiles()"
                [selected]="selectedProfile()"
                [activating]="activating()"
                (profileSelected)="selectAndActivate($event)"
                (newProfile)="promptNewProfile()"
                (duplicateProfile)="promptDuplicateProfile()"
                (renameProfile)="promptRenameProfile()"
                (deleteProfile)="deleteProfile()" />

              @if (selectedProfile()) {
                <div class="mt-5">
                  <app-scraper-form
                    [profile]="selectedProfile()!"
                    (profileUpdated)="onProfileUpdated($event)" />
                </div>
              }
            }
          </div>
        </mat-tab>

      </mat-tab-group>
    </div>
  `,
  styles: [`
    :host ::ng-deep .configs-tabs {
      .mat-mdc-tab-body-wrapper { padding-top: 0; }
      .mat-mdc-tab-body-content { overflow-x: hidden; }
    }
  `],
})
export class ConfigurationsComponent implements OnInit {
  private readonly profileSvc = inject(ScraperProfileService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);

  readonly profiles = signal<ScraperProfile[]>([]);
  readonly selectedProfile = signal<ScraperProfile | null>(null);
  readonly profilesLoading = signal(true);
  readonly activating = signal(false);
  readonly activeTab = signal(0);

  ngOnInit() {
    // Read ?tab=scraper to open the Scraper Profiles tab directly
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'scraper') this.activeTab.set(1);

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

  /** Selecting a profile immediately activates it */
  selectAndActivate(id: number) {
    const profile = this.profiles().find(p => p.id === id);
    if (!profile || profile.isActive) {
      if (profile) this.selectedProfile.set(profile);
      return;
    }
    this.activating.set(true);
    this.profileSvc.activate(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
        this.selectAndActivate(profile.id);
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
