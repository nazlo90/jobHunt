// src/scrapers/jooble.js
// Requires JOOBLE_API_KEY env var — get a free key at https://jooble.org/api/about
import fetch from 'node-fetch';
import { scrapeId, scoreJob, stripHtml, extractSalary, CONFIG } from './utils.js';

export async function scrapeJooble() {
  const results = [];
  const apiKey = process.env.JOOBLE_API_KEY;
  if (!apiKey) {
    console.log('  ⚠ Jooble: JOOBLE_API_KEY not set, skipping');
    return results;
  }

  const terms = CONFIG.searchTerms.length > 0 ? CONFIG.searchTerms.slice(0, 2) : ['frontend developer'];
  const seen = new Set();

  for (const term of terms) {
    try {
      const res = await fetch(`https://jooble.org/api/${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: term, location: '', page: '1' }),
        timeout: 15000,
      });
      if (!res.ok) {
        console.error(`  ✗ Jooble HTTP ${res.status} for "${term}"`);
        continue;
      }
      const data = await res.json();

      for (const job of (data.jobs || [])) {
        const role = job.title;
        const company = job.company;
        if (!role || !company) continue;

        const id = scrapeId(role, company);
        if (seen.has(id)) continue;
        seen.add(id);

        const desc = stripHtml(job.snippet || '');
        const score = scoreJob(role, desc);
        if (score < 0) continue;

        const { salary, salaryRaw } = extractSalary(job.salary || desc);
        if (CONFIG.minSalary > 0 && salaryRaw > 0 && salaryRaw < CONFIG.minSalary) continue;

        const isRemote =
          (job.type || '').toLowerCase().includes('remote') ||
          (job.location || '').toLowerCase().includes('remote');
        if (CONFIG.remoteOnly && !isRemote) continue;

        results.push({
          scrapeId: id,
          company,
          role,
          salary,
          salaryRaw,
          url: job.link || '',
          location: isRemote ? 'Remote' : (job.location || ''),
          techStack: '',
          source: 'jooble',
          descriptionPreview: desc.slice(0, 500),
          score,
        });
      }
    } catch (err) {
      console.error(`  ✗ Jooble error: ${err.message}`);
    }
  }
  return results;
}
