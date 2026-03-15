// src/scrapers/wwr.js
import fetch from 'node-fetch';
import { scrapeId, scoreJob, stripHtml, CONFIG } from './utils.js';

export async function scrapeWWR() {
  const results = [];
  const wwrCategory = CONFIG.wwrCategory;
  if (!wwrCategory) return results;

  try {
    const res = await fetch(`https://weworkremotely.com/categories/${encodeURIComponent(wwrCategory)}.rss`);
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
        scrapeId: scrapeId(role, company),
        company,
        role,
        salary: '',
        salaryRaw: 0,
        url: link,
        location: 'Remote',
        techStack: '',
        source: 'weworkremotely',
        descriptionPreview: desc.slice(0, 500),
        score,
      });
    }
  } catch (err) {
    console.error(`  ✗ WWR error: ${err.message}`);
  }
  return results;
}