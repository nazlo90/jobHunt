import { Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { UserCvService } from '@core/services/user-cv.service';
import { ToastService } from '@core/services/toast.service';
import { UserCv } from '@core/models/user-cv.model';
import { CvPreviewDialogComponent } from '@shared/cv-preview-dialog/cv-preview-dialog.component';
import * as pdfjsLib from 'pdfjs-dist';

type PdfItem = { str: string; x: number; y: number; w: number };

const PDF_FIXES: [RegExp, string][] = [
  [/CORESKILLS/g, 'CORE SKILLS'],
  [/TECHNICALSKILLS/g, 'TECHNICAL SKILLS'],
  [/KEYSKILLS/g, 'KEY SKILLS'],
  [/WORKEXPERIENCE/g, 'WORK EXPERIENCE'],
  [/PROFESSIONALEXPERIENCE/g, 'PROFESSIONAL EXPERIENCE'],
  [/EMPLOYMENTHISTORY/g, 'EMPLOYMENT HISTORY'],
];

const PDF_SECTION_NAMES = [
  'EMPLOYMENT HISTORY', 'WORK EXPERIENCE', 'PROFESSIONAL EXPERIENCE',
  'CORE SKILLS', 'TECHNICAL SKILLS', 'KEY SKILLS',
  'PROFILE', 'SUMMARY', 'OBJECTIVE', 'LINKS',
  'SKILLS', 'TECHNOLOGIES', 'LANGUAGES',
  'EXPERIENCE', 'EMPLOYMENT',
  'EDUCATION', 'QUALIFICATIONS',
  'COURSES', 'CERTIFICATIONS', 'ACHIEVEMENTS', 'PROJECTS',
].sort((a, b) => b.length - a.length);

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

@Component({
  selector: 'app-cv-manager',
  imports: [
    FormsModule, MatButtonModule, MatIconModule, MatListModule,
    MatInputModule, MatFormFieldModule, MatProgressSpinnerModule, MatTooltipModule,
  ],
  template: `
    <div class="flex flex-col gap-4">

      <!-- Upload row -->
      <div class="flex items-center gap-3 flex-wrap">
        <input #cvFileInput type="file" accept=".pdf" class="hidden"
               (change)="onFileSelected($event)">
        <mat-form-field appearance="outline" class="w-64">
          <mat-label>CV name</mat-label>
          <input matInput [(ngModel)]="newCvName" placeholder="e.g. Senior Frontend CV">
        </mat-form-field>
        <button mat-stroked-button (click)="cvFileInput.click()" [disabled]="uploading()">
          @if (uploading()) {
            <span class="flex items-center gap-1.5">
              <mat-spinner diameter="18"></mat-spinner>Uploading…
            </span>
          } @else {
            <span class="flex items-center gap-1.5">
              <mat-icon>upload_file</mat-icon>Upload PDF
            </span>
          }
        </button>
      </div>
      <p class="text-xs text-slate-400 -mt-2">Give the CV a name, then click "Upload PDF" to select a file.</p>

      <!-- CV list -->
      @if (cvs().length) {
        <div class="border border-slate-200 rounded-lg overflow-hidden">
          <mat-list class="!p-0">
            @for (cv of cvs(); track cv.id) {
              <mat-list-item>
                <mat-icon matListItemIcon>description</mat-icon>
                <span matListItemTitle>{{ cv.name }}</span>
                <span matListItemLine class="text-[11px] text-slate-400">{{ cv.filename }}</span>
                <div matListItemMeta class="flex items-center">
                  <button mat-icon-button (click)="previewCv(cv)" matTooltip="Preview CV">
                    <mat-icon>visibility</mat-icon>
                  </button>
                  <button mat-icon-button (click)="deleteCv(cv.id)" matTooltip="Delete CV">
                    <mat-icon class="!text-red-500">delete</mat-icon>
                  </button>
                </div>
              </mat-list-item>
            }
          </mat-list>
        </div>
      } @else {
        <p class="text-sm text-slate-400 italic">No CVs uploaded yet.</p>
      }
    </div>
  `,
})
export class CvManagerComponent implements OnInit {
  private readonly userCvSvc = inject(UserCvService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly cvs = signal<UserCv[]>([]);
  readonly uploading = signal(false);
  newCvName = '';

  ngOnInit() {
    this.userCvSvc.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ cvs }) => this.cvs.set(cvs),
    });
  }

  previewCv(cv: UserCv) {
    this.dialog.open(CvPreviewDialogComponent, {
      data: { fileUrl: this.userCvSvc.fileUrl(cv.id), title: cv.name },
      width: '960px',
      maxWidth: '95vw',
      height: '90vh',
      panelClass: 'cv-preview-dialog-panel',
    });
  }

  deleteCv(id: number) {
    this.userCvSvc.remove(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.cvs.update(list => list.filter(c => c.id !== id));
        this.toast.success('CV deleted');
      },
    });
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const name = this.newCvName.trim() || file.name.replace(/\.pdf$/i, '');
    this.uploading.set(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const cvText = await this.extractTextFromPdf(arrayBuffer);
      this.userCvSvc.create(name, cvText, file).subscribe({
        next: ({ cv }) => {
          this.cvs.update(list => [cv, ...list]);
          this.newCvName = '';
          this.toast.success('CV uploaded');
        },
        complete: () => this.uploading.set(false),
      });
    } catch (err) {
      console.error('PDF parse error:', err);
      this.toast.error('Failed to parse PDF');
      this.uploading.set(false);
    }
    input.value = '';
  }

  private async extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();

      const items: PdfItem[] = (content.items as Array<{ str?: string; transform?: number[]; width?: number }>)
        .filter(it => it.str?.trim())
        .map(it => ({
          str: it.str!,
          x: it.transform?.[4] ?? 0,
          y: Math.round((it.transform?.[5] ?? 0) / 3) * 3,
          w: it.width ?? 0,
        }));

      const byY = new Map<number, PdfItem[]>();
      for (const it of items) {
        if (!byY.has(it.y)) byY.set(it.y, []);
        byY.get(it.y)!.push(it);
      }

      const sortedY = Array.from(byY.keys()).sort((a, b) => b - a);
      const lines: string[] = [];
      for (const y of sortedY) {
        const lineItems = byY.get(y)!.sort((a, b) => a.x - b.x);
        let line = '';
        for (let j = 0; j < lineItems.length; j++) {
          if (j === 0) {
            line = lineItems[j].str;
          } else {
            const prev = lineItems[j - 1];
            const gap = lineItems[j].x - (prev.x + prev.w);
            line += (gap > 3 ? ' ' : '') + lineItems[j].str;
          }
        }
        line = line.trim();
        if (line) lines.push(line);
      }
      pageTexts.push(lines.join('\n'));
    }

    return this.normalizePdfText(pageTexts.join('\n\n'));
  }

  private normalizePdfText(text: string): string {
    let out = text.replace(/(?:^|(?<=\n))([A-Z]{1,2} ){2,}[A-Z]{1,2}(?=\s|$)/gm, m =>
      m.replace(/ /g, ''),
    );
    for (const [re, rep] of PDF_FIXES) out = out.replace(re, rep);

    const secPat = new RegExp(`^(${PDF_SECTION_NAMES.join('|')})\\s+(.+)$`, 'gm');
    out = out.replace(secPat, '$1\n$2');
    return out.replace(/\n{3,}/g, '\n\n').trim();
  }
}
