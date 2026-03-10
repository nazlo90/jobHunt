// src/scrapers/djinni.js
import fetch from 'node-fetch';
import { scrapeId, scoreJob, extractSalary, stripHtml, CONFIG } from './utils.js';

// ── DJINNI RSS ─────────────────────────────────────────────────────────────
const DJINNI_FEEDS = [
  'https://djinni.co/jobs/rss/?primary_keyword=Angular&exp_level=4y&exp_level=6y',
  'https://djinni.co/jobs/rss/?primary_keyword=React&exp_level=4y&exp_level=6y',
  'https://djinni.co/jobs/rss/?primary_keyword=JavaScript&exp_level=4y&exp_level=6y&english_level=upper',
];

export async function scrapeDjinni() {
  const results = [];
  const seen = new Set();

  for (const feedUrl of DJINNI_FEEDS) {
    try {
      const res = await fetch(feedUrl, { timeout: 10000 });
      const xml = await res.text();

      // Simple XML parser — no external deps needed for RSS
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

      for (const item of items) {
        const get = (tag) => {
          const m = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`));
          return m ? (m[1] || m[2] || '').trim() : '';
        };

        const rawTitle  = get('title');
        const link      = get('link') || get('guid');
        const summary   = stripHtml(get('description'));
        let company     = get('author') || get('dc:creator') || '';

        // "Role Title at Company" pattern
        let role = rawTitle;
        if (rawTitle.includes(' at ')) {
          const [r, c] = rawTitle.split(' at ');
          role = r.trim();
          if (!company) company = c.trim();
        }

        // Fallback: extract company from URL slug
        if (!company && link) {
          const urlParts = link.split('/');
          if (urlParts.length > 4) {
            const slug = urlParts[4]; // e.g. 123-company-name
            const companySlug = slug.split('-').slice(1).join(' '); // company name
            company = companySlug.charAt(0).toUpperCase() + companySlug.slice(1);
          }
        }

        if (!company) company = 'Djinni Company';

        const id = scrapeId(role, company);
        if (seen.has(id)) continue;
        seen.add(id);

        const score = scoreJob(role, summary);
        if (score < 0) continue;

        const { salary, salaryRaw } = extractSalary(summary);
        if (CONFIG.minSalary > 0 && salaryRaw > 0 && salaryRaw < CONFIG.minSalary) continue;

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
          source: 'djinni',
          description_preview: summary.slice(0, 500),
        });
      }

      await sleep(1000);
    } catch (err) {
      console.error(`  ✗ Djinni feed error (${feedUrl}): ${err.message}`);
    }
  }

  return results;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }