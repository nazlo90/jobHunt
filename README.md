# JobHunt

Personal job hunting platform: automated multi-source scraper, job tracker, and AI-powered CV adapter.

## Monorepo Structure

```
jobHunt/
├── apps/
│   ├── api/          ← NestJS backend (port 3000)
│   └── ui/           ← Angular 21 frontend (port 4200)
├── db/
│   └── jobhunt.db    ← SQLite database (shared, DO NOT delete)
├── src/
│   └── scrapers/     ← JS/ESM scraper modules (13 sources)
├── config.json       ← Default scraper keywords, search terms, filters
└── CLAUDE.md
```

## Tech Stack

- **Backend**: NestJS 11 + TypeORM + SQLite (better-sqlite3)
- **Frontend**: Angular 21 (zoneless, standalone, signals) + Angular Material 21 + NgRx Signal Store + Tailwind CSS
- **AI/LLM**: Groq SDK (`groq-sdk`) — llama-3.3-70b-versatile for CV generation
- **Scheduling**: `@nestjs/schedule` with `@Cron` decorators
- **Validation**: `class-validator` + `class-transformer`

---

## Setup

```bash
# Install dependencies for both apps
cd apps/api && npm install
cd apps/ui && npm install
```

Create `apps/api/.env`:
```env
# --- AI providers ---
GROQ_API_KEY=gsk_...

# --- Server ---
PORT=3000

# --- Database ---
# Path to SQLite file, relative to apps/api/ (default: ../../db/jobhunt.db)
DB_PATH=../../db/jobhunt.db

# --- Environment ---
NODE_ENV=development
```

> **Note:** Never commit `.env` to version control.

---

## Running

### API (NestJS — port 3000)

```bash
cd apps/api
npm run start:dev
```

### UI (Angular — port 4200)

```bash
cd apps/ui
npm start
# Opens: http://localhost:4200
```

### Run scraper manually

```bash
cd apps/api
npm run scrape
```

Or trigger via API:
```bash
curl -X POST http://localhost:3000/api/scraper/run
```

---

## REST API

```
GET    /api/jobs                   query: status, source, search, sortBy
GET    /api/jobs/stats             counts by status, source, etc.
POST   /api/jobs/autocomplete      extract metadata from a job URL
GET    /api/jobs/:id               single job
POST   /api/jobs                   create job
PATCH  /api/jobs/:id               update job fields
DELETE /api/jobs/:id               delete job

GET    /api/cvs?job_id=:id         get latest adapted CV for a job
POST   /api/cvs/review             quick CV review (relevance score + advice)
POST   /api/cvs/adapt              full CV adaptation (cover letter, adapted text)
                                    body: { job_id?, job_description, user_cv_id }

GET    /api/scraper/status         running state & last run info
POST   /api/scraper/run            start background scrape (body: { profileId? })
POST   /api/scraper/stop           stop a running scrape

GET    /api/scraper-profiles       list all scraper profiles
POST   /api/scraper-profiles       create profile
PATCH  /api/scraper-profiles/:id   update profile
DELETE /api/scraper-profiles/:id   delete profile

GET    /api/user-cvs               list uploaded user CVs
POST   /api/user-cvs               upload CV (PDF → plain text extraction)
DELETE /api/user-cvs/:id           delete user CV
```

---

## UI Routes

```
/dashboard    — overview stats, scraper trigger, profile selector
/jobs         — full job list with filters (status, source, search)
/jobs/new     — add job manually (with URL autocomplete)
/jobs/:id     — job detail + CV review + cover letter
/settings     — scraper config, profile management, user CV upload
```

---

## Domain Concepts

- **Job**: scraped or manually entered job posting. Has `status` (New → Saved → Applied → Screening → Technical → Final Round → Offer/Rejected/Archived), `priority` (1–5), `source`, `scrape_id` (MD5 dedup hash)
- **AdaptedCV**: LLM-generated tailored CV + cover letter for a specific job. Has `relevance_score`, `keywords_found`, `missing_skills`, `adapted_cv_text`, `cover_letter`, `advice`
- **UserCv**: your own CV uploaded as PDF, stored as extracted plain text, used as input for CV generation
- **ScraperProfile**: named configuration set (search terms, keywords, source-specific settings). Switch profiles in Settings to run different search strategies
- **Scraper**: pulls jobs from 13 sources — Djinni (RSS), RemoteOK (API), Wellfound (HTML), Remotive (API), WeWorkRemotely (RSS), HackerNews (API), LinkedIn (HTML), Greenhouse ATS (API per company), Himalayas (API), Jobicy (API), TheMuse (API), DOU.ua (API)
- **Config**: `config.json` holds default `searchTerms`, `strongKeywords`, `excludeKeywords`, `remoteOnly`, `minSalary`. Overridden per-profile in Settings

---

## Customize

### Scraper keywords

Edit `config.json` for global defaults, or manage per-profile in the **Settings → Scraper Config** UI:

```json
{
  "searchTerms": ["Senior Angular Developer", "..."],
  "strongKeywords": ["angular", "rxjs", "..."],
  "excludeKeywords": ["junior", "intern", "..."],
  "remoteOnly": true,
  "minSalary": 50000
}
```

### Source-specific settings (per ScraperProfile)

```json
{
  "greenhouseCompanies": ["stripe", "airbnb"],
  "douCategories": ["Front End", "JavaScript"],
  "remoteOKCategories": ["frontend"],
  "theMuseCategories": ["Software Engineer"],
  "theMuseLevels": ["Senior Level"],
  "wellfoundRoles": ["Frontend Engineer"]
}
```

### Your CV

Upload your CV as a PDF via **Settings → CV Manager**. The extracted text is stored in the database and used as input for AI-powered CV generation.

### Database

SQLite file at `db/jobhunt.db`. Do not delete — it stores all tracked jobs, adapted CVs, and scraper profiles.
