// src/scrapers/wellfound.js
import fetch from 'node-fetch';
import { scrapeId, scoreJob, stripHtml, CONFIG } from './utils.js';

export async function scrapeWellfound() {
  const results = [];
  const seen = new Set();

  const roles = CONFIG.wellfoundRoles.length > 0 ? CONFIG.wellfoundRoles : [];
  if (roles.length === 0) return results;

  for (const role of roles) {
  try {
    const params = new URLSearchParams();
    params.append('role[]', role);
    params.set('remote', 'true');
    const rssUrl = `https://wellfound.com/jobs.rss?${params}`;
    const res = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000,
    });
    if (!res.ok) continue;

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
      const [jobRole, company] = title.split(/\s+[—\-–]\s+/).map(s => s.trim());
      if (!jobRole || !company) continue;

      const id = scrapeId(jobRole, company);
      if (seen.has(id)) continue;
      seen.add(id);

      const score = scoreJob(jobRole, desc);
      if (score < 0) continue;

      results.push({
        scrapeId: id,
        company,
        role: jobRole,
        salary: '',
        salaryRaw: 0,
        url: link,
        location: 'Remote',
        techStack: '',
        source: 'wellfound',
        descriptionPreview: desc.slice(0, 500),
        score,
      });
    }
  } catch (err) {
    console.error(`  ✗ Wellfound error (${role}): ${err.message}`);
  }
  }

  return results;
}