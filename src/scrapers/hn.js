// src/scrapers/hn.js
import fetch from 'node-fetch';
import { scrapeId, scoreJob, stripHtml } from './utils.js';

export async function scrapeHN() {
  const results = [];
  try {
    const res = await fetch('https://hacker-news.firebaseio.com/v0/item/37570037.json');
    const data = await res.json();

    const text = data.text || '';

    const posts = text.split('<p>');

    for (const p of posts.slice(0, 50)) {
      const clean = stripHtml(p);

      if (!clean.toLowerCase().includes('remote')) continue;

      const role = clean.slice(0, 80);
      const company = 'HN Hiring';

      const score = scoreJob(role, clean);
      if (score < 0) continue;

      results.push({
        scrape_id: scrapeId(role, company),
        company,
        role,
        salary: '',
        salary_raw: 0,
        url: 'https://news.ycombinator.com/item?id=37570037',
        location: 'Remote',
        tech_stack: '',
        status: 'Bookmarked',
        priority: Math.min(5, Math.max(1, score + 2)),
        applied_date: '',
        contact: '',
        notes: '',
        source: 'hackernews',
        description_preview: clean.slice(0, 500),
      });
    }
  } catch (err) {
    console.error(`  ✗ HN error: ${err.message}`);
  }
  return results;
}