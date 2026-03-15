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

    for (const card of cards.slice(0, 8)) { // Reduced from 10 to 8 for better quality
      const titleM  = card.match(/class="[^"]*base-search-card__title[^"]*"[^>]*>([^<]+)</);
      const compM   = card.match(/class="[^"]*base-search-card__subtitle[^"]*"[^>]*>\s*<[^>]*>\s*([^<]+)/);
      const linkM   = card.match(/href="([^"]*linkedin\.com\/jobs[^"]*)/);
      const locM    = card.match(/class="[^"]*job-search-card__location[^"]*"[^>]*>([^<]+)</);

      const role    = titleM?.[1]?.trim() || '';
      const company = compM?.[1]?.trim() || '';
      const jobUrl  = linkM?.[1] || '';
      const location = locM?.[1]?.trim() || '';

      if (!role || !company || !jobUrl) continue;

      // Try to get job description for better scoring
      let description = '';
      try {
        const jobRes = await fetch(jobUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          },
          timeout: 8000,
        });
        if (jobRes.ok) {
          const jobHtml = await jobRes.text();
          // Extract description from the job page
          const descMatch = jobHtml.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                           jobHtml.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/i);
          if (descMatch) {
            description = descMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          }
        }
      } catch (err) {
        // Ignore description fetch errors
      }

      const score = scoreJob(role, description);
      if (score < 0) continue;

      const id = scrapeId(role, company);
      results.push({
        scrapeId: id,
        company,
        role,
        salary: '',
        salaryRaw: 0,
        url: jobUrl,
        location,
        techStack: '',
        source: 'linkedin',
        descriptionPreview: description.slice(0, 500),
        score,
      });

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (err) {
    console.error(`  ✗ LinkedIn error: ${err.message}`);
  }
  return results;
}