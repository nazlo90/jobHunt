// src/scrapers/remotive.js
import fetch from 'node-fetch';
import { scrapeId, scoreJob, stripHtml, CONFIG } from './utils.js';

export async function scrapeRemotive() {
  const results = [];
  try {
    const category = CONFIG.remotiveCategory || 'software-dev';
    const res = await fetch(`https://remotive.com/api/remote-jobs?category=${encodeURIComponent(category)}&limit=50`);
    const data = await res.json();

    for (const job of data.jobs) {
      const role = job.title;
      const company = job.company_name;
      const desc = stripHtml(job.description || '');

      const score = scoreJob(role, desc);
      if (score < 0) continue;

      const id = scrapeId(role, company);

      results.push({
        scrapeId: id,
        company,
        role,
        salary: job.salary || '',
        salaryRaw: 0,
        url: job.url,
        location: 'Remote',
        techStack: (job.tags || []).join(', '),
        source: 'remotive',
        descriptionPreview: desc.slice(0, 500),
        score,
      });
    }
  } catch (err) {
    console.error(`  ✗ Remotive error: ${err.message}`);
  }
  return results;
}