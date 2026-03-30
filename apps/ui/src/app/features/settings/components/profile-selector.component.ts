import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { ScraperProfile } from '@core/models/scraper-profile.model';

@Component({
  selector: 'app-profile-selector',
  imports: [
    MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule,
    MatMenuModule, MatDividerModule, MatProgressSpinnerModule, MatTooltipModule,
  ],
  template: `
    <div class="flex items-center gap-3 flex-wrap overflow-hidden pt-4">

      <!-- Profile dropdown — selecting activates immediately -->
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-64">
        <mat-label>Active Profile</mat-label>
        <mat-select [value]="selected()?.id" (selectionChange)="profileSelected.emit($event.value)"
                    [disabled]="activating()">
          @for (p of profiles(); track p.id) {
            <mat-option [value]="p.id">{{ p.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      @if (activating()) {
        <mat-spinner diameter="20" />
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
        <button mat-menu-item (click)="renameProfile.emit()">
          <mat-icon>drive_file_rename_outline</mat-icon> Rename current
        </button>
        <mat-divider />
        <button mat-menu-item (click)="deleteProfile.emit()"
                [disabled]="profiles().length <= 1">
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
  readonly newProfile = output<void>();
  readonly duplicateProfile = output<void>();
  readonly renameProfile = output<void>();
  readonly deleteProfile = output<void>();
}
