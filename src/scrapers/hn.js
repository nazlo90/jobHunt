// src/scrapers/hn.js
import fetch from 'node-fetch';
import { scrapeId, scoreJob, stripHtml } from './utils.js';

async function findHNHiringThread() {
  const res = await fetch('https://hacker-news.firebaseio.com/v0/user/whoishiring.json');
  const user = await res.json();
  const submitted = (user.submitted || []).slice(0, 10);
  for (const id of submitted) {
    const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
    const item = await itemRes.json();
    if (item?.title?.includes('Who is hiring')) return id;
  }
  return null;
}

export async function scrapeHN() {
  const results = [];
  try {
    const threadId = await findHNHiringThread();
    if (!threadId) return results;

    const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${threadId}.json`);
    const data = await res.json();

    // Fetch top-level comments — each is a direct job post
    const kids = (data.kids || []).slice(0, 100);
    const comments = await Promise.all(
      kids.map(id =>
        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
          .then(r => r.json())
          .catch(() => null)
      )
    );

    for (const comment of comments) {
      if (!comment?.text) continue;
      const clean = stripHtml(comment.text);
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
        url: `https://news.ycombinator.com/item?id=${threadId}`,
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
