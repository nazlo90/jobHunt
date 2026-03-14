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
├── config.json       ← Scraper keywords, search terms, filters
└── CLAUDE.md
```

## Tech Stack

- **Backend**: NestJS 11 + TypeORM + SQLite (better-sqlite3)
- **Frontend**: Angular 21 (zoneless, standalone, signals) + Angular Material 21 + NgRx Signal Store
- **AI**: Anthropic SDK (`@anthropic-ai/sdk`) — claude-opus-4-5 for CV generation
- **Scheduling**: `@nestjs/schedule` with `@Cron` decorators
- **Validation**: `class-validator` + `class-transformer`

---

## Setup

```bash
# Install dependencies for both apps
cd apps/api && npm install
cd apps/ui && npm install
```

Create `apps/api/.env` (copy from `.env.example` if present):
```env
# --- AI providers ---
# Groq — used as an alternative LLM in cvs.service.ts
GROQ_API_KEY=gsk_...

# --- Server ---
# Port the NestJS API listens on (default: 3000)
PORT=3000

# --- Database ---
# Path to SQLite file, relative to apps/api/ (default: ../../db/jobhunt.db)
DB_PATH=../../db/jobhunt.db

# --- Environment ---
NODE_ENV=development
```

> **Note:** Never commit `.env` to version control. Add it to `.gitignore`.

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
GET    /api/jobs              query: status, source, search, sortBy
GET    /api/jobs/stats        counts by status, source, etc.
GET    /api/jobs/:id          single job
POST   /api/jobs              create job
PATCH  /api/jobs/:id          update job fields
DELETE /api/jobs/:id          delete job

GET    /api/cvs               recent adapted CVs
GET    /api/cvs?job_id=:id    CVs for a specific job
POST   /api/cvs/generate      generate adapted CV via Claude API
                               body: { job_id?, job_description }

POST   /api/scraper/run       trigger manual scrape
GET    /api/scraper/status    last run info
```

---

## UI Routes

```
/dashboard        — overview stats and recent jobs
/jobs             — full job list with filters
/jobs/new         — add job manually
/jobs/:id         — job detail + CV generation
```

---

## Domain Concepts

- **Job**: scraped or manually entered job posting. Has `status` (Bookmarked → Applied → Technical → Final Round → Offer → Rejected), `priority` (1-5), `source`, `scrape_id` (MD5 dedup hash)
- **AdaptedCV**: Claude-generated tailored CV + cover letter for a specific job. Has `relevance_score`, `keywords_found`, `missing_skills`, `cover_letter`, `advice`
- **Scraper**: pulls jobs from 8 sources — Djinni (RSS), RemoteOK (API), Wellfound (HTML), Remotive (API), WeWorkRemotely (RSS), HackerNews (API), LinkedIn (HTML), Greenhouse ATS (API per company)
- **Config**: `config.json` controls `searchTerms`, `strongKeywords`, `excludeKeywords`, `remoteOnly`, `minSalary`

---

## Customize

**Scraper keywords** — edit `config.json`:
```json
{
  "searchTerms": ["Senior Angular Developer", "..."],
  "strongKeywords": ["angular", "rxjs", "..."],
  "excludeKeywords": ["junior", "intern", "..."],
  "remoteOnly": true,
  "minSalary": 80000
}
```

**Your CV** — edit `apps/api/src/cv-adapter-data.ts`:

This is the single source of truth for AI-generated CV adaptation. Fill in all fields before using the CV generator:

| Field | Description |
|---|---|
| `name`, `title`, `email`, `phone` | Your personal contact info |
| `linkedin`, `github` | Profile URLs |
| `profile` | 3–5 sentence professional summary |
| `skills` | Grouped by category (Frontend, Backend, etc.) |
| `experience` | Jobs in reverse chronological order, each with `bullets` as impact statements |
| `education` | Degrees, institutions, periods |
| `courses` | Optional certifications / online courses |
| `languages` | Languages and proficiency levels |

Tips:
- Write `bullets` as measurable impact statements: _"Did X, resulting in Y% improvement"_
- Keep `profile` general — the AI adapts it per job
- Add as many `experience` entries as needed; the AI picks the most relevant ones

**Database** — SQLite file at `db/jobhunt.db`. Do not delete — it stores all tracked jobs and adapted CVs.
