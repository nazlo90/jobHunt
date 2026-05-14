import { Component, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LinkedInService } from '@core/services/linkedin.service';
import { ToastService } from '@core/services/toast.service';
import { CommentVariants, PostVariant, WRITE_CATEGORIES } from '@core/models/linkedin.model';

@Component({
  selector: 'app-linkedin',
  imports: [
    FormsModule,
    MatTabsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatChipsModule,
    MatProgressSpinnerModule, MatTooltipModule,
  ],
  template: `
    <div>
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-slate-900 m-0">LinkedIn</h1>
        <p class="text-sm text-slate-500 mt-1">Generate comments, write post drafts, and craft recruiter DMs.</p>
      </div>

      <mat-tab-group
        animationDuration="150ms"
        class="linkedin-tabs"
        [selectedIndex]="activeTab()"
        (selectedIndexChange)="activeTab.set($event)"
      >

        <!-- ── Tab 1: Comments ── -->
        <mat-tab label="Comments">
          <div class="py-5 max-w-2xl">
            <p class="text-sm text-slate-500 mb-5">
              Paste a LinkedIn post to generate 5 comment variants — punchy, question, insight, experience, and challenge.
            </p>

            <mat-form-field appearance="outline" class="w-full mb-3">
              <mat-label>Post text</mat-label>
              <textarea matInput [(ngModel)]="commentPostText" rows="5" placeholder="Paste the LinkedIn post content here…"></textarea>
            </mat-form-field>

            <div class="flex gap-3 mb-5">
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Author name (optional)</mat-label>
                <input matInput [(ngModel)]="commentAuthorName" placeholder="e.g. John Smith" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Author title (optional)</mat-label>
                <input matInput [(ngModel)]="commentAuthorTitle" placeholder="e.g. CTO at Acme" />
              </mat-form-field>
            </div>

            <button
              mat-flat-button
              class="!bg-violet-600 !text-white mb-6"
              [disabled]="commentsLoading() || !commentPostText.trim()"
              (click)="generateComments()"
            >
              @if (commentsLoading()) {
                <mat-spinner diameter="16" class="inline-spinner" />
                <span class="ml-2">Generating…</span>
              } @else {
                <ng-container>
                  <mat-icon>auto_awesome</mat-icon>
                  Generate Comments
                </ng-container>
              }
            </button>

            @if (comments()) {
              <div class="flex flex-col gap-4">
                @for (variant of commentVariantList(); track variant.label) {
                  <div class="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <div class="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                      <span class="text-xs font-semibold text-slate-600 uppercase tracking-wide">{{ variant.label }}</span>
                      <button
                        mat-icon-button
                        matTooltip="Copy"
                        class="!w-7 !h-7"
                        (click)="copy(variant.text)"
                      >
                        <mat-icon class="!text-[16px]">content_copy</mat-icon>
                      </button>
                    </div>
                    <p class="px-4 py-3 text-sm text-slate-800 leading-relaxed m-0 whitespace-pre-wrap">{{ variant.text }}</p>
                  </div>
                }
              </div>
            }
          </div>
        </mat-tab>

        <!-- ── Tab 3: Write Post ── -->
        <mat-tab label="Write Post">
          <div class="py-5 max-w-2xl">
            <p class="text-sm text-slate-500 mb-5">
              Generate 2 LinkedIn post drafts in your voice — pick a category and optionally seed with an idea.
            </p>

            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Category</p>
            <mat-chip-listbox class="mb-5" [(ngModel)]="writeCategory">
              @for (cat of categories; track cat.value) {
                <mat-chip-option [value]="cat.value">{{ cat.label }}</mat-chip-option>
              }
            </mat-chip-listbox>

            <mat-form-field appearance="outline" class="w-full mb-5">
              <mat-label>Seed idea (optional)</mat-label>
              <textarea matInput [(ngModel)]="writeSeedIdea" rows="2" placeholder="e.g. Angular signals reduced our re-renders by 60%…"></textarea>
            </mat-form-field>

            <button
              mat-flat-button
              class="!bg-violet-600 !text-white mb-6"
              [disabled]="writeLoading() || !writeCategory"
              (click)="generatePost()"
            >
              @if (writeLoading()) {
                <mat-spinner diameter="16" class="inline-spinner" />
                <span class="ml-2">Generating…</span>
              } @else {
                <ng-container>
                  <mat-icon>edit_note</mat-icon>
                  Generate Posts
                </ng-container>
              }
            </button>

            @if (writePosts().length > 0) {
              <div class="flex flex-col gap-4">
                @for (post of writePosts(); track post.variant) {
                  <div class="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <div class="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                      <span class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Variant {{ post.variant }}</span>
                      <button
                        mat-icon-button
                        matTooltip="Copy"
                        class="!w-7 !h-7"
                        (click)="copy(post.text)"
                      >
                        <mat-icon class="!text-[16px]">content_copy</mat-icon>
                      </button>
                    </div>
                    <p class="px-4 py-3 text-sm text-slate-800 leading-relaxed m-0 whitespace-pre-wrap">{{ post.text }}</p>
                  </div>
                }
              </div>
            }
          </div>
        </mat-tab>

        <!-- ── Tab 4: DM Generator ── -->
        <mat-tab label="DM Generator">
          <div class="py-5 max-w-lg">
            <p class="text-sm text-slate-500 mb-5">
              Generate a direct, confident recruiter DM under 150 words — personalized to the company and role.
            </p>

            <div class="flex flex-col gap-4 mb-5">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Recruiter name</mat-label>
                <input matInput [(ngModel)]="dmRecruiterName" placeholder="e.g. Sarah" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Company</mat-label>
                <input matInput [(ngModel)]="dmCompany" placeholder="e.g. Stripe" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Role title</mat-label>
                <input matInput [(ngModel)]="dmRoleTitle" placeholder="e.g. Senior Frontend Engineer" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Why this company (optional)</mat-label>
                <textarea matInput [(ngModel)]="dmCompanyNote" rows="2" placeholder="e.g. You're rebuilding the dashboard in Angular 21 and I've done exactly this at scale"></textarea>
              </mat-form-field>
            </div>

            <button
              mat-flat-button
              class="!bg-violet-600 !text-white mb-6"
              [disabled]="dmLoading() || !dmRecruiterName.trim() || !dmCompany.trim() || !dmRoleTitle.trim()"
              (click)="generateDM()"
            >
              @if (dmLoading()) {
                <mat-spinner diameter="16" class="inline-spinner" />
                <span class="ml-2">Generating…</span>
              } @else {
                <ng-container>
                  <mat-icon>send</mat-icon>
                  Generate DM
                </ng-container>
              }
            </button>

            @if (dmResult()) {
              <div class="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div class="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                  <span class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Your DM</span>
                  <button
                    mat-icon-button
                    matTooltip="Copy"
                    class="!w-7 !h-7"
                    (click)="copy(dmResult()!)"
                  >
                    <mat-icon class="!text-[16px]">content_copy</mat-icon>
                  </button>
                </div>
                <p class="px-4 py-3 text-sm text-slate-800 leading-relaxed m-0 whitespace-pre-wrap">{{ dmResult() }}</p>
              </div>
            }
          </div>
        </mat-tab>

      </mat-tab-group>
    </div>
  `,
  styles: [`
    :host ::ng-deep .linkedin-tabs {
      .mat-mdc-tab-body-wrapper { padding-top: 0; }
      .mat-mdc-tab-body-content { overflow-x: hidden; }
    }
    :host ::ng-deep .inline-spinner circle { stroke: white; }
  `],
})
export class LinkedInComponent {
  private readonly svc = inject(LinkedInService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly categories = WRITE_CATEGORIES;

  readonly activeTab = signal(0);

  // Comments tab
  commentPostText = '';
  commentAuthorName = '';
  commentAuthorTitle = '';
  readonly comments = signal<CommentVariants | null>(null);
  readonly commentsLoading = signal(false);

  readonly commentVariantList = () => {
    const c = this.comments();
    if (!c) return [];
    return [
      { label: 'Punchy', text: c.punchy },
      { label: 'Question', text: c.question },
      { label: 'Insight', text: c.insight },
      { label: 'Experience', text: c.experience },
      { label: 'Challenge', text: c.challenge },
    ];
  };

  // Write tab
  writeCategory = '';
  writeSeedIdea = '';
  readonly writePosts = signal<PostVariant[]>([]);
  readonly writeLoading = signal(false);

  // DM tab
  dmRecruiterName = '';
  dmCompany = '';
  dmRoleTitle = '';
  dmCompanyNote = '';
  readonly dmResult = signal<string | null>(null);
  readonly dmLoading = signal(false);

  generateComments(): void {
    this.commentsLoading.set(true);
    this.svc
      .generateComment(this.commentPostText, this.commentAuthorName, this.commentAuthorTitle)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ comments }) => {
          this.comments.set(comments);
          this.commentsLoading.set(false);
        },
        error: () => {
          this.commentsLoading.set(false);
          this.toast.error('Failed to generate comments');
        },
      });
  }

  generatePost(): void {
    this.writeLoading.set(true);
    this.svc
      .generatePost(this.writeCategory, this.writeSeedIdea)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ posts }) => {
          this.writePosts.set(posts);
          this.writeLoading.set(false);
        },
        error: () => {
          this.writeLoading.set(false);
          this.toast.error('Failed to generate posts');
        },
      });
  }

  generateDM(): void {
    this.dmLoading.set(true);
    this.svc
      .generateDM(this.dmRecruiterName, this.dmCompany, this.dmRoleTitle, this.dmCompanyNote)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ dm }) => {
          this.dmResult.set(dm);
          this.dmLoading.set(false);
        },
        error: () => {
          this.dmLoading.set(false);
          this.toast.error('Failed to generate DM');
        },
      });
  }

  copy(text: string): void {
    navigator.clipboard.writeText(text).then(() => this.toast.success('Copied to clipboard'));
  }
}
