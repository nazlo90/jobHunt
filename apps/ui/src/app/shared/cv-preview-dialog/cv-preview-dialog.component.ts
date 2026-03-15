import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface CvPreviewDialogData {
  /** URL to the raw PDF file — used for stored CVs. */
  fileUrl?: string;
  /** Pre-built HTML string — used for AI-generated adapted CVs. */
  html?: string;
  /** Dialog title shown in the toolbar. */
  title: string;
}

@Component({
  selector: 'app-cv-preview-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="dlg-toolbar">
      <span class="dlg-title">{{ data.title }}</span>
      <div class="dlg-actions">
        @if (data.fileUrl) {
          <a mat-flat-button color="accent" [href]="data.fileUrl" target="_blank" download matTooltip="Download PDF">
            <span class="btn-row"><mat-icon>download</mat-icon>Download PDF</span>
          </a>
        } @else {
          <button mat-flat-button color="accent" (click)="print()" matTooltip="Open print dialog — choose 'Save as PDF'">
            <span class="btn-row"><mat-icon>print</mat-icon>Save as PDF</span>
          </button>
        }
        <button mat-icon-button (click)="close()" matTooltip="Close">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    </div>
    <div class="dlg-body">
      @if (data.fileUrl) {
        <iframe class="preview-frame" [src]="safeUrl!" title="CV Preview"></iframe>
      } @else {
        <iframe class="preview-frame" [srcdoc]="safeHtml!" title="CV Preview"></iframe>
      }
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }
    .dlg-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      border-bottom: 1px solid #e0e0e0;
      background: #fff;
      flex-shrink: 0;
      min-height: 56px;
    }
    .dlg-title {
      font-size: 15px;
      font-weight: 600;
      color: #1a1a2e;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .dlg-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
      margin-left: 16px;
    }
    .btn-row {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .dlg-body {
      flex: 1;
      overflow: hidden;
      background: #e8eaf6;
    }
    .preview-frame {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }
  `],
})
export class CvPreviewDialogComponent {
  readonly data = inject<CvPreviewDialogData>(MAT_DIALOG_DATA);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly dialogRef = inject(MatDialogRef<CvPreviewDialogComponent>);

  readonly safeUrl: SafeResourceUrl | null = this.data.fileUrl
    ? this.sanitizer.bypassSecurityTrustResourceUrl(this.data.fileUrl)
    : null;

  readonly safeHtml: SafeHtml | null = this.data.html
    ? this.sanitizer.bypassSecurityTrustHtml(this.data.html)
    : null;

  print() {
    if (!this.data.html) return;
    const blob = new Blob([this.data.html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) return;
    win.addEventListener('load', () => { URL.revokeObjectURL(url); setTimeout(() => win.print(), 200); });
  }

  close() {
    this.dialogRef.close();
  }
}
