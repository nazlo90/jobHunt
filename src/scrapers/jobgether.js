// src/scrapers/jobgether.js
import fetch from 'node-fetch';
import { scrapeId, scoreJob, stripHtml, CONFIG } from './utils.js';

export async function scrapeJobGether() {
  const results = [];
  const seen = new Set();
  const terms = CONFIG.searchTerms.length > 0 ? CONFIG.searchTerms.slice(0, 3) : ['frontend'];

  for (const term of terms) {
    try {
      const res = await fetch(
        `https://jobgether.com/job-search?search=${encodeURIComponent(term)}&remote=true`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
          },
          timeout: 15000,
        },
      );
      if (!res.ok) {
        console.error(`  ✗ JobGether HTTP ${res.status} — site migrated to Astro with Cloudflare protection, requires Playwright.`);
        continue;
      }
      const html = await res.text();

      const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
      if (!nextDataMatch) {
        console.error(`  ✗ JobGether: no job data found — site migrated away from Next.js, requires Playwright.`);
        continue;
      }

      let jobs = [];
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const props = nextData?.props?.pageProps ?? {};
        jobs = props.jobs ?? props.opportunities ?? props.initialJobs ?? [];
      } catch {
        continue;
      }

      for (const job of jobs) {
        const role = job.title || job.position;
        const company = job.company?.name || job.companyName || job.organization;
        if (!role || !company) continue;

        const id = scrapeId(role, company);
        if (seen.has(id)) continue;
        seen.add(id);

        const desc = stripHtml(job.description || job.summary || '');
        const score = scoreJob(role, desc);
        if (score < 0) continue;

        const jobUrl =
          job.url ||
          job.link ||
          (job.slug ? `https://jobgether.com/offer/${job.slug}` : `https://jobgether.com/job/${job.id}`);

        results.push({
          scrapeId: id,
          company,
          role,
          salary: job.salary || job.compensation || '',
          salaryRaw: 0,
          url: jobUrl,
          location: 'Remote',
          techStack: Array.isArray(job.skills) ? job.skills.join(', ') : '',
          source: 'jobgether',
          descriptionPreview: desc.slice(0, 500),
          score,
        });
      }
    } catch (err) {
      console.error(`  ✗ JobGether error: ${err.message}`);
    }
  }
  return results;
}
