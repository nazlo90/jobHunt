// src/scrapers/remotive.js
import fetch from 'node-fetch';
import { scrapeId, scoreJob, stripHtml } from './utils.js';

export async function scrapeRemotive() {
  const results = [];
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs');
    const data = await res.json();

    for (const job of data.jobs.slice(0, 40)) {
      const role = job.title;
      const company = job.company_name;
      const desc = stripHtml(job.description || '');

      const score = scoreJob(role, desc);
      if (score < 0) continue;

      const id = scrapeId(role, company);

      results.push({
        scrape_id: id,
        company,
        role,
        salary: job.salary || '',
        salary_raw: 0,
        url: job.url,
        location: 'Remote',
        tech_stack: (job.tags || []).join(', '),
        status: 'Bookmarked',
        priority: Math.min(5, Math.max(1, score + 2)),
        applied_date: '',
        contact: '',
        notes: '',
        source: 'remotive',
        description_preview: desc.slice(0, 500),
      });
    }
  } catch (err) {
    console.error(`  ✗ Remotive error: ${err.message}`);
  }
  return results;
}