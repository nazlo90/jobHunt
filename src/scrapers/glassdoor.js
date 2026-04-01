// src/scrapers/glassdoor.js
// Note: Glassdoor has heavy bot protection; results will vary.
// Attempts to extract job data from Apollo GraphQL cache in the page.
import fetch from 'node-fetch';
import { scrapeId, scoreJob, stripHtml, CONFIG } from './utils.js';

export async function scrapeGlassdoor() {
  const results = [];
  const seen = new Set();
  const terms = CONFIG.searchTerms.length > 0 ? CONFIG.searchTerms.slice(0, 2) : ['frontend developer'];

  for (const term of terms) {
    try {
      const params = new URLSearchParams({
        suggestCount: '0',
        suggestChosen: 'false',
        clickSource: 'searchBtn',
        typedKeyword: term,
        'sc.keyword': term,
        locT: 'N',
        locId: '',
        jobType: '',
      });
      const res = await fetch(`https://www.glassdoor.com/Job/jobs.htm?${params}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 15000,
      });
      if (!res.ok) {
        console.error(`  ✗ Glassdoor HTTP ${res.status}`);
        continue;
      }
      const html = await res.text();

      // Try Apollo GraphQL state cache
      const apolloMatch = html.match(/window\.__APOLLO_STATE__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
      if (!apolloMatch) continue;

      let state;
      try {
        state = JSON.parse(apolloMatch[1]);
      } catch {
        continue;
      }

      for (const [key, val] of Object.entries(state)) {
        if (!key.startsWith('JobListing') || !val.jobTitleText) continue;

        const role = val.jobTitleText;
        const company = val.employerName || val.employer?.name;
        if (!role || !company) continue;

        const id = scrapeId(role, company);
        if (seen.has(id)) continue;
        seen.add(id);

        const desc = stripHtml(val.jobDescriptionText || '');
        const score = scoreJob(role, desc);
        if (score < 0) continue;

        results.push({
          scrapeId: id,
          company,
          role,
          salary: val.salaryText || '',
          salaryRaw: 0,
          url: val.jobLink ? `https://www.glassdoor.com${val.jobLink}` : '',
          location: val.locationName || '',
          techStack: '',
          source: 'glassdoor',
          descriptionPreview: desc.slice(0, 500),
          score,
        });
      }
    } catch (err) {
      console.error(`  ✗ Glassdoor error: ${err.message}`);
    }
  }
  return results;
}
