// src/scrapers/totaljobs.js
import fetch from 'node-fetch';
import { scrapeId, scoreJob, stripHtml, extractSalary, CONFIG } from './utils.js';

export async function scrapeTotalJobs() {
  const results = [];
  const seen = new Set();
  const terms = CONFIG.searchTerms.length > 0 ? CONFIG.searchTerms.slice(0, 3) : ['frontend developer'];

  for (const term of terms) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const url = `https://www.totaljobs.com/jobs/rss?keywords=${encodeURIComponent(term)}&postedwithin=7`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JobHuntBot/1.0)',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
      });
      if (!res.ok) {
        console.error(`  ✗ TotalJobs HTTP ${res.status}`);
        clearTimeout(timer);
        continue;
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('xml')) {
        console.error(`  ✗ TotalJobs: RSS blocked by bot protection (got ${ct || 'no content-type'})`);
        clearTimeout(timer);
        continue;
      }
      const xml = await res.text();
      clearTimeout(timer);
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

      for (const item of items) {
        const get = (tag) => {
          const m = item.match(
            new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`),
          );
          return m ? (m[1] || m[2] || '').trim() : '';
        };

        const rawTitle = get('title');
        const link = get('link') || get('guid');
        const desc = stripHtml(get('description'));

        // TotalJobs title formats: "Role | Company" or "Role at Company"
        let role = rawTitle;
        let company = '';
        if (rawTitle.includes(' | ')) {
          [role, company] = rawTitle.split(' | ').map(s => s.trim());
        } else if (rawTitle.includes(' at ')) {
          [role, company] = rawTitle.split(' at ').map(s => s.trim());
        }
        if (!company) company = get('dc:creator') || get('author') || 'TotalJobs';

        const id = scrapeId(role, company);
        if (seen.has(id)) continue;
        seen.add(id);

        const score = scoreJob(role, desc);
        if (score < 0) continue;

        const { salary, salaryRaw } = extractSalary(desc);
        if (CONFIG.minSalary > 0 && salaryRaw > 0 && salaryRaw < CONFIG.minSalary) continue;

        results.push({
          scrapeId: id,
          company,
          role,
          salary,
          salaryRaw,
          url: link,
          location: get('job:location') || get('location') || 'UK',
          techStack: '',
          source: 'totaljobs',
          descriptionPreview: desc.slice(0, 500),
          score,
        });
      }
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        console.error(`  ✗ TotalJobs timeout after 15s`);
      } else {
        console.error(`  ✗ TotalJobs error: ${err.message}`);
      }
    }
  }
  return results;
}
