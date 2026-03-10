// src/scrapers/greenhouse.js
import fetch from 'node-fetch';
import { scrapeId, scoreJob } from './utils.js';

export async function scrapeGreenhouse(company) {
  const results = [];
  try {
    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${company}/jobs`);
    const data = await res.json();

    for (const job of data.jobs) {
      const role = job.title;
      const companyName = company;

      const score = scoreJob(role, '');
      if (score < 0) continue;

      results.push({
        scrape_id: scrapeId(role, companyName),
        company: companyName,
        role,
        salary: '',
        salary_raw: 0,
        url: job.absolute_url,
        location: job.location?.name || '',
        tech_stack: '',
        status: 'Bookmarked',
        priority: Math.min(5, Math.max(1, score + 2)),
        applied_date: '',
        contact: '',
        notes: '',
        source: 'greenhouse',
        description_preview: '',
      });
    }
  } catch (err) {
    console.error(`  ✗ Greenhouse (${company}) error: ${err.message}`);
  }
  return results;
}