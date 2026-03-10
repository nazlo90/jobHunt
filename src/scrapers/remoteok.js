// src/scrapers/remoteok.js
import fetch from 'node-fetch';
import { scrapeId, scoreJob, extractSalary, stripHtml, CONFIG } from './utils.js';

export async function scrapeRemoteOK() {
  const results = [];
  try {
    const res = await fetch('https://remoteok.com/remote-frontend-jobs.json', {
      headers: { 'User-Agent': 'JobHuntBot/1.0' },
      timeout: 10000,
    });
    if (!res.ok) return results;

    const jobs = await res.json();

    for (const job of jobs.slice(1, 30)) { // index 0 is metadata
      if (!job.position || !job.company) continue;
      const score = scoreJob(job.position, job.description || '');
      if (score < 0) continue;

      const id = scrapeId(job.position, job.company);
      const { salary, salaryRaw } = extractSalary(`${job.salary_min || ''} ${job.salary_max || ''}`);
      if (CONFIG.minSalary > 0 && salaryRaw > 0 && salaryRaw < CONFIG.minSalary) continue;

      results.push({
        scrape_id: id,
        company: job.company,
        role: job.position,
        salary: job.salary_min ? `$${Number(job.salary_min).toLocaleString()}–$${Number(job.salary_max).toLocaleString()}` : '',
        salary_raw: job.salary_min || 0,
        url: job.url || `https://remoteok.com/l/${job.slug}`,
        location: 'Remote',
        tech_stack: (job.tags || []).join(', '),
        status: 'Bookmarked',
        priority: Math.min(5, Math.max(1, score + 2)),
        applied_date: '',
        contact: '',
        notes: '',
        source: 'remoteok',
        description_preview: stripHtml(job.description || '').slice(0, 500),
      });
    }
  } catch (err) {
    console.error(`  ✗ RemoteOK error: ${err.message}`);
  }
  return results;
}