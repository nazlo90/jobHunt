// src/scrapers/himalayas.js
import fetch from 'node-fetch';
import { scrapeId, scoreJob, extractSalary, stripHtml, CONFIG } from './utils.js';

const BASE = 'https://himalayas.app/jobs/api/search';

export async function scrapeHimalayas() {
  const results = [];
  const seen = new Set();

  for (const term of CONFIG.searchTerms) {
    try {
      const url = `${BASE}?q=${encodeURIComponent(term)}&employment_type=full-time&limit=20`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'JobHuntBot/1.0' },
        timeout: 10000,
      });
      if (!res.ok) continue;

      const data = await res.json();
      const jobs = data.jobs || [];

      for (const job of jobs) {
        const role = job.title || '';
        const company = job.company?.name || job.companyName || '';
        if (!role || !company) continue;

        const id = scrapeId(role, company);
        if (seen.has(id)) continue;
        seen.add(id);

        const desc = stripHtml(job.description || job.excerpt || '');
        const score = scoreJob(role, desc);
        if (score < 0) continue;

        const salaryRaw = job.minSalary || 0;
        if (CONFIG.minSalary > 0 && salaryRaw > 0 && salaryRaw < CONFIG.minSalary) continue;

        const salary = job.minSalary && job.maxSalary
          ? `$${Number(job.minSalary).toLocaleString()}–$${Number(job.maxSalary).toLocaleString()}`
          : (job.salary || '');

        const tags = (job.categories || []).concat(job.tags || []);

        results.push({
          scrapeId: id,
          company,
          role,
          salary,
          salaryRaw,
          url: job.url || '',
          location: job.timezone || job.location || 'Remote',
          techStack: tags.join(', '),
          source: 'himalayas',
          descriptionPreview: desc.slice(0, 500),
          score,
        });
      }

      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  ✗ Himalayas error (${term}): ${err.message}`);
    }
  }

  return results;
}
