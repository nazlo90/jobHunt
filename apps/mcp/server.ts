import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import Database from 'better-sqlite3';
import * as path from 'node:path';
import * as url from 'node:url';
import { z } from 'zod';

// ── Config ──────────────────────────────────────────────────────────────────

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH ?? path.resolve(__dirname, '../../db/jobhunt.db');
const USER_ID = parseInt(process.env.MCP_USER_ID ?? '1', 10);

const db = new Database(DB_PATH, { readonly: false });
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema constants ─────────────────────────────────────────────────────────

const JOB_STATUS = z.enum([
  'New', 'Saved', 'Applied', 'Screening', 'Technical',
  'Final Round', 'Offer', 'Rejected', 'Archived',
]);

const JOB_COLS = `
  id, company, role, status, priority, source, salary, url,
  location, tech_stack, notes, applied_date,
  description_preview, created_at, updated_at
`.trim();

// ── Server ───────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'jobhunt',
  version: '1.0.0',
});

// ── Tool: search_jobs ────────────────────────────────────────────────────────

server.tool(
  'search_jobs',
  'Search and filter jobs from the JobHunt database. Returns up to 50 matching jobs.',
  {
    query:   z.string().optional().describe('Text to match against company, role, or notes'),
    status:  JOB_STATUS.optional().describe('Filter by pipeline status'),
    source:  z.string().optional().describe('Filter by source e.g. linkedin, djinni, remoteok'),
    sort_by: z.enum(['created_at', 'updated_at', 'priority', 'company']).optional().default('created_at'),
    limit:   z.number().int().min(1).max(50).optional().default(20),
  },
  async ({ query, status, source, sort_by = 'created_at', limit = 20 }) => {
    let sql = `SELECT ${JOB_COLS} FROM jobs WHERE user_id = ?`;
    const params: unknown[] = [USER_ID];

    if (query) {
      sql += ` AND (company LIKE ? OR role LIKE ? OR notes LIKE ?)`;
      const like = `%${query}%`;
      params.push(like, like, like);
    }
    if (status) { sql += ` AND status = ?`; params.push(status); }
    if (source) { sql += ` AND source = ?`; params.push(source); }

    const col = ['created_at', 'updated_at', 'priority', 'company'].includes(sort_by)
      ? sort_by : 'created_at';
    sql += ` ORDER BY ${col} DESC LIMIT ?`;
    params.push(limit);

    const jobs = db.prepare(sql).all(...params);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(jobs, null, 2) }],
      structuredContent: { jobs },
    };
  },
);

// ── Tool: get_job ────────────────────────────────────────────────────────────

server.tool(
  'get_job',
  'Get full details of a single job by its ID.',
  { id: z.number().int().positive().describe('Job ID') },
  async ({ id }) => {
    const job = db
      .prepare(`SELECT ${JOB_COLS}, contact, scrape_id FROM jobs WHERE id = ? AND user_id = ?`)
      .get(id, USER_ID);

    if (!job) {
      return { content: [{ type: 'text' as const, text: `Job ${id} not found.` }] };
    }
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(job, null, 2) }],
      structuredContent: { job },
    };
  },
);

// ── Tool: get_job_stats ──────────────────────────────────────────────────────

server.tool(
  'get_job_stats',
  'Get pipeline summary statistics: totals, breakdown by status and source, recent activity.',
  {},
  async () => {
    const total = (db
      .prepare(`SELECT COUNT(*) as n FROM jobs WHERE user_id = ?`)
      .get(USER_ID) as { n: number }).n;

    const byStatus = db
      .prepare(`SELECT status, COUNT(*) as count FROM jobs WHERE user_id = ? GROUP BY status ORDER BY count DESC`)
      .all(USER_ID);

    const bySource = db
      .prepare(`SELECT source, COUNT(*) as count FROM jobs WHERE user_id = ? GROUP BY source ORDER BY count DESC`)
      .all(USER_ID);

    const thisWeek = (db
      .prepare(`SELECT COUNT(*) as n FROM jobs WHERE user_id = ? AND created_at >= datetime('now', '-7 days')`)
      .get(USER_ID) as { n: number }).n;

    const offers = (db
      .prepare(`SELECT COUNT(*) as n FROM jobs WHERE user_id = ? AND status = 'Offer'`)
      .get(USER_ID) as { n: number }).n;

    const pipeline = (db
      .prepare(`SELECT COUNT(*) as n FROM jobs WHERE user_id = ? AND status NOT IN ('Rejected','Archived','New')`)
      .get(USER_ID) as { n: number }).n;

    const stats = { total, pipeline, offers, thisWeek, byStatus, bySource };
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(stats, null, 2) }],
      structuredContent: { stats },
    };
  },
);

// ── Tool: update_job_status ──────────────────────────────────────────────────

server.tool(
  'update_job_status',
  'Update the status of a job in the pipeline.',
  {
    id:     z.number().int().positive().describe('Job ID'),
    status: JOB_STATUS.describe('New status'),
    notes:  z.string().optional().describe('Optional note to append'),
  },
  async ({ id, status, notes }) => {
    const existing = db
      .prepare(`SELECT id FROM jobs WHERE id = ? AND user_id = ?`)
      .get(id, USER_ID);

    if (!existing) {
      return { content: [{ type: 'text' as const, text: `Job ${id} not found.` }] };
    }

    const now = new Date().toISOString();
    if (notes) {
      db.prepare(`UPDATE jobs SET status = ?, notes = COALESCE(notes || '\n', '') || ?, updated_at = ? WHERE id = ? AND user_id = ?`)
        .run(status, notes, now, id, USER_ID);
    } else {
      db.prepare(`UPDATE jobs SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?`)
        .run(status, now, id, USER_ID);
    }

    const updated = db.prepare(`SELECT ${JOB_COLS} FROM jobs WHERE id = ?`).get(id);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(updated, null, 2) }],
      structuredContent: { job: updated },
    };
  },
);

// ── Tool: list_cvs ───────────────────────────────────────────────────────────

server.tool(
  'list_cvs',
  'List all uploaded CVs (name, filename, created date). Use get_cv to retrieve full text.',
  {},
  async () => {
    const cvs = db
      .prepare(`SELECT id, name, filename, created_at FROM user_cvs WHERE user_id = ? ORDER BY created_at DESC`)
      .all(USER_ID);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(cvs, null, 2) }],
      structuredContent: { cvs },
    };
  },
);

// ── Tool: get_cv ─────────────────────────────────────────────────────────────

server.tool(
  'get_cv',
  'Retrieve the full text of a CV by its ID. Useful for adapting or reviewing a specific CV.',
  { id: z.number().int().positive().describe('CV ID from list_cvs') },
  async ({ id }) => {
    const cv = db
      .prepare(`SELECT id, name, filename, cv_text, created_at FROM user_cvs WHERE id = ? AND user_id = ?`)
      .get(id, USER_ID) as { id: number; name: string; filename: string; cv_text: string; created_at: string } | undefined;

    if (!cv) {
      return { content: [{ type: 'text' as const, text: `CV ${id} not found.` }] };
    }
    return {
      content: [{ type: 'text' as const, text: `# ${cv.name} (${cv.filename})\n\n${cv.cv_text}` }],
      structuredContent: { id: cv.id, name: cv.name, filename: cv.filename, created_at: cv.created_at },
    };
  },
);

// ── Start ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
