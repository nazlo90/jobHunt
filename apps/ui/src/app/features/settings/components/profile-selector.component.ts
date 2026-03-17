import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ScraperProfile } from '@core/models/scraper-profile.model';

@Component({
  selector: 'app-profile-selector',
  imports: [
    MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule,
    MatMenuModule, MatDividerModule, MatProgressSpinnerModule, MatTooltipModule,
  ],
  template: `
    <div class="flex items-center gap-3 flex-wrap">

      <!-- Profile dropdown -->
      <mat-form-field appearance="outline" class="w-64 !mb-[-20px]">
        <mat-label>Profile</mat-label>
        <mat-select [value]="selected()?.id" (selectionChange)="profileSelected.emit($event.value)">
          @for (p of profiles(); track p.id) {
            <mat-option [value]="p.id">
              <span class="flex items-center gap-1.5">
                {{ p.name }}
                @if (p.isActive) {
                  <span class="text-emerald-600 text-[10px]" matTooltip="Active profile">●</span>
                }
              </span>
            </mat-option>
          }
        </mat-select>
      </mat-form-field>

      <!-- Active badge / Activate button -->
      @if (selected()?.isActive) {
        <span class="inline-flex items-center gap-1 text-[13px] font-semibold text-emerald-700
                      bg-emerald-50 rounded-full px-3 py-1"
              matTooltip="This profile is used when you run the scraper">
          <mat-icon class="!text-base">check_circle</mat-icon>
          Active
        </span>
      } @else {
        <button mat-stroked-button color="primary" (click)="activateClicked.emit()" [disabled]="activating()">
          @if (activating()) { <mat-spinner diameter="16" /> } @else { Set as Active }
        </button>
      }

      <span class="flex-1"></span>

      <!-- Actions menu -->
      <button mat-icon-button [matMenuTriggerFor]="profileMenu" matTooltip="Profile actions">
        <mat-icon>more_vert</mat-icon>
      </button>
      <mat-menu #profileMenu="matMenu">
        <button mat-menu-item (click)="newProfile.emit()">
          <mat-icon>add</mat-icon> New profile
        </button>
        <button mat-menu-item (click)="duplicateProfile.emit()">
          <mat-icon>content_copy</mat-icon> Duplicate current
        </button>
        <button mat-menu-item (click)="renameProfile.emit()"
                [disabled]="selected()?.name === 'Default'">
          <mat-icon>drive_file_rename_outline</mat-icon> Rename current
        </button>
        <mat-divider />
        <button mat-menu-item (click)="deleteProfile.emit()"
                [disabled]="profiles().length <= 1 || selected()?.isActive">
          <mat-icon class="!text-red-500">delete</mat-icon> Delete current
        </button>
      </mat-menu>
    </div>
  `,
})
export class ProfileSelectorComponent {
  readonly profiles = input.required<ScraperProfile[]>();
  readonly selected = input<ScraperProfile | null>(null);
  readonly activating = input(false);

  readonly profileSelected = output<number>();
  readonly activateClicked = output<void>();
  readonly newProfile = output<void>();
  readonly duplicateProfile = output<void>();
  readonly renameProfile = output<void>();
  readonly deleteProfile = output<void>();
}
