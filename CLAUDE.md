# JobHunt — Claude Context

## Project Overview
Personal job hunting platform: automated multi-source scraper, job tracker, and AI-powered CV adapter.

## Monorepo Structure
```
jobHunt/
├── apps/
│   ├── api/          ← NestJS backend (port 3000)
│   └── ui/           ← Angular frontend (port 4200)
├── db/
│   └── jobhunt.db    ← SQLite database (shared, DO NOT delete)
├── config.json       ← Scraper keywords, search terms, filters
├── .claude/
│   └── settings.json ← MCP server configs
└── CLAUDE.md
```

## Tech Stack
- **Backend**: NestJS + TypeORM + SQLite (better-sqlite3 / typeorm sqlite driver)
- **Frontend**: Angular 21 (zoneless, standalone, signals) + Angular Material 21 + NgRx Signal Store
- **AI**: Anthropic SDK (`@anthropic-ai/sdk`) — claude-opus-4-5 for CV generation
- **Scheduling**: `@nestjs/schedule` with `@Cron` decorators
- **Validation**: `class-validator` + `class-transformer`

## Key Domain Concepts
- **Job**: scraped or manually entered job posting. Has `status` (Bookmarked → Applied → Technical → Final Round → Offer → Rejected), `priority` (1-5), `source` (djinni/linkedin/remoteok/etc), `scrape_id` (MD5 dedup hash)
- **AdaptedCV**: Claude-generated tailored CV + cover letter for a specific job. Has `relevance_score`, `keywords_found`, `missing_skills`, `cover_letter`, `advice`
- **Scraper**: pulls jobs from 8 sources: Djinni (RSS), RemoteOK (API), Wellfound (HTML), Remotive (API), WeWorkRemotely (RSS), HackerNews (API), LinkedIn (HTML), Greenhouse ATS (API per company)
- **Config**: `config.json` controls `searchTerms`, `strongKeywords`, `excludeKeywords`, `remoteOnly`, `minSalary`

## Database Schema
```sql
jobs (id, scrape_id UNIQUE, company, role, salary, salary_raw, url, location,
      tech_stack, status, priority, applied_date, contact, notes, source,
      description_preview, created_at, updated_at)

adapted_cvs (id, job_id FK→jobs, company, role, relevance_score,
             keywords_found JSON, missing_skills JSON, adapted_profile,
             top_experience JSON, cover_letter, advice, created_at)
```

## API Routes (NestJS)
```
GET    /api/jobs              query: status, source, search, sortBy
GET    /api/jobs/stats
GET    /api/jobs/:id
POST   /api/jobs
PATCH  /api/jobs/:id
DELETE /api/jobs/:id
GET    /api/cvs?job_id=:id
POST   /api/cvs/generate      body: { job_id?, job_description }
POST   /api/scraper/run       trigger manual scrape
GET    /api/scraper/status    last run info
```

## MCP Servers (active in this project)
- **sqlite** — query `db/jobhunt.db` directly. Use to answer questions about job data.
- **playwright** — browser automation. Use for debugging scrapers or exploring job sites.
- **fetch** — HTTP fetch. Use for testing scraper endpoints.

## Installed Skills
- `nestjs-best-practices` — 40 rules: architecture, DI, error handling, security, performance
- `typescript-advanced-types` — generics, conditional types, mapped types
- `playwright-best-practices` — E2E testing patterns, debugging
- `webapp-testing` — Python Playwright for integration tests
- `typescript-mcp-server-generator` — generate TypeScript MCP servers
- `mcp-builder` — 4-phase MCP server development workflow

## User Preferences
- Familiar with Angular and NestJS — prefer these over alternatives
- Remote-only senior frontend roles (Angular/TypeScript focus)
- Keep existing SQLite DB at `db/jobhunt.db` — do not migrate data
- Use standalone Angular components (Angular 17+ style)
- Use signals over RxJS where practical in Angular

## Rules (ALWAYS follow)
1. **Minimal change** — touch only what's needed. Don't refactor surrounding code.
2. **Root cause only** — fix the actual problem, not symptoms. No band-aids.
3. **No speculative code** — don't add error handling, abstractions, or features not asked for.
4. **Plan before code** — for any non-trivial change, list files + steps before writing code.
5. **Never delete `db/jobhunt.db`** — it contains real data.
6. **NestJS**: business logic in service, never in controller. DTOs always validated.
7. **Angular**: standalone components, signals > RxJS, no memory leaks (unsubscribe/takeUntilDestroyed).
8. **TypeScript**: no `any`, no unused imports, proper return types on public methods.

## Anti-patterns (NEVER do these)
- Don't add comments explaining obvious code
- Don't add try/catch around code that can't fail
- Don't create helper functions used only once
- Don't add backwards-compatibility shims for removed code
- Don't mock SQLite in tests — use real DB file

## Common Tasks
- "Run scraper" → `cd apps/api && npm run scrape`
- "Start API" → `cd apps/api && npm run start:dev`
- "Start UI" → `cd apps/ui && ng serve`
- "Check jobs" → use sqlite MCP: `SELECT * FROM jobs ORDER BY created_at DESC LIMIT 10`
- "Add a scraper" → create `apps/api/src/scraper/scrapers/*.scraper.ts`, implement `BaseScraper`
