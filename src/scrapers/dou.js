// src/scrapers/dou.js
import fetch from 'node-fetch';
import { scrapeId, scoreJob, extractSalary, stripHtml, CONFIG } from './utils.js';

const DOU_BASE = 'https://jobs.dou.ua/vacancies/feeds/?cat=';

export async function scrapeDOU() {
  const results = [];
  const seen = new Set();

  const feeds = CONFIG.douCategories.map(cat => `${DOU_BASE}${encodeURIComponent(cat)}`);
  if (feeds.length === 0) return results;

  for (const feedUrl of feeds) {
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
          scrapeId: id,
          company,
          role,
          salary,
          salaryRaw,
          url: link,
          location: 'Remote',
          techStack: '',
          source: 'dou',
          descriptionPreview: summary.slice(0, 500),
          score,
        });
      }

      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  ✗ DOU error (${feedUrl}): ${err.message}`);
    }
  }

  return results;
}
