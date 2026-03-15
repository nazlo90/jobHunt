import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string, duration = 3000): void {
    this.snackBar.open(message, undefined, {
      duration,
      panelClass: 'toast-success',
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
    });
  }

  error(message: string, duration = 5000): void {
    this.snackBar.open(message, 'Dismiss', {
      duration,
      panelClass: 'toast-error',
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
    });
  }

  info(message: string, duration = 3000): void {
    this.snackBar.open(message, undefined, {
      duration,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
    });
  }
}
