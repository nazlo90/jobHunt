// src/scrapers/utils.js
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load config from config.json
const configPath = path.join(__dirname, '../../config.json');
let CONFIG;
try {
  CONFIG = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (err) {
  console.error('Error loading config.json:', err.message);
  // Fallback
  CONFIG = {
    searchTerms: [
      'Senior Angular Developer',
      'Senior Frontend Developer TypeScript',
      'Angular Senior Frontend',
    ],
    minSalary: 50_000,
    remoteOnly: true,
    includeKeywords: ['angular','vue','typescript','rxjs','frontend','front-end','senior','lead','architect'],
    excludeKeywords: ['junior','intern','only php','wordpress developer','java developer','.net developer only'],
  };
}

// ── HELPERS ────────────────────────────────────────────────────────────────
export const scrapeId = (title, company) =>
  crypto.createHash('md5').update(`${title.toLowerCase()}${company.toLowerCase()}`).digest('hex').slice(0, 10);

export function scoreJob(title = '', description = '') {
  const text = `${title} ${description}`.toLowerCase();
  let score = 0;
  for (const kw of CONFIG.includeKeywords) if (text.includes(kw)) score++;
  for (const kw of CONFIG.excludeKeywords) if (text.includes(kw)) score -= 3;
  return score;
}

export function extractSalary(text = '') {
  const m = text.match(/\$\s*([\d,]+)\s*k?/i);
  if (!m) return { salary: '', salaryRaw: 0 };
  let val = parseInt(m[1].replace(/,/g, ''));
  if (text.toLowerCase().includes('k')) val *= 1000;
  return { salary: `$${val.toLocaleString()}`, salaryRaw: val };
}

export function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export { CONFIG };