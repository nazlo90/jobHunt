/**
 * Converts a plain-text CV (in MASTER_CV format) to a styled, print-ready HTML document.
 *
 * Expected text structure:
 *   Line 1:  Full name
 *   Line 2:  Job title
 *   Line 3+: Contact info (parts separated by "|", contains @ / http / +digits)
 *   [blank line]
 *   SECTION HEADER (e.g. PROFILE, SKILLS, EXPERIENCE …)
 *     • SKILLS lines:  "Category: value, value, value"
 *     • EXPERIENCE entry: "Role | Company | Period"
 *       followed by optional "Domain: X | Stack: Y" metadata
 *       followed by "- bullet" lines
 *     • Other sections: plain paragraphs or "- bullet" lines
 */
export function buildCvHtml(text: string, title: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const SECTION_NAMES = [
    'PROFILE', 'SUMMARY', 'OBJECTIVE',
    'SKILLS', 'TECHNICAL SKILLS', 'CORE SKILLS', 'KEY SKILLS', 'TECHNOLOGIES',
    'EXPERIENCE', 'WORK EXPERIENCE', 'PROFESSIONAL EXPERIENCE', 'EMPLOYMENT',
    'EDUCATION', 'QUALIFICATIONS', 'CERTIFICATIONS', 'CERTIFICATES', 'COURSES',
    'PROJECTS', 'ACHIEVEMENTS', 'LANGUAGES', 'INTERESTS', 'HOBBIES',
  ];
  const SKILL_SECTIONS = new Set(['SKILLS', 'TECHNICAL SKILLS', 'CORE SKILLS', 'KEY SKILLS', 'TECHNOLOGIES']);
  const EXP_SECTIONS = new Set(['EXPERIENCE', 'WORK EXPERIENCE', 'PROFESSIONAL EXPERIENCE', 'EMPLOYMENT']);

  const normalized = (s: string) => s.trim().toUpperCase().replace(/:$/, '');
  const isSection = (s: string) => SECTION_NAMES.includes(normalized(s));
  const isBullet = (s: string) => /^[-•*]\s/.test(s.trim());
  const isContact = (s: string) =>
    s.includes('@') || /https?:\/\//.test(s) || /\+\d{5,}/.test(s);
  const isPipeRow = (s: string) =>
    s.includes('|') && s.split('|').length >= 2 && !isBullet(s) && !isSection(s);
  const isSkillRow = (s: string) =>
    /^[A-Za-z][A-Za-z &\/\-]+:\s+\S/.test(s.trim()) && !isSection(s);
  const isDomainMeta = (s: string) =>
    /^(Domain|Stack|Tech|Location)\s*:/i.test(s.trim());

  const lines = text.split('\n');
  let i = 0;
  const parts: string[] = [];

  // ── HEADER ──────────────────────────────────────────────────────────────────
  while (i < lines.length && !lines[i].trim()) i++;
  const name = lines[i++]?.trim() ?? '';

  while (i < lines.length && !lines[i].trim()) i++;
  const maybeTitle = lines[i]?.trim() ?? '';
  const jobTitle = !isSection(maybeTitle) && !isPipeRow(maybeTitle) ? maybeTitle : '';
  if (jobTitle) i++;

  // Gather contact lines (may span multiple lines) until first blank line or section
  const contactLines: string[] = [];
  while (i < lines.length) {
    const l = lines[i].trim();
    if (!l) { i++; break; }
    if (isSection(l)) break;
    if (isContact(l) || isPipeRow(l)) contactLines.push(l);
    i++;
  }

  const contactHtml = contactLines
    .map(c =>
      c.split('|')
        .map(p => {
          const t = p.trim();
          if (/https?:\/\//.test(t)) {
            const display = t.replace(/https?:\/\/(www\.)?/, '');
            return `<a href="${esc(t)}" target="_blank">${esc(display)}</a>`;
          }
          return esc(t);
        })
        .join(' <span class="pipe">|</span> ')
    )
    .join('<br>');

  parts.push(`
<div class="cv-header">
  <h1 class="cv-name">${esc(name)}</h1>
  ${jobTitle ? `<p class="cv-title">${esc(jobTitle)}</p>` : ''}
  ${contactHtml ? `<p class="cv-contact">${contactHtml}</p>` : ''}
</div>`);

  // ── SECTIONS ─────────────────────────────────────────────────────────────────
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { i++; continue; }

    if (!isSection(trimmed)) {
      // orphan line before first section
      parts.push(`<p class="cv-line">${esc(trimmed)}</p>`);
      i++;
      continue;
    }

    const secKey = normalized(trimmed);
    const isSkillSec = SKILL_SECTIONS.has(secKey);
    const isExpSec = EXP_SECTIONS.has(secKey);
    i++;

    let body = '';
    let inUl = false;
    let inExpEntry = false;

    while (i < lines.length && !isSection(lines[i].trim())) {
      const sl = lines[i].trim();
      i++;

      if (!sl) {
        if (inUl) { body += '</ul>'; inUl = false; }
        if (inExpEntry) { body += '</div>'; inExpEntry = false; }
        continue;
      }

      if (isBullet(sl)) {
        if (!inUl) { body += '<ul>'; inUl = true; }
        body += `<li>${esc(sl.replace(/^[-•*]\s/, ''))}</li>`;
        continue;
      }

      if (inUl) { body += '</ul>'; inUl = false; }

      if (isSkillSec && isSkillRow(sl)) {
        const colon = sl.indexOf(':');
        const cat = sl.slice(0, colon).trim();
        const vals = sl.slice(colon + 1).trim();
        body += `<div class="skills-row">
  <span class="skill-cat">${esc(cat)}:</span>
  <span class="skill-vals">${esc(vals)}</span>
</div>`;
        continue;
      }

      if (isExpSec && isDomainMeta(sl)) {
        body += `<p class="exp-meta">${esc(sl)}</p>`;
        continue;
      }

      if (isExpSec && isPipeRow(sl) && !isContact(sl)) {
        if (inExpEntry) { body += '</div>'; }
        const ps = sl.split('|').map(p => p.trim());
        body += `<div class="exp-entry">
  <div class="exp-header">
    <span class="exp-role">${esc(ps[0] ?? '')}</span>
    ${ps[1] ? `<span class="exp-company"> — ${esc(ps[1])}</span>` : ''}
    ${ps[2] ? `<span class="exp-period">${esc(ps[2])}</span>` : ''}
  </div>`;
        inExpEntry = true;
        continue;
      }

      // Pipe-separated line in non-exp sections (education entry, course entry, language)
      if (isPipeRow(sl) && !isExpSec) {
        const ps = sl.split('|').map(p => p.trim());
        body += `<div class="pipe-row">${ps.map(p => `<span>${esc(p)}</span>`).join('<span class="pipe"> | </span>')}</div>`;
        continue;
      }

      body += `<p class="cv-line">${esc(sl)}</p>`;
    }

    if (inUl) body += '</ul>';
    if (inExpEntry) body += '</div>';

    parts.push(`<div class="cv-section">
  <h2 class="section-title">${esc(secKey)}</h2>
  ${body}
</div>`);
  }

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.5;
      color: #1a1a1a;
      background: #fff;
    }
    .page {
      max-width: 800px;
      margin: 0 auto;
      padding: 44px 56px;
    }

    /* ── Header ── */
    .cv-header {
      text-align: center;
      padding-bottom: 14px;
      border-bottom: 2px solid #1a1a2e;
      margin-bottom: 20px;
    }
    .cv-name {
      font-size: 22pt;
      font-weight: 700;
      letter-spacing: 0.3px;
      color: #1a1a2e;
      margin-bottom: 3px;
    }
    .cv-title {
      font-size: 11.5pt;
      font-weight: 500;
      color: #3949ab;
      margin: 2px 0;
    }
    .cv-contact {
      font-size: 9pt;
      color: #555;
      margin-top: 6px;
    }
    .cv-contact a { color: #3949ab; text-decoration: none; }
    .pipe { color: #bbb; }

    /* ── Section title ── */
    .cv-section { margin-bottom: 18px; }
    .section-title {
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.6px;
      color: #1a1a2e;
      border-bottom: 1.5px solid #3949ab;
      padding-bottom: 3px;
      margin-bottom: 10px;
    }

    /* ── Skills ── */
    .skills-row {
      display: flex;
      align-items: baseline;
      margin: 3px 0;
      font-size: 10pt;
    }
    .skill-cat {
      font-weight: 600;
      min-width: 170px;
      flex-shrink: 0;
      color: #222;
    }
    .skill-vals { color: #444; }

    /* ── Experience ── */
    .exp-entry { margin-bottom: 14px; }
    .exp-header {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 0 4px;
      margin-bottom: 2px;
    }
    .exp-role { font-weight: 700; font-size: 10.5pt; }
    .exp-company { font-size: 10.5pt; color: #3949ab; font-weight: 500; }
    .exp-period {
      margin-left: auto;
      font-size: 9.5pt;
      color: #666;
      white-space: nowrap;
    }
    .exp-meta { font-size: 9pt; color: #777; font-style: italic; margin: 1px 0 5px; }

    /* ── Lists ── */
    ul { margin: 5px 0 5px 18px; padding: 0; }
    li { font-size: 10pt; line-height: 1.45; margin-bottom: 2px; }

    /* ── Generic lines ── */
    .cv-line { font-size: 10.5pt; margin: 3px 0; }
    .pipe-row { font-size: 10pt; margin: 3px 0; color: #333; }
    .pipe-row .pipe { color: #bbb; }

    /* ── Print ── */
    @media print {
      body { background: #fff; }
      .page { padding: 0; max-width: 100%; }
      @page { margin: 1.6cm 1.4cm; size: A4 portrait; }
    }
    @media screen {
      body { background: #e8eaf6; }
      .page {
        background: #fff;
        box-shadow: 0 2px 24px rgba(0,0,0,.15);
        margin: 28px auto;
        border-radius: 2px;
      }
    }
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${esc(title)}</title>
  <style>${css}</style>
</head>
<body>
  <div class="page">
    ${parts.join('\n    ')}
  </div>
</body>
</html>`;
}
