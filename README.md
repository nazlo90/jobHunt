# JobHunt — Node.js + SQLite

```
jobhunt-node/
├── src/
│   ├── db.js               ← SQLite schema + all queries (better-sqlite3)
│   ├── server.js           ← Express REST API + serves UI
│   ├── scraper.js          ← Djinni RSS, LinkedIn, RemoteOK, Wellfound
│   ├── cv-adapter.js       ← Interactive CLI: paste JD → tailored CV + cover letter
│   └── cv-adapter-data.js  ← Your master CV data (edit this file)
├── public/
│   └── index.html          ← Tracker UI (served by Express)
├── data/
│   └── jobhunt.db          ← SQLite database (auto-created)
└── package.json
```

---

## Setup

```bash
cd jobhunt-node
npm install

# Set Claude API key (get free at console.anthropic.com)
export ANTHROPIC_API_KEY=sk-ant-...

# Or add to ~/.zshrc / ~/.bashrc so it persists:
echo 'export ANTHROPIC_API_KEY=sk-ant-...' >> ~/.zshrc
```

---

## Usage

### 1. Start the tracker UI

```bash
npm start
# Opens: http://localhost:3000
```

The UI auto-refreshes every 30s, so you can keep it open while scraping.

### 2. Run the scraper (separate terminal)

```bash
npm run scrape
# Scrapes: Djinni, LinkedIn, RemoteOK, Wellfound
# New jobs go straight into SQLite → appear in UI immediately
```

**Automate with cron (run daily at 8am):**
```bash
crontab -e
# Add:
0 8 * * * cd /path/to/jobhunt-node && node src/scraper.js >> logs/scraper.log 2>&1
```

### 3. Adapt your CV per application

```bash
npm run adapt
# Paste job description, press END to finish
# Get: relevance score, rewritten bullets, cover letter

# Or link to a tracked job:
node src/cv-adapter.js --job-id 42
```

CV results are also accessible from within the tracker UI — open any job,
paste the JD, and generate directly in the browser.

---

## REST API

All endpoints if you want to script against it:

```
GET    /api/jobs              — list jobs (query: status, source, search, sortBy)
GET    /api/jobs/stats        — counts by status, source, etc.
GET    /api/jobs/:id          — single job
POST   /api/jobs              — create job
PATCH  /api/jobs/:id          — update job fields
DELETE /api/jobs/:id          — delete job

GET    /api/cvs               — recent adapted CVs
GET    /api/cvs?job_id=42     — CVs for a specific job
POST   /api/cvs/generate      — generate adapted CV via Claude API
                                body: { job_id?, job_description, company?, role? }
```

---

## Customize

**Scraper keywords** — edit `src/scraper.js`:
```js
const CONFIG = {
  searchTerms: ['Senior Angular Developer', ...],
  minSalary: 80_000,
  includeKeywords: ['angular', 'rxjs', ...],
  excludeKeywords: ['junior', 'intern', ...],
};
```

**Your CV** — edit `src/cv-adapter-data.js`:
Update bullets, add new jobs, update skills list.

**Database location** — defaults to `data/jobhunt.db`.
Change `DB_PATH` in `src/db.js`.
