// src/scrapers/dou.js
import fetch from 'node-fetch';
import { scrapeId, scoreJob, extractSalary, stripHtml } from './utils.js';

// DOU.ua RSS feeds for frontend categories
const DOU_FEEDS = [
  'https://jobs.dou.ua/vacancies/feeds/?cat=Front+End',
  'https://jobs.dou.ua/vacancies/feeds/?cat=JavaScript',
];

export async function scrapeDOU() {
  const results = [];
  const seen = new Set();

  for (const feedUrl of DOU_FEEDS) {
    try {
      const res = await fetch(feedUrl, {
        headers: { 'User-Agent': 'JobHuntBot/1.0' },
        timeout: 10000,
      });
      if (!res.ok) continue;

      const xml = await res.text();
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

      for (const item of items) {
        const get = (tag) => {
          const m = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`));
          return m ? (m[1] || m[2] || '').trim() : '';
        };

        const rawTitle = get('title');
        const link = get('link') || get('guid');
        const summary = stripHtml(get('description'));

        // DOU titles follow "Role — Company" or "Role at Company"
        let role = rawTitle;
        let company = '';

        if (rawTitle.includes(' — ')) {
          const [r, c] = rawTitle.split(' — ');
          role = r.trim();
          company = c.trim();
        } else if (rawTitle.includes(' at ')) {
          const [r, c] = rawTitle.split(' at ');
          role = r.trim();
          company = c.trim();
        } else if (rawTitle.includes(' в ')) {
          // Ukrainian "at" separator
          const [r, c] = rawTitle.split(' в ');
          role = r.trim();
          company = c.trim();
        }

        if (!company) company = get('author') || get('dc:creator') || 'DOU Company';

        const id = scrapeId(role, company);
        if (seen.has(id)) continue;
        seen.add(id);

        const score = scoreJob(role, summary);
        if (score < 0) continue;

        const { salary, salaryRaw } = extractSalary(summary);

        results.push({
          scrape_id: id,
          company,
          role,
          salary,
          salary_raw: salaryRaw,
          url: link,
          location: 'Remote',
          tech_stack: '',
          status: 'Bookmarked',
          priority: Math.min(5, Math.max(1, score + 2)),
          applied_date: '',
          contact: '',
          notes: '',
          source: 'dou',
          description_preview: summary.slice(0, 500),
        });
      }

      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  ✗ DOU error (${feedUrl}): ${err.message}`);
    }
  }

  return results;
}
