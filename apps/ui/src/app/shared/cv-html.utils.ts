/**
 * Renders a plain-text CV into styled HTML using a two-column layout
 * that closely matches the original PDF design:
 *   - Centred header (name + contact)
 *   - Label sections  (PROFILE, CORE SKILLS, LINKS, SKILLS, LANGUAGES…):
 *       left column = section label | right column = content
 *   - Timeline sections (EMPLOYMENT HISTORY, EDUCATION, COURSES…):
 *       full-width section label, then each entry:
 *       left column = date | right column = role/degree/course + bullets
 *
 * Expected plain-text structure produced by the AI adapter:
 *   Line 1:  Full name
 *   Line 2:  Job title
 *   Line 3+: Contact / links  (contain @ / http / +digits / |)
 *   [blank]
 *   SECTION NAME
 *   content…
 */
export function buildCvHtml(text: string, title: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ── section classification ─────────────────────────────────────────────────
  const LABEL_SECTIONS = new Set([
    'PROFILE', 'SUMMARY', 'OBJECTIVE',
    'LINKS',
    'SKILLS', 'TECHNICAL SKILLS', 'CORE SKILLS', 'KEY SKILLS', 'TECHNOLOGIES',
    'LANGUAGES',
    'INTERESTS', 'HOBBIES',
  ]);

  const TIMELINE_SECTIONS = new Set([
    'EMPLOYMENT HISTORY', 'EMPLOYMENT',
    'EXPERIENCE', 'WORK EXPERIENCE', 'PROFESSIONAL EXPERIENCE',
    'EDUCATION', 'QUALIFICATIONS',
    'COURSES', 'CERTIFICATIONS', 'CERTIFICATES',
    'ACHIEVEMENTS', 'PROJECTS',
  ]);

  const ALL_SECTIONS = new Set([...LABEL_SECTIONS, ...TIMELINE_SECTIONS]);

  const norm = (s: string) => s.trim().toUpperCase().replace(/:$/, '');
  const isSection   = (s: string) => ALL_SECTIONS.has(norm(s));
  const isBullet    = (s: string) => /^[-•*]\s/.test(s.trim());
  const isContact   = (s: string) =>
    s.includes('@') || /https?:\/\//.test(s) || /\+\d{5,}/.test(s);
  const isPipeRow   = (s: string) =>
    s.includes('|') && s.split('|').length >= 2 && !isBullet(s) && !isSection(s);
  const isSkillRow  = (s: string) =>
    /^[A-Za-z][A-Za-z &/\-]+:\s+\S/.test(s.trim()) && !isSection(s);
  const isDomainMeta = (s: string) =>
    /^(Domain|Domains|Stack|Tech Stack|Tech|Location)\s*:/i.test(s.trim());
  // Detects "Nov 2025 — Mar 2026", "Sept 2007 — Feb 2013", "Mar 2024 — May 2024"
  const isDateRange = (s: string) =>
    /^(?:[A-Za-z]+\.?\s+)?\d{4}\s*(?:—|–|-)/.test(s.trim()) ||
    /^\d{4}\s*(?:—|–|-)/.test(s.trim());

  // ── parse ──────────────────────────────────────────────────────────────────
  const lines = text.split('\n');
  let i = 0;

  while (i < lines.length && !lines[i].trim()) i++;
  const name = lines[i++]?.trim() ?? '';

  while (i < lines.length && !lines[i].trim()) i++;
  const maybeTitle = lines[i]?.trim() ?? '';
  const jobTitle = !isSection(maybeTitle) && !isPipeRow(maybeTitle) && !isBullet(maybeTitle)
    ? maybeTitle : '';
  if (jobTitle) i++;

  const contactLines: string[] = [];
  while (i < lines.length) {
    const l = lines[i].trim();
    if (!l) { i++; break; }
    if (isSection(l)) break;
    if (isContact(l) || isPipeRow(l)) contactLines.push(l);
    i++;
  }

  // Build sections array
  const sections: Array<{ header: string; key: string; lines: string[] }> = [];
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) { i++; continue; }
    if (!isSection(trimmed)) { i++; continue; } // orphan line before first section

    const header = trimmed;
    const key = norm(trimmed);
    i++;
    const secLines: string[] = [];
    while (i < lines.length && !isSection(lines[i].trim())) {
      secLines.push(lines[i++]);
    }
    sections.push({ header, key, lines: secLines });
  }

  // ── render helpers ─────────────────────────────────────────────────────────

  function renderContact(cLines: string[]): string {
    return cLines.map(c =>
      c.split('|').map(p => {
        const t = p.trim();
        if (/https?:\/\//.test(t)) {
          const display = t.replace(/https?:\/\/(www\.)?/, '');
          return `<a href="${esc(t)}" target="_blank">${esc(display)}</a>`;
        }
        return esc(t);
      }).join(' <span class="pipe">|</span> ')
    ).join('<br>');
  }

  /** Render content for label sections (PROFILE, SKILLS, LANGUAGES …) */
  function renderLabelBody(secKey: string, sLines: string[]): string {
    const SKILL_SECS = new Set([
      'SKILLS', 'CORE SKILLS', 'TECHNICAL SKILLS', 'KEY SKILLS', 'TECHNOLOGIES',
    ]);
    let html = '';
    let inUl = false;

    for (const line of sLines) {
      const sl = line.trim();
      if (!sl) {
        if (inUl) { html += '</ul>'; inUl = false; }
        continue;
      }

      if (isBullet(sl)) {
        if (!inUl) { html += '<ul>'; inUl = true; }
        html += `<li>${esc(sl.replace(/^[-•*]\s/, ''))}</li>`;
        continue;
      }

      if (inUl) { html += '</ul>'; inUl = false; }

      if (SKILL_SECS.has(secKey) && isSkillRow(sl)) {
        const colon = sl.indexOf(':');
        const cat  = sl.slice(0, colon).trim();
        const vals = sl.slice(colon + 1).trim();
        html += `<div class="skill-row">
  <span class="skill-cat">${esc(cat)}:</span>
  <span class="skill-vals">${esc(vals)}</span>
</div>`;
        continue;
      }

      // LANGUAGES: "Ukrainian: Native speaker"
      if (secKey === 'LANGUAGES' && isSkillRow(sl)) {
        const colon = sl.indexOf(':');
        const lang  = sl.slice(0, colon).trim();
        const level = sl.slice(colon + 1).trim();
        html += `<div class="lang-row">
  <span class="lang-name">${esc(lang)}:</span>
  <span class="lang-level">${esc(level)}</span>
</div>`;
        continue;
      }

      // Pipe-separated line (e.g. links: "Linkedin | GitHub")
      if (isPipeRow(sl)) {
        const ps = sl.split('|').map(p => p.trim());
        html += `<p class="pipe-line">${
          ps.map(p => {
            if (/https?:\/\//.test(p)) {
              const display = p.replace(/https?:\/\/(www\.)?/, '');
              return `<a href="${esc(p)}" target="_blank">${esc(display)}</a>`;
            }
            return esc(p);
          }).join(' <span class="pipe">|</span> ')
        }</p>`;
        continue;
      }

      html += `<p class="cv-line">${esc(sl)}</p>`;
    }

    if (inUl) html += '</ul>';
    return html;
  }

  /** Render entries for timeline sections (EMPLOYMENT, EDUCATION, COURSES …) */
  function renderTimelineBody(sLines: string[]): string {
    let html = '';
    let inEntry = false;
    let dateHtml = '';
    let contentHtml = '';
    let inUl = false;

    const flush = () => {
      if (inUl) { contentHtml += '</ul>'; inUl = false; }
      if (inEntry) {
        html += `<div class="tl-entry">
  <div class="tl-date">${dateHtml}</div>
  <div class="tl-content">${contentHtml}</div>
</div>`;
        dateHtml = '';
        contentHtml = '';
        inEntry = false;
      }
    };

    for (const line of sLines) {
      const sl = line.trim();
      if (!sl) {
        if (inUl) { contentHtml += '</ul>'; inUl = false; }
        continue;
      }

      // "Role | Company | Period"  or  "Date | Degree | Institution"
      if (isPipeRow(sl)) {
        flush();
        const ps = sl.split('|').map(p => p.trim());
        const firstIsDate = isDateRange(ps[0]);

        if (firstIsDate) {
          // Education / courses: "Period | Degree, Institution | Location"
          dateHtml = esc(ps[0]);
          const rest = ps.slice(1);
          if (rest.length === 1) {
            contentHtml = `<div class="tl-title">${esc(rest[0])}</div>`;
          } else {
            contentHtml = `<div class="tl-title">${esc(rest[0])}</div>
<div class="tl-sub">${esc(rest.slice(1).join(' | '))}</div>`;
          }
        } else {
          // Experience: "Role | Company | Period"
          const role    = ps[0] ?? '';
          const company = ps[1] ?? '';
          const period  = ps[2] ?? '';
          dateHtml = esc(period);
          contentHtml = `<div class="tl-title">${esc(role)}${
            company ? `<span class="tl-company"> — ${esc(company)}</span>` : ''
          }</div>`;
        }
        inEntry = true;
        continue;
      }

      // Bullet inside an entry
      if (isBullet(sl)) {
        if (!inUl) { contentHtml += '<ul>'; inUl = true; }
        contentHtml += `<li>${esc(sl.replace(/^[-•*]\s/, ''))}</li>`;
        continue;
      }

      if (inUl) { contentHtml += '</ul>'; inUl = false; }

      if (isDomainMeta(sl)) {
        contentHtml += `<p class="tl-meta">${esc(sl)}</p>`;
        continue;
      }

      // Plain line (before first entry or orphan)
      if (inEntry) {
        contentHtml += `<p class="cv-line">${esc(sl)}</p>`;
      } else {
        html += `<p class="cv-line">${esc(sl)}</p>`;
      }
    }

    flush();
    return html;
  }

  // ── assemble HTML ──────────────────────────────────────────────────────────

  const headerHtml = `
<div class="cv-header">
  <h1 class="cv-name">${esc(name)}</h1>
  ${jobTitle ? `<p class="cv-jobtitle">${esc(jobTitle)}</p>` : ''}
  ${contactLines.length ? `<p class="cv-contact">${renderContact(contactLines)}</p>` : ''}
</div>`;

  const sectionsHtml = sections.map(sec => {
    const isLabel    = LABEL_SECTIONS.has(sec.key);
    const isTimeline = TIMELINE_SECTIONS.has(sec.key);

    if (isTimeline) {
      return `
<div class="cv-tl-header">${esc(sec.header)}</div>
<div class="cv-tl-body">${renderTimelineBody(sec.lines)}</div>`;
    }

    // Label section (default)
    return `
<div class="cv-row">
  <div class="cv-label">${esc(sec.header)}</div>
  <div class="cv-content">${renderLabelBody(sec.key, sec.lines)}</div>
</div>`;
  }).join('\n');

  // ── CSS ───────────────────────────────────────────────────────────────────
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
      max-width: 820px;
      margin: 0 auto;
      padding: 44px 52px;
    }

    /* ── Header ── */
    .cv-header {
      text-align: center;
      padding-bottom: 16px;
      margin-bottom: 4px;
    }
    .cv-name {
      font-size: 20pt;
      font-weight: 700;
      letter-spacing: 0.2px;
      color: #1a1a1a;
      margin-bottom: 2px;
    }
    .cv-jobtitle {
      font-size: 11pt;
      font-weight: 400;
      color: #444;
      margin: 2px 0;
    }
    .cv-contact {
      font-size: 9pt;
      color: #555;
      margin-top: 5px;
    }
    .cv-contact a { color: #1a1a1a; text-decoration: none; }
    .pipe { color: #aaa; }

    /* ── Two-column row (label sections) ── */
    .cv-row {
      display: grid;
      grid-template-columns: 150px 1fr;
      gap: 0 24px;
      border-top: 1px solid #d8d8d8;
      padding: 12px 0;
    }
    .cv-label {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.8px;
      color: #555;
      padding-top: 3px;
      line-height: 1.4;
    }
    .cv-content {
      font-size: 10pt;
    }

    /* ── Timeline section header ── */
    .cv-tl-header {
      border-top: 1px solid #d8d8d8;
      padding: 12px 0 0;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.8px;
      color: #555;
    }
    .cv-tl-body {
      padding: 4px 0 8px;
    }

    /* ── Timeline entries (date | content) ── */
    .tl-entry {
      display: grid;
      grid-template-columns: 150px 1fr;
      gap: 0 24px;
      margin: 10px 0;
    }
    .tl-date {
      font-size: 9pt;
      color: #777;
      padding-top: 2px;
      line-height: 1.4;
    }
    .tl-content { }
    .tl-title {
      font-size: 11pt;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 5px;
      line-height: 1.3;
    }
    .tl-company {
      font-size: 11pt;
      font-weight: 400;
      color: #444;
    }
    .tl-sub {
      font-size: 9.5pt;
      color: #666;
      margin-bottom: 4px;
    }
    .tl-meta {
      font-size: 9pt;
      color: #777;
      font-style: italic;
      margin: 3px 0;
    }

    /* ── Skills ── */
    .skill-row {
      display: flex;
      align-items: baseline;
      margin: 2px 0;
      font-size: 10pt;
    }
    .skill-cat {
      font-weight: 600;
      min-width: 160px;
      flex-shrink: 0;
      color: #222;
    }
    .skill-vals { color: #444; }

    /* ── Languages ── */
    .lang-row {
      display: flex;
      align-items: baseline;
      margin: 2px 0;
      font-size: 10pt;
      gap: 6px;
    }
    .lang-name  { font-weight: 600; min-width: 120px; }
    .lang-level { color: #555; }

    /* ── Lists ── */
    ul { margin: 4px 0 4px 16px; padding: 0; }
    li { font-size: 10pt; line-height: 1.45; margin-bottom: 2px; }

    /* ── Generic lines ── */
    .cv-line { font-size: 10pt; margin: 2px 0; }
    .pipe-line { font-size: 10pt; margin: 2px 0; }
    .pipe-line a { color: #1a1a1a; text-decoration: none; }

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
        box-shadow: 0 2px 24px rgba(0,0,0,.14);
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
    ${headerHtml}
    ${sectionsHtml}
  </div>
</body>
</html>`;
}
