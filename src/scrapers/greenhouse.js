// src/scrapers/greenhouse.js
import fetch from 'node-fetch';
import { scrapeId, scoreJob } from './utils.js';

export async function scrapeGreenhouse(company) {
  const results = [];
  try {
    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${company}/jobs`);
    const data = await res.json();

    for (const job of data.jobs.slice(0, 15)) { // Limit to first 15 jobs per company
      const role = job.title;
      const companyName = company;

      // Quick title-based pre-filter to avoid unnecessary HTTP requests
      const titleScore = scoreJob(role, '');
      if (titleScore < -2) continue; // Skip obviously irrelevant jobs

      // Skip if no content URL (can't get description)
      if (!job.absolute_url) continue;

      let description = '';
      try {
        // Try to get job description for better scoring (with timeout)
        const descRes = await fetch(job.absolute_url, { timeout: 3000 });
        if (descRes.ok) {
          const html = await descRes.text();
          // Extract description from meta tags or content
          const descMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/i) ||
                           html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i);
          if (descMatch) {
            description = descMatch[1];
          }
        }
      } catch (err) {
        // Ignore description fetch errors, continue with title-only scoring
      }

      const score = scoreJob(role, description);
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
        description_preview: description.slice(0, 500),
      });

      // Rate limiting - shorter delay
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  } catch (err) {
    console.error(`  ✗ Greenhouse (${company}) error: ${err.message}`);
  }
  return results;
}