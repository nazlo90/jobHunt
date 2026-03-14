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
          scrape_id: id,
          company,
          role,
          salary,
          salary_raw: salaryRaw,
          url: job.url || '',
          location: job.timezone || job.location || 'Remote',
          tech_stack: tags.join(', '),
          status: 'Bookmarked',
          priority: Math.min(5, Math.max(1, score + 2)),
          applied_date: '',
          contact: '',
          notes: '',
          source: 'himalayas',
          description_preview: desc.slice(0, 500),
        });
      }

      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  ✗ Himalayas error (${term}): ${err.message}`);
    }
  }

  return results;
}
