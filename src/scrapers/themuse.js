// src/scrapers/themuse.js
import fetch from 'node-fetch';
import { scrapeId, scoreJob, stripHtml, CONFIG } from './utils.js';

const BASE = 'https://www.themuse.com/api/public/jobs';
const CATEGORIES = ['Software Engineer', 'Data and Analytics'];
const LEVELS = ['Senior Level', 'Management and Executive'];

export async function scrapeTheMuse() {
  const results = [];
  const seen = new Set();

  for (const category of CATEGORIES) {
    for (const level of LEVELS) {
      try {
        const params = new URLSearchParams({
          category,
          level,
          page: '0',
        });
        const url = `${BASE}?${params}`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'JobHuntBot/1.0' },
          timeout: 10000,
        });
        if (!res.ok) continue;

        const data = await res.json();
        const jobs = data.results || [];

        for (const job of jobs) {
          const role = job.name || '';
          const company = job.company?.name || '';
          if (!role || !company) continue;

          // Filter: only remote or flexible locations
          const locations = (job.locations || []).map(l => l.name.toLowerCase());
          const isRemote = locations.length === 0
            || locations.some(l => l.includes('remote') || l.includes('flexible') || l.includes('anywhere'));
          if (CONFIG.remoteOnly && !isRemote) continue;

          const id = scrapeId(role, company);
          if (seen.has(id)) continue;
          seen.add(id);

          const desc = stripHtml(job.contents || '');
          const score = scoreJob(role, desc);
          if (score < 0) continue;

          const jobUrl = job.refs?.landing_page || '';

          results.push({
            scrape_id: id,
            company,
            role,
            salary: '',
            salary_raw: 0,
            url: jobUrl,
            location: job.locations?.map(l => l.name).join(', ') || 'Remote',
            tech_stack: (job.categories || []).map(c => c.name).join(', '),
            status: 'Bookmarked',
            priority: Math.min(5, Math.max(1, score + 2)),
            applied_date: '',
            contact: '',
            notes: '',
            source: 'themuse',
            description_preview: desc.slice(0, 500),
          });
        }

        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error(`  ✗ The Muse error (${category}/${level}): ${err.message}`);
      }
    }
  }

  return results;
}
