// src/scrapers/themuse.js
import fetch from 'node-fetch';
import { scrapeId, scoreJob, stripHtml, CONFIG } from './utils.js';

const BASE = 'https://www.themuse.com/api/public/jobs';

export async function scrapeTheMuse() {
  const results = [];
  const seen = new Set();

  const categories = CONFIG.theMuseCategories.length > 0 ? CONFIG.theMuseCategories : [];
  const levels = CONFIG.theMuseLevels.length > 0 ? CONFIG.theMuseLevels : [];

  if (categories.length === 0 || levels.length === 0) return results;

  for (const category of categories) {
    for (const level of levels) {
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
            scrapeId: id,
            company,
            role,
            salary: '',
            salaryRaw: 0,
            url: jobUrl,
            location: job.locations?.map(l => l.name).join(', ') || 'Remote',
            techStack: (job.categories || []).map(c => c.name).join(', '),
            source: 'themuse',
            descriptionPreview: desc.slice(0, 500),
            score,
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
