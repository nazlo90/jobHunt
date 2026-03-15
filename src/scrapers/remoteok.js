// src/scrapers/remoteok.js
import fetch from 'node-fetch';
import { scrapeId, scoreJob, extractSalary, stripHtml, CONFIG } from './utils.js';

export async function scrapeRemoteOK() {
  const results = [];
  const seen = new Set();

  // Build category URLs from profile; fall back to generic remote-jobs if none configured
  const categories = CONFIG.remoteOKCategories.length > 0
    ? CONFIG.remoteOKCategories
    : ['jobs'];
  const urls = categories.map(cat =>
    cat === 'jobs'
      ? 'https://remoteok.com/remote-jobs.json'
      : `https://remoteok.com/remote-${encodeURIComponent(cat)}-jobs.json`
  );

  for (const url of urls) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'JobHuntBot/1.0' },
      timeout: 10000,
    });
    if (!res.ok) continue;

    const jobs = await res.json();

    for (const job of jobs.slice(1, 30)) { // index 0 is metadata
      if (!job.position || !job.company) continue;

      const id = scrapeId(job.position, job.company);
      if (seen.has(id)) continue;
      seen.add(id);

      const score = scoreJob(job.position, job.description || '');
      if (score < 0) continue;

      const { salary, salaryRaw } = extractSalary(`${job.salary_min || ''} ${job.salary_max || ''}`);
      if (CONFIG.minSalary > 0 && salaryRaw > 0 && salaryRaw < CONFIG.minSalary) continue;

      results.push({
        scrapeId: id,
        company: job.company,
        role: job.position,
        salary: job.salary_min ? `$${Number(job.salary_min).toLocaleString()}–$${Number(job.salary_max).toLocaleString()}` : '',
        salaryRaw: job.salary_min || 0,
        url: job.url || `https://remoteok.com/l/${job.slug}`,
        location: 'Remote',
        techStack: (job.tags || []).join(', '),
        source: 'remoteok',
        descriptionPreview: stripHtml(job.description || '').slice(0, 500),
        score,
      });
    }
  } catch (err) {
    console.error(`  ✗ RemoteOK error (${url}): ${err.message}`);
  }
  }

  return results;
}