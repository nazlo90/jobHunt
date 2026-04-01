// src/scrapers/indeed.js
// Note: Indeed has aggressive bot protection; results may vary.
// Extracts JobPosting JSON-LD structured data when available.
import fetch from 'node-fetch';
import { scrapeId, scoreJob, stripHtml, extractSalary, CONFIG } from './utils.js';

export async function scrapeIndeed() {
  const results = [];
  const seen = new Set();
  const terms = CONFIG.searchTerms.length > 0 ? CONFIG.searchTerms.slice(0, 2) : ['frontend developer'];

  for (const term of terms) {
    try {
      const params = new URLSearchParams({ q: term, l: '', sort: 'date', fromage: '7' });
      if (CONFIG.remoteOnly) params.set('remotejob', '1');

      const res = await fetch(`https://ua.indeed.com/jobs?${params}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8',
        },
        timeout: 15000,
      });
      if (!res.ok) {
        console.error(`  ✗ Indeed HTTP ${res.status}`);
        continue;
      }
      const html = await res.text();

      for (const match of html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)) {
        try {
          const data = JSON.parse(match[1]);
          if (data['@type'] !== 'JobPosting') continue;

          const role = data.title;
          const company = data.hiringOrganization?.name;
          if (!role || !company) continue;

          const id = scrapeId(role, company);
          if (seen.has(id)) continue;
          seen.add(id);

          const desc = stripHtml(data.description || '');
          const score = scoreJob(role, desc);
          if (score < 0) continue;

          const isRemote = data.jobLocationType === 'TELECOMMUTE';
          if (CONFIG.remoteOnly && !isRemote) continue;

          const { salary, salaryRaw } = extractSalary(desc);
          if (CONFIG.minSalary > 0 && salaryRaw > 0 && salaryRaw < CONFIG.minSalary) continue;

          results.push({
            scrapeId: id,
            company,
            role,
            salary,
            salaryRaw,
            url: data.url || data.mainEntityOfPage?.['@id'] || '',
            location: isRemote ? 'Remote' : (data.jobLocation?.address?.addressLocality || ''),
            techStack: '',
            source: 'indeed',
            descriptionPreview: desc.slice(0, 500),
            score,
          });
        } catch { /* skip malformed entry */ }
      }
    } catch (err) {
      console.error(`  ✗ Indeed error: ${err.message}`);
    }
  }
  return results;
}
