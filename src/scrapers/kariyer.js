// src/scrapers/kariyer.js
import fetch from 'node-fetch';
import { scrapeId, scoreJob, stripHtml, CONFIG } from './utils.js';

export async function scrapeKariyer() {
  const results = [];
  const seen = new Set();
  const terms = CONFIG.searchTerms.length > 0 ? CONFIG.searchTerms.slice(0, 2) : ['frontend'];

  for (const term of terms) {
    try {
      const slug = term.toLowerCase().replace(/\s+/g, '-');
      const res = await fetch(`https://www.kariyer.net/is-ilanlari/${encodeURIComponent(slug)}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        timeout: 15000,
      });
      if (!res.ok) {
        console.error(`  ✗ Kariyer.net HTTP ${res.status}`);
        continue;
      }
      const html = await res.text();

      for (const match of html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)) {
        try {
          const raw = JSON.parse(match[1]);
          const items = Array.isArray(raw)
            ? raw
            : raw['@type'] === 'ItemList'
              ? (raw.itemListElement || []).map((i) => i.item)
              : [raw];

          for (const item of items) {
            if (item['@type'] !== 'JobPosting') continue;

            const role = item.title;
            const company = item.hiringOrganization?.name;
            if (!role || !company) continue;

            const id = scrapeId(role, company);
            if (seen.has(id)) continue;
            seen.add(id);

            const desc = stripHtml(item.description || '');
            const score = scoreJob(role, desc);
            if (score < 0) continue;

            const isRemote = item.jobLocationType === 'TELECOMMUTE';
            if (CONFIG.remoteOnly && !isRemote) continue;

            results.push({
              scrapeId: id,
              company,
              role,
              salary: '',
              salaryRaw: 0,
              url: item.url || '',
              location: isRemote ? 'Remote' : (item.jobLocation?.address?.addressLocality || 'Turkey'),
              techStack: '',
              source: 'kariyer',
              descriptionPreview: desc.slice(0, 500),
              score,
            });
          }
        } catch { /* skip malformed entry */ }
      }
    } catch (err) {
      console.error(`  ✗ Kariyer.net error: ${err.message}`);
    }
  }
  return results;
}
