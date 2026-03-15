// src/scrapers/jobicy.js
import fetch from 'node-fetch';
import { scrapeId, scoreJob, extractSalary, stripHtml, CONFIG } from './utils.js';

export async function scrapeJobicy() {
  const results = [];
  const seen = new Set();

  // Use profile's strongKeywords as Jobicy tags; limit to 5 to avoid rate-limiting
  const tags = CONFIG.strongKeywords.slice(0, 5);
  if (tags.length === 0) return results;

  for (const tag of tags) {
    try {
      const url = `https://jobicy.com/api/v2/remote-jobs?count=50&tag=${encodeURIComponent(tag.toLowerCase())}`;
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
          scrapeId: id,
          company,
          role,
          salary: job.jobSalary || salary,
          salaryRaw,
          url: job.url || '',
          location: job.jobGeo || 'Anywhere',
          techStack: (job.jobIndustry || []).join(', '),
          source: 'jobicy',
          descriptionPreview: desc.slice(0, 500),
          score,
        });
      }

      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  ✗ Jobicy error (${tag}): ${err.message}`);
    }
  }

  return results;
}
