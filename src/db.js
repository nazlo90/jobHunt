// src/db.js
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dir = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dir, '..', 'db', 'jobhunt.db');

mkdirSync(join(__dir, '..', 'db'), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── SCHEMA ─────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    scrape_id   TEXT UNIQUE,           -- dedup hash from scraper
    company     TEXT NOT NULL,
    role        TEXT NOT NULL,
    salary      TEXT,
    salary_raw  INTEGER DEFAULT 0,     -- for numeric sorting/filtering
    url         TEXT,
    location    TEXT,
    tech_stack  TEXT,
    status      TEXT DEFAULT 'Bookmarked',
    priority    INTEGER DEFAULT 3,
    applied_date TEXT,
    contact     TEXT,
    notes       TEXT,
    source      TEXT DEFAULT 'manual', -- 'djinni' | 'linkedin' | 'indeed' | 'manual' | etc.
    description_preview TEXT,
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS adapted_cvs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id          INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
    company         TEXT,
    role            TEXT,
    relevance_score INTEGER,
    keywords_found  TEXT,              -- JSON array
    missing_skills  TEXT,              -- JSON array
    adapted_profile TEXT,
    top_experience  TEXT,              -- JSON array
    cover_letter    TEXT,
    advice          TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_jobs_status   ON jobs(status);
  CREATE INDEX IF NOT EXISTS idx_jobs_source   ON jobs(source);
  CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority DESC);
  CREATE INDEX IF NOT EXISTS idx_jobs_created  ON jobs(created_at DESC);
`);

// ── JOB QUERIES ────────────────────────────────────────────────────────────
export const jobsDb = {
  getAll(filters = {}) {
    const { status, source, search, sortBy = 'created_at', limit = 500 } = filters;
    const conditions = [];
    const params = {};

    if (status && status !== 'all') {
      conditions.push('status = :status');
      params.status = status;
    }
    if (source && source !== 'all') {
      conditions.push('source = :source');
      params.source = source;
    }
    if (search) {
      conditions.push('(company LIKE :search OR role LIKE :search OR tech_stack LIKE :search OR notes LIKE :search)');
      params.search = `%${search}%`;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderMap = {
      created_at: 'created_at DESC',
      priority:   'priority DESC, created_at DESC',
      company:    'company ASC',
      applied_date: 'applied_date DESC',
      salary:     'salary_raw DESC',
    };
    const order = orderMap[sortBy] || 'created_at DESC';

    return db.prepare(`SELECT * FROM jobs ${where} ORDER BY ${order} LIMIT ${limit}`).all(params);
  },

  getById: db.prepare('SELECT * FROM jobs WHERE id = ?').get.bind(db.prepare('SELECT * FROM jobs WHERE id = ?')),

  getStats() {
    const total     = db.prepare('SELECT COUNT(*) as n FROM jobs').get().n;
    const pipeline  = db.prepare("SELECT COUNT(*) as n FROM jobs WHERE status NOT IN ('Bookmarked','Rejected')").get().n;
    const offers    = db.prepare("SELECT COUNT(*) as n FROM jobs WHERE status = 'Offer'").get().n;
    const interviews = db.prepare("SELECT COUNT(*) as n FROM jobs WHERE status IN ('Technical','Final Round')").get().n;
    const thisWeek  = db.prepare("SELECT COUNT(*) as n FROM jobs WHERE applied_date >= date('now','-7 days')").get().n;

    const byStatus = db.prepare(`
      SELECT status, COUNT(*) as count FROM jobs GROUP BY status
    `).all();

    const bySource = db.prepare(`
      SELECT source, COUNT(*) as count FROM jobs GROUP BY source
    `).all();

    return { total, pipeline, offers, interviews, thisWeek, byStatus, bySource };
  },

  upsert(job) {
    const stmt = db.prepare(`
      INSERT INTO jobs (scrape_id, company, role, salary, salary_raw, url, location,
        tech_stack, status, priority, applied_date, contact, notes, source, description_preview)
      VALUES (:scrape_id, :company, :role, :salary, :salary_raw, :url, :location,
        :tech_stack, :status, :priority, :applied_date, :contact, :notes, :source, :description_preview)
      ON CONFLICT(scrape_id) DO NOTHING
    `);
    return stmt.run(job);
  },

  insert(job) {
    const stmt = db.prepare(`
      INSERT INTO jobs (company, role, salary, salary_raw, url, location, tech_stack,
        status, priority, applied_date, contact, notes, source)
      VALUES (:company, :role, :salary, :salary_raw, :url, :location, :tech_stack,
        :status, :priority, :applied_date, :contact, :notes, :source)
    `);
    return stmt.run(job);
  },

  update(id, fields) {
    const allowed = ['company','role','salary','salary_raw','url','location','tech_stack',
                     'status','priority','applied_date','contact','notes'];
    const sets = Object.keys(fields)
      .filter(k => allowed.includes(k))
      .map(k => `${k} = :${k}`)
      .join(', ');
    if (!sets) return;
    db.prepare(`UPDATE jobs SET ${sets}, updated_at = datetime('now') WHERE id = :id`)
      .run({ ...fields, id });
  },

  delete: db.prepare('DELETE FROM jobs WHERE id = ?').run.bind(db.prepare('DELETE FROM jobs WHERE id = ?')),

  existsByScrapeId: db.prepare('SELECT 1 FROM jobs WHERE scrape_id = ?').get.bind(
    db.prepare('SELECT 1 FROM jobs WHERE scrape_id = ?')
  ),
};

// ── CV ADAPTER QUERIES ─────────────────────────────────────────────────────
export const cvsDb = {
  insert(cv) {
    return db.prepare(`
      INSERT INTO adapted_cvs (job_id, company, role, relevance_score, keywords_found,
        missing_skills, adapted_profile, top_experience, cover_letter, advice)
      VALUES (:job_id, :company, :role, :relevance_score, :keywords_found,
        :missing_skills, :adapted_profile, :top_experience, :cover_letter, :advice)
    `).run(cv);
  },

  getForJob: db.prepare('SELECT * FROM adapted_cvs WHERE job_id = ? ORDER BY created_at DESC').all.bind(
    db.prepare('SELECT * FROM adapted_cvs WHERE job_id = ? ORDER BY created_at DESC')
  ),

  getRecent: db.prepare('SELECT * FROM adapted_cvs ORDER BY created_at DESC LIMIT 20').all.bind(
    db.prepare('SELECT * FROM adapted_cvs ORDER BY created_at DESC LIMIT 20')
  ),
};

export default db;
