// src/scrapers/djinni.js
import fetch from 'node-fetch';
import { scrapeId, scoreJob, extractSalary, stripHtml, CONFIG } from './utils.js';

// Maps lowercase profile keywords → Djinni primary_keyword categories
const DJINNI_CATEGORY_MAP = {
  angular:      'Angular',
  react:        'React',
  vue:          'Vue.js',
  vuejs:        'Vue.js',
  javascript:   'JavaScript',
  typescript:   'TypeScript',
  node:         'Node.js',
  nodejs:       'Node.js',
  python:       'Python',
  java:         'Java',
  kotlin:       'Kotlin',
  swift:        'Swift',
  ios:          'iOS',
  android:      'Android',
  flutter:      'Flutter',
  dotnet:       '.NET',
  csharp:       'C#',
  golang:       'Golang',
  go:           'Golang',
  rust:         'Rust',
  php:          'PHP',
  ruby:         'Ruby',
  scala:        'Scala',
  devops:       'DevOps',
  qa:           'QA',
  'front-end':  'JavaScript',
  frontend:     'JavaScript',
  fullstack:    'Full Stack',
  'full-stack': 'Full Stack',
};

const BASE = 'https://djinni.co/jobs/rss/?primary_keyword=';
const EXP  = '&exp_level=4y&exp_level=6y';

/** Build Djinni RSS URLs from the active profile's strongKeywords + djinniFallbackCategories. */
function buildFeeds() {
  const categories = new Set();
  for (const kw of CONFIG.strongKeywords) {
    const cat = DJINNI_CATEGORY_MAP[kw.toLowerCase()];
    if (cat) categories.add(cat);
  }
  if (categories.size === 0) {
    for (const cat of CONFIG.djinniFallbackCategories) categories.add(cat);
  }
  return [...categories].map(cat => `${BASE}${encodeURIComponent(cat)}${EXP}`);
}

export async function scrapeDjinni() {
  const feeds = buildFeeds();
  const results = [];
  const seen = new Set();

  for (const feedUrl of feeds) {
    try {
      const res = await fetch(feedUrl, { timeout: 10000 });
      const xml = await res.text();

      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

      for (const item of items) {
        const get = (tag) => {
          const m = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`));
          return m ? (m[1] || m[2] || '').trim() : '';
        };

        const rawTitle = get('title');
        const link     = get('link') || get('guid');
        const summary  = stripHtml(get('description'));
        let company    = get('author') || get('dc:creator') || '';

        let role = rawTitle;
        if (rawTitle.includes(' at ')) {
          const [r, c] = rawTitle.split(' at ');
          role = r.trim();
          if (!company) company = c.trim();
        }

        if (!company && link) {
          const urlParts = link.split('/');
          if (urlParts.length > 4) {
            const slug = urlParts[4];
            const companySlug = slug.split('-').slice(1).join(' ');
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
          scrapeId: id,
          company,
          role,
          salary,
          salaryRaw,
          url: link,
          location: 'Remote',
          techStack: '',
          source: 'djinni',
          descriptionPreview: summary.slice(0, 500),
          score,
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
