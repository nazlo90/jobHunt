import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href;

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

function normalizePdfText(text: string): string {
  let out = text.replace(/(?:^|(?<=\n))([A-Z]{1,2} ){2,}[A-Z]{1,2}(?=\s|$)/gm, m =>
    m.replace(/ /g, ''),
  );
  for (const [re, rep] of PDF_FIXES) out = out.replace(re, rep);

  const secPat = new RegExp(`^(${PDF_SECTION_NAMES.join('|')})\\s+(.+)$`, 'gm');
  out = out.replace(secPat, '$1\n$2');
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

export async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
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

  return normalizePdfText(pageTexts.join('\n\n'));
}
