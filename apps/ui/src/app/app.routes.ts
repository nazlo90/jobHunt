import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'jobs',
    loadComponent: () =>
      import('./features/jobs/jobs-list/jobs-list.component').then((m) => m.JobsListComponent),
  },
  {
    path: 'jobs/:id',
    loadComponent: () =>
      import('./features/jobs/job-detail/job-detail.component').then((m) => m.JobDetailComponent),
  },
];
