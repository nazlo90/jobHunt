export interface CvPreviewDialogData {
  /** URL to the raw PDF file — used for stored CVs. */
  fileUrl?: string;
  /** Pre-built HTML string — used for AI-generated adapted CVs. */
  html?: string;
  /** Dialog title shown in the toolbar. */
  title: string;
}
