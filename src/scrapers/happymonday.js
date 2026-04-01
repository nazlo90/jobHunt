// src/scrapers/happymonday.js
// Uses HappyMonday's WordPress REST API (/wp-json/wp/v2/job).
// Company name is embedded in the job title: "Role до Company" (UA) or "Role at Company" (EN).
import fetch from 'node-fetch';
import { scrapeId, scoreJob, stripHtml, CONFIG } from './utils.js';

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#34;/g, '"');
}

function extractRoleAndCompany(rawTitle) {
  const title = decodeHtmlEntities(rawTitle || '');
  // Ukrainian "Role до Company"
  let m = title.match(/^(.+?)\s+до\s+(.+)$/i);
  if (m) return { role: m[1].trim(), company: m[2].trim() };
  // English "Role at Company" — company must start with uppercase (Latin or Cyrillic)
  m = title.match(/^(.+?)\s+at\s+([A-Z\u0400-\u04FF].+)$/);
  if (m) return { role: m[1].trim(), company: m[2].trim() };
  // Pipe separator
  m = title.match(/^(.+?)\s*\|\s*(.+)$/);
  if (m) return { role: m[1].trim(), company: m[2].trim() };
  return { role: title, company: 'HappyMonday' };
}

export async function scrapeHappyMonday() {
  const results = [];
  const seen = new Set();
  const terms = CONFIG.searchTerms.length > 0 ? CONFIG.searchTerms.slice(0, 3) : ['frontend'];

  for (const term of terms) {
    try {
      const url = `https://happymonday.ua/wp-json/wp/v2/job?per_page=100&search=${encodeURIComponent(term)}&_embed=1`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        timeout: 15000,
      });
      if (!res.ok) {
        console.error(`  ✗ HappyMonday HTTP ${res.status}`);
        continue;
      }
      const jobs = await res.json();
      if (!Array.isArray(jobs)) continue;

      for (const job of jobs) {
        const { role, company } = extractRoleAndCompany(job.title?.rendered || '');
        if (!role || !company) continue;

        const id = scrapeId(role, company);
        if (seen.has(id)) continue;
        seen.add(id);

        const desc = stripHtml(job.content?.rendered || '');
        const score = scoreJob(role, desc);
        if (score < 0) continue;

        const classList = job.class_list || [];
        const isRemote = classList.some(c => c.toLowerCase().includes('remote'));
        if (CONFIG.remoteOnly && !isRemote) continue;

        const cityClass = classList.find(c => c.startsWith('city-'));
        const location = isRemote
          ? 'Remote'
          : (cityClass ? cityClass.replace('city-', '').replace(/-/g, ' ') : '');

        results.push({
          scrapeId: id,
          company,
          role,
          salary: '',
          salaryRaw: 0,
          url: job.link || '',
          location,
          techStack: '',
          source: 'happymonday',
          descriptionPreview: desc.slice(0, 500),
          score,
        });
      }
    } catch (err) {
      console.error(`  ✗ HappyMonday error: ${err.message}`);
    }
  }
  return results;
}
