// src/scrapers/justjoin.js
import fetch from 'node-fetch';
import { scrapeId, scoreJob, stripHtml, CONFIG } from './utils.js';

export async function scrapeJustJoin() {
  const results = [];
  try {
    const res = await fetch('https://justjoin.it/api/offers', {
      headers: { 'User-Agent': 'Mozilla/5.0 JobHuntBot/1.0' },
      timeout: 20000,
    });
    if (!res.ok) {
      console.error(`  ✗ JustJoin: public API deprecated (HTTP ${res.status}). Site is fully JS-rendered — requires Playwright to scrape.`);
      return results;
    }
    const offers = await res.json();
    const seen = new Set();

    for (const offer of offers) {
      const role = offer.title;
      const company = offer.companyName;
      if (!role || !company) continue;

      const id = scrapeId(role, company);
      if (seen.has(id)) continue;
      seen.add(id);

      const isRemote = offer.workplaceType === 'remote' || offer.remote === true;
      if (CONFIG.remoteOnly && !isRemote) continue;

      const skills = Array.isArray(offer.skills) ? offer.skills.map(s => s.name).join(', ') : '';
      const descText = stripHtml(offer.body || '');
      const score = scoreJob(role, `${descText} ${skills}`);
      if (score < 0) continue;

      let salary = '';
      let salaryRaw = 0;
      if (Array.isArray(offer.employmentTypes) && offer.employmentTypes.length > 0) {
        const s = offer.employmentTypes[0]?.salary;
        if (s?.from) {
          salary = `${s.from}–${s.to || s.from} ${s.currency || 'PLN'}`;
          salaryRaw = s.from;
        }
      }

      results.push({
        scrapeId: id,
        company,
        role,
        salary,
        salaryRaw,
        url: `https://justjoin.it/offers/${offer.id}`,
        location: isRemote ? 'Remote' : (offer.city || offer.country_code || ''),
        techStack: skills,
        source: 'justjoin',
        descriptionPreview: descText.slice(0, 500),
        score,
      });
    }
  } catch (err) {
    console.error(`  ✗ JustJoin error: ${err.message}`);
  }
  return results;
}
