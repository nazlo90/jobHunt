// src/scraper.js
// Run: node src/scraper.js
// Cron: 0 8 * * * cd /path/to/jobhunt-node && node src/scraper.js

import { jobsDb } from './db.js';
import { CONFIG } from './scrapers/utils.js';
import * as scrapers from './scrapers/index.js';

// ── MAIN ───────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  console.log('='.repeat(60));
  console.log('  JOB SCRAPER');
  console.log(`  ${new Date().toLocaleString()}`);
  console.log('='.repeat(60));

  const allJobs = [];

  // 1. Djinni
  console.log('\n📡 Djinni RSS...');
  const djinni = await scrapers.scrapeDjinni();
  console.log(`   ${djinni.length} relevant jobs`);
  allJobs.push(...djinni);

  // 2. RemoteOK
  console.log('\n📡 RemoteOK...');
  const remoteok = await scrapers.scrapeRemoteOK();
  console.log(`   ${remoteok.length} relevant jobs`);
  allJobs.push(...remoteok);
  await sleep(1000);

  // 3. Wellfound
  console.log('\n📡 Wellfound...');
  const wellfound = await scrapers.scrapeWellfound();
  console.log(`   ${wellfound.length} relevant jobs`);
  allJobs.push(...wellfound);
  await sleep(1000);

  // 4. Remotive
  console.log('\n📡 Remotive...');
  const remotive = await scrapers.scrapeRemotive();
  console.log(`   ${remotive.length} relevant jobs`);
  allJobs.push(...remotive);

  // 5. WeWorkRemotely
  console.log('\n📡 WeWorkRemotely...');
  const wwr = await scrapers.scrapeWWR();
  console.log(`   ${wwr.length} relevant jobs`);
  allJobs.push(...wwr);

  // 6. HackerNews
  console.log('\n📡 HackerNews...');
  const hn = await scrapers.scrapeHN();
  console.log(`   ${hn.length} relevant jobs`);
  allJobs.push(...hn);

  // 7. LinkedIn (per search term)
  for (const term of CONFIG.searchTerms) {
    console.log(`\n📡 LinkedIn: "${term}"...`);
    const linkedin = await scrapers.scrapeLinkedIn(term);
    console.log(`   ${linkedin.length} relevant jobs`);
    allJobs.push(...linkedin);
    await sleep(2000);
  }

  // 8. Greenhouse ATS
  const greenhouseCompanies = ['stripe', 'airbnb', 'notion', 'figma', 'coinbase', 'discord', 'openai', 'shopify'];
  for (const company of greenhouseCompanies) {
    console.log(`\n📡 Greenhouse: ${company}...`);
    const greenhouse = await scrapers.scrapeGreenhouse(company);
    console.log(`   ${greenhouse.length} relevant jobs`);
    allJobs.push(...greenhouse);
    await sleep(1000);
  }

  // 9. Insert new (dedup by scrape_id via ON CONFLICT DO NOTHING)
  let inserted = 0;
  for (const job of allJobs) {
    if (!jobsDb.existsByScrapeId(job.scrape_id)) {
      jobsDb.upsert(job);
      inserted++;
    }
  }

  console.log(`\n✅ ${inserted} NEW jobs added to database (${allJobs.length} total scraped)`);

  if (inserted > 0) {
    const top = jobsDb.getAll({ sortBy: 'priority', limit: 5 });
    console.log('\n🎯 Top bookmarked jobs:');
    for (const j of top.filter(j => j.status === 'Bookmarked').slice(0, 5)) {
      console.log(`   [${j.priority}★] ${j.company} — ${j.role} ${j.salary}`);
    }
  }

  console.log('\nDone. Open http://localhost:3000 to review.\n');
}

run().catch(console.error);
