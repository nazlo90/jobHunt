import { Component, OnInit, inject, signal, input, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { JobsStore } from '@core/store/jobs.store';
import { JobsService } from '@core/services/jobs.service';
import { UserCvService } from '@core/services/user-cv.service';
import { ToastService } from '@core/services/toast.service';
import { Job } from '@core/models/job.model';
import { UserCv } from '@core/models/user-cv.model';
import { JobDetailFormComponent } from './components/job-detail-form.component';
import { JobReviewComponent } from './components/job-review.component';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule, MatIconModule, MatTabsModule, MatProgressSpinnerModule,
    JobDetailFormComponent, JobReviewComponent,
  ],
  template: `
    <div class="w-full">
      @if (job(); as j) {

        <!-- Header card -->
        <div class="flex items-center gap-3 mb-6 bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <button mat-icon-button routerLink="/jobs" class="text-slate-500 flex-shrink-0">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="flex-1 min-w-0">
            <h1 class="m-0 text-xl font-bold text-slate-900 truncate">{{ j.company }}</h1>
            <p class="m-0 mt-0.5 text-sm text-slate-500 truncate">{{ j.role }}</p>
          </div>
          @if (j.url) {
            <a mat-stroked-button [href]="j.url" target="_blank" class="flex-shrink-0">
              <span class="flex items-center gap-1"><mat-icon>open_in_new</mat-icon>Open Job</span>
            </a>
          }
          <button mat-icon-button (click)="deleteJob(j.id)" matTooltip="Delete job">
            <mat-icon class="!text-red-500">delete</mat-icon>
          </button>
        </div>

        <!-- Tabs -->
        <mat-tab-group>
          <mat-tab label="Details">
            <app-job-detail-form [job]="j" (saved)="onSave(j.id, $event)" />
          </mat-tab>
          <mat-tab label="Review Job">
            <app-job-review [jobId]="j.id" [userCvs]="userCvs()" />
          </mat-tab>
        </mat-tab-group>

      } @else {
        <div class="flex justify-center py-16">
          <mat-spinner></mat-spinner>
        </div>
      }
    </div>
  `,
})
export class JobDetailComponent implements OnInit {
  readonly id = input.required<string>();

  private readonly store = inject(JobsStore);
  private readonly jobsSvc = inject(JobsService);
  private readonly userCvSvc = inject(UserCvService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly job = signal<Job | null>(null);
  readonly userCvs = signal<UserCv[]>([]);

  ngOnInit() {
    this.jobsSvc.getJob(Number(this.id())).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ job }) => this.job.set(job));

    this.userCvSvc.list().pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ cvs }) => this.userCvs.set(cvs));
  }

  onSave(id: number, changes: Partial<Job>) {
    this.store.updateJob(id, changes);
    this.job.update(j => j ? { ...j, ...changes } : j);
    this.toast.success('Job updated');
  }

  deleteJob(id: number) {
    if (confirm('Delete this job?')) {
      this.store.deleteJob(id);
      this.router.navigate(['/jobs']);
    }
  }
}
