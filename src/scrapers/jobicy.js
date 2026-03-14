// src/scrapers/jobicy.js
import fetch from 'node-fetch';
import { scrapeId, scoreJob, extractSalary, stripHtml, CONFIG } from './utils.js';

// Tags to query — covers the main frontend keywords
const TAGS = ['angular', 'typescript', 'react', 'frontend', 'javascript'];

export async function scrapeJobicy() {
  const results = [];
  const seen = new Set();

  for (const tag of TAGS) {
    try {
      const url = `https://jobicy.com/api/v2/remote-jobs?count=50&tag=${encodeURIComponent(tag)}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'JobHuntBot/1.0' },
        timeout: 10000,
      });
      if (!res.ok) continue;

      const data = await res.json();
      const jobs = data.jobs || [];

      for (const job of jobs) {
        const role = job.jobTitle || '';
        const company = job.companyName || '';
        if (!role || !company) continue;

        const id = scrapeId(role, company);
        if (seen.has(id)) continue;
        seen.add(id);

        const desc = stripHtml(job.jobDescription || job.jobExcerpt || '');
        const score = scoreJob(role, desc);
        if (score < 0) continue;

        const { salary, salaryRaw } = extractSalary(job.jobSalary || '');
        if (CONFIG.minSalary > 0 && salaryRaw > 0 && salaryRaw < CONFIG.minSalary) continue;

        results.push({
          scrape_id: id,
          company,
          role,
          salary: job.jobSalary || salary,
          salary_raw: salaryRaw,
          url: job.url || '',
          location: job.jobGeo || 'Anywhere',
          tech_stack: (job.jobIndustry || []).join(', '),
          status: 'Bookmarked',
          priority: Math.min(5, Math.max(1, score + 2)),
          applied_date: '',
          contact: '',
          notes: '',
          source: 'jobicy',
          description_preview: desc.slice(0, 500),
        });
      }

      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  ✗ Jobicy error (${tag}): ${err.message}`);
    }
  }

  return results;
}
