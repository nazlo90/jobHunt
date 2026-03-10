// src/scrapers/wellfound.js
import fetch from 'node-fetch';
import { scrapeId, scoreJob, stripHtml } from './utils.js';

export async function scrapeWellfound() {
  const results = [];
  try {
    const url = 'https://wellfound.com/jobs/search?role%5B%5D=Frontend+Engineer&remote=true';
    // Wellfound doesn't have a free public API, but their job listings are indexable
    // This fetches their sitemap/RSS if available
    const rssUrl = 'https://wellfound.com/jobs.rss?role%5B%5D=Frontend+Engineer&remote=true';
    const res = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000,
    });
    if (!res.ok) return results;

    const xml = await res.text();
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

    for (const item of items.slice(0, 20)) {
      const get = (tag) => {
        const m = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}>([^<]*)<\\/${tag}>`));
        return m ? (m[1] || m[2] || '').trim() : '';
      };
      const title = get('title');
      const link  = get('link') || get('guid');
      const desc  = stripHtml(get('description'));

      // Parse "Role — Company" format
      const [role, company] = title.split(/\s+[—\-–]\s+/).map(s => s.trim());
      if (!role || !company) continue;

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
        source: 'wellfound',
        description_preview: desc.slice(0, 500),
      });
    }
  } catch (err) {
    console.error(`  ✗ Wellfound error: ${err.message}`);
  }
  return results;
}