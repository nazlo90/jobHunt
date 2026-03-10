// src/scrapers/wwr.js
import fetch from 'node-fetch';
import { scrapeId, scoreJob, stripHtml } from './utils.js';

export async function scrapeWWR() {
  const results = [];
  try {
    const res = await fetch('https://weworkremotely.com/categories/remote-programming-jobs.rss');
    const xml = await res.text();

    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

    for (const item of items) {
      const get = (tag) => {
        const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
        return m ? stripHtml(m[1]) : '';
      };

      const title = get('title');
      const link = get('link');
      const desc = get('description');

      const [company, role] = title.split(':').map(s => s.trim());
      if (!company || !role) continue;

      const score = scoreJob(role, desc);
      if (score < 0) continue;

      results.push({
        scrape_id: scrapeId(role, company),
        company,
        role,
        salary: '',
        salary_raw: 0,
        url: link,
        location: 'Remote',
        tech_stack: '',
        status: 'Bookmarked',
        priority: Math.min(5, Math.max(1, score + 2)),
        applied_date: '',
        contact: '',
        notes: '',
        source: 'weworkremotely',
        description_preview: desc.slice(0, 500),
      });
    }
  } catch (err) {
    console.error(`  ✗ WWR error: ${err.message}`);
  }
  return results;
}