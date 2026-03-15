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
    strongKeywords: ['angular', 'react', 'vue', 'frontend', 'front-end', 'typescript'],
    additionalKeywords: ['rxjs', 'javascript', 'ui', 'ux', 'senior', 'lead', 'architect'],
    includeKeywords: ['angular','vue','typescript','rxjs','frontend','front-end','senior','lead','architect'],
    excludeKeywords: ['junior','intern','only php','wordpress developer','java developer','.net developer only'],
  };
}

// ── HELPERS ────────────────────────────────────────────────────────────────
export const scrapeId = (title, company) =>
  crypto.createHash('md5').update(`${title.trim().toLowerCase()}${company.trim().toLowerCase()}`).digest('hex').slice(0, 10);

export function scoreJob(title = '', description = '') {
  const titleLow = title.toLowerCase();
  const descLow = description.toLowerCase();
  let score = 0;
  let titleHasStrong = false;

  // Title strong keyword match is worth more — it means the role IS frontend
  for (const kw of CONFIG.strongKeywords) {
    if (titleLow.includes(kw)) {
      titleHasStrong = true;
      score += 4;
      break;
    }
  }

  // Description strong keyword match (only if not already in title)
  if (!titleHasStrong) {
    for (const kw of CONFIG.strongKeywords) {
      if (descLow.includes(kw)) {
        score += 2;
        break;
      }
    }
  }

  // Additional keywords in title (+2) or description (+1)
  for (const kw of CONFIG.additionalKeywords) {
    if (titleLow.includes(kw)) score += 2;
    else if (descLow.includes(kw)) score += 1;
  }

  // Exclude keywords in title = hard reject
  for (const kw of (CONFIG.excludeTitle || CONFIG.excludeKeywords)) {
    if (titleLow.includes(kw)) return -999;
  }

  // Exclude in description only matters if there's no strong title match
  if (!titleHasStrong) {
    for (const kw of CONFIG.excludeKeywords) {
      if (descLow.includes(kw)) score -= 3;
    }
  }

  if (CONFIG.requireStrongMatch && score < (CONFIG.minScore ?? 2)) {
    return -999; // No meaningful frontend signal
  }

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

export function setConfig(overrides) {
  Object.assign(CONFIG, overrides);
}

export { CONFIG };