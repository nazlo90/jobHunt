// src/scrapers/linkedin.js
import fetch from 'node-fetch';
import { scrapeId, scoreJob } from './utils.js';

export async function scrapeLinkedIn(searchTerm) {
  const results = [];
  try {
    const query = encodeURIComponent(searchTerm);
    const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${query}&location=Worldwide&f_WT=2&start=0`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 12000,
    });

    if (!res.ok) return results;
    const html = await res.text();

    // Parse job cards from LinkedIn's guest API HTML
    const cards = html.match(/<li[^>]*>([\s\S]*?)<\/li>/g) || [];

    for (const card of cards.slice(0, 15)) {
      const titleM  = card.match(/class="[^"]*base-search-card__title[^"]*"[^>]*>([^<]+)</);
      const compM   = card.match(/class="[^"]*base-search-card__subtitle[^"]*"[^>]*>\s*<[^>]*>\s*([^<]+)/);
      const linkM   = card.match(/href="([^"]*linkedin\.com\/jobs[^"]*)/);
      const locM    = card.match(/class="[^"]*job-search-card__location[^"]*"[^>]*>([^<]+)</);

      const role    = titleM?.[1]?.trim() || '';
      const company = compM?.[1]?.trim() || '';
      const url     = linkM?.[1] || '';
      const location = locM?.[1]?.trim() || '';

      if (!role || !company) continue;

      const score = scoreJob(role, '');
      if (score < 0) continue;

      const id = scrapeId(role, company);
      results.push({
        scrape_id: id,
        company,
        role,
        salary: '',
        salary_raw: 0,
        url,
        location,
        tech_stack: '',
        status: 'Bookmarked',
        priority: Math.min(5, Math.max(1, score + 2)),
        applied_date: '',
        contact: '',
        notes: '',
        source: 'linkedin',
        description_preview: '',
      });
    }
  } catch (err) {
    console.error(`  ✗ LinkedIn error: ${err.message}`);
  }
  return results;
}