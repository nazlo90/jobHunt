// src/scrapers/utils.js
import crypto from 'crypto';

// Config is always set via setConfig() before scraping.
// No defaults loaded from file — all values come from the active scraper profile.
let CONFIG = {
  // Scoring / filtering
  searchTerms: [],
  minSalary: 0,
  remoteOnly: false,
  strongKeywords: [],
  additionalKeywords: [],
  excludeTitle: [],
  excludeKeywords: [],
  requireStrongMatch: false,
  minScore: 0,

  // Source-specific settings (all configurable via profile.sourceConfig)
  greenhouseCompanies: [],        // list of Greenhouse ATS company slugs
  douCategories: [],              // DOU.ua feed categories e.g. ['Front End', 'JavaScript']
  remoteOKCategories: [],         // RemoteOK category slugs e.g. ['frontend', 'javascript']
  remotiveCategory: '',           // Remotive API category e.g. 'software-dev'
  wwrCategory: '',                // WeWorkRemotely RSS category e.g. 'remote-programming-jobs'
  theMuseCategories: [],          // The Muse job categories e.g. ['Software Engineer']
  theMuseLevels: [],              // The Muse experience levels e.g. ['Senior Level']
  wellfoundRoles: [],             // Wellfound role filters e.g. ['Frontend Engineer']
  djinniFallbackCategories: [],   // Djinni fallback if strongKeywords don't map to any category
};

// ── HELPERS ────────────────────────────────────────────────────────────────
export const scrapeId = (title, company) =>
  crypto.createHash('md5').update(`${title.trim().toLowerCase()}${company.trim().toLowerCase()}`).digest('hex').slice(0, 10);

/** Maps a raw score to a 1–5 priority star rating. */
export function rawScoreToPriority(score) {
  if (score <= 0) return 1;
  if (score <= 2) return 2;
  if (score <= 4) return 3;
  if (score <= 6) return 4;
  return 5;
}

export function scoreJob(title = '', description = '') {
  const titleLow = title.toLowerCase();
  const descLow = description.toLowerCase();
  let score = 0;
  let titleHasStrong = false;
  let descHasStrong = false;

  // Title strong keyword match is worth more — it means the role IS the right type
  for (const kw of CONFIG.strongKeywords) {
    if (titleLow.includes(kw.toLowerCase())) {
      titleHasStrong = true;
      break;
    }
  }

  if (titleHasStrong) {
    score += 4;
  } else {
    // Description strong keyword match (only if not already in title)
    for (const kw of CONFIG.strongKeywords) {
      if (descLow.includes(kw.toLowerCase())) {
        descHasStrong = true;
        score += 2;
        break;
      }
    }
  }

  // Additional keywords in title (+2) or description (+1)
  for (const kw of CONFIG.additionalKeywords) {
    if (titleLow.includes(kw.toLowerCase())) score += 2;
    else if (descLow.includes(kw.toLowerCase())) score += 1;
  }

  // Exclude keywords in title = hard reject
  const titleExclusions = CONFIG.excludeTitle.length ? CONFIG.excludeTitle : CONFIG.excludeKeywords;
  for (const kw of titleExclusions) {
    if (titleLow.includes(kw.toLowerCase())) return -999;
  }

  // Exclude in description only matters if there's no strong title match
  if (!titleHasStrong) {
    for (const kw of CONFIG.excludeKeywords) {
      if (descLow.includes(kw.toLowerCase())) score -= 3;
    }
  }

  // requireStrongMatch: job must contain at least one strong keyword (independent of minScore)
  if (CONFIG.requireStrongMatch && !titleHasStrong && !descHasStrong) {
    return -999;
  }

  // minScore (1–5): filter out jobs whose normalized priority is below the threshold
  if (CONFIG.minScore > 1 && rawScoreToPriority(score) < CONFIG.minScore) {
    return -999;
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

/** Fully replaces the active config from a scraper profile object. */
export function setConfig(profile) {
  CONFIG.searchTerms       = Array.isArray(profile.searchTerms)       ? profile.searchTerms       : [];
  CONFIG.minSalary         = typeof profile.minSalary === 'number'    ? profile.minSalary         : 0;
  CONFIG.remoteOnly        = profile.remoteOnly === true;
  CONFIG.strongKeywords    = Array.isArray(profile.strongKeywords)    ? profile.strongKeywords    : [];
  CONFIG.additionalKeywords= Array.isArray(profile.additionalKeywords)? profile.additionalKeywords: [];
  CONFIG.excludeTitle      = Array.isArray(profile.excludeTitle)      ? profile.excludeTitle      : [];
  CONFIG.excludeKeywords   = Array.isArray(profile.excludeKeywords)   ? profile.excludeKeywords   : [];
  CONFIG.requireStrongMatch= profile.requireStrongMatch === true;
  CONFIG.minScore          = typeof profile.minScore === 'number'     ? profile.minScore          : 0;

  // Source-specific config — all come from profile.sourceConfig object
  const sc = profile.sourceConfig ?? {};
  CONFIG.greenhouseCompanies      = Array.isArray(sc.greenhouseCompanies)      ? sc.greenhouseCompanies      : [];
  CONFIG.douCategories            = Array.isArray(sc.douCategories)            ? sc.douCategories            : [];
  CONFIG.remoteOKCategories       = Array.isArray(sc.remoteOKCategories)       ? sc.remoteOKCategories       : [];
  CONFIG.remotiveCategory         = typeof sc.remotiveCategory === 'string'    ? sc.remotiveCategory         : '';
  CONFIG.wwrCategory              = typeof sc.wwrCategory === 'string'         ? sc.wwrCategory              : '';
  CONFIG.theMuseCategories        = Array.isArray(sc.theMuseCategories)        ? sc.theMuseCategories        : [];
  CONFIG.theMuseLevels            = Array.isArray(sc.theMuseLevels)            ? sc.theMuseLevels            : [];
  CONFIG.wellfoundRoles           = Array.isArray(sc.wellfoundRoles)           ? sc.wellfoundRoles           : [];
  CONFIG.djinniFallbackCategories = Array.isArray(sc.djinniFallbackCategories) ? sc.djinniFallbackCategories : [];
}

export { CONFIG };
