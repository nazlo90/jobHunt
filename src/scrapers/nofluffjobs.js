// src/scrapers/nofluffjobs.js
// Scrapes NoFluffJobs by parsing the Angular server-side rendered state
// embedded in <script id="serverApp-state"> on category pages.
// Categories default to ['frontend']; override via sourceConfig.noFluffJobsCategories.
import fetch from 'node-fetch';
import { scrapeId, scoreJob, CONFIG } from './utils.js';

function decodeAngularState(raw) {
  // Angular TransferState HTML-encodes these characters to keep JSON safe inside <script>
  return raw
    .replace(/&a;/g, '&')
    .replace(/&q;/g, '"')
    .replace(/&s;/g, "'")
    .replace(/&l;/g, '<')
    .replace(/&g;/g, '>');
}

export async function scrapeNoFluffJobs() {
  const results = [];
  const seen = new Set();
  const categories =
    Array.isArray(CONFIG.noFluffJobsCategories) && CONFIG.noFluffJobsCategories.length > 0
      ? CONFIG.noFluffJobsCategories
      : ['frontend'];

  for (const category of categories.slice(0, 3)) {
    try {
      const remoteQuery = CONFIG.remoteOnly ? '?remote=true' : '';
      const url = `https://nofluffjobs.com/${encodeURIComponent(category)}${remoteQuery}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html',
          'Accept-Language': 'en-GB,en;q=0.9',
        },
        timeout: 15000,
      });
      if (!res.ok) {
        console.error(`  ✗ NoFluffJobs HTTP ${res.status} for "${category}"`);
        continue;
      }
      const html = await res.text();

      const stateMatch = html.match(/<script id="serverApp-state" type="application\/json">([\s\S]*?)<\/script>/);
      if (!stateMatch) continue;

      let state;
      try {
        state = JSON.parse(decodeAngularState(stateMatch[1]));
      } catch {
        continue;
      }

      const postings = state['STORE_KEY']?.searchResponse?.postings ?? [];

      for (const p of postings) {
        const role = p.title;
        const company = p.name;
        if (!role || !company) continue;

        const id = scrapeId(role, company);
        if (seen.has(id)) continue;
        seen.add(id);

        const isRemote = p.location?.fullyRemote === true;
        if (CONFIG.remoteOnly && !isRemote) continue;

        const tech = Array.isArray(p.tiles?.values)
          ? p.tiles.values.filter(v => v.type === 'requirement').map(v => v.value).join(', ')
          : (p.technology || '');
        const score = scoreJob(role, tech);
        if (score < 0) continue;

        let salary = '';
        let salaryRaw = 0;
        const sal = p.salary;
        if (sal?.from) {
          salary = `${sal.from}–${sal.to || sal.from} ${sal.currency || 'PLN'}`;
          salaryRaw = sal.from;
        }

        results.push({
          scrapeId: id,
          company,
          role,
          salary,
          salaryRaw,
          url: p.url ? `https://nofluffjobs.com/job/${p.url}` : '',
          location: isRemote ? 'Remote' : (p.location?.places?.[0]?.city || ''),
          techStack: tech,
          source: 'nofluffjobs',
          descriptionPreview: tech.slice(0, 500),
          score,
        });
      }
    } catch (err) {
      console.error(`  ✗ NoFluffJobs error ("${category}"): ${err.message}`);
    }
  }
  return results;
}
