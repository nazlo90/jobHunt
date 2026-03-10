// src/server.js
// Run: node src/server.js
// Opens: http://localhost:3000

import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { jobsDb, cvsDb } from './db.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const PORT  = process.env.PORT || 3000;
const app   = express();

app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.static(join(__dir, '..', 'public')));

// ── JOBS API ───────────────────────────────────────────────────────────────

// GET /api/jobs?status=Applied&source=djinni&search=angular&sortBy=priority
app.get('/api/jobs', (req, res) => {
  try {
    const { status, source, search, sortBy } = req.query;
    const jobs = jobsDb.getAll({ status, source, search, sortBy });
    res.json({ ok: true, jobs });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/jobs/stats
app.get('/api/jobs/stats', (req, res) => {
  try {
    res.json({ ok: true, stats: jobsDb.getStats() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/jobs/:id
app.get('/api/jobs/:id', (req, res) => {
  const job = jobsDb.getById(Number(req.params.id));
  if (!job) return res.status(404).json({ ok: false, error: 'Not found' });
  res.json({ ok: true, job });
});

// POST /api/jobs
app.post('/api/jobs', (req, res) => {
  try {
    const { company, role } = req.body;
    if (!company || !role) return res.status(400).json({ ok: false, error: 'company and role required' });

    const result = jobsDb.insert({
      company,
      role,
      salary:       req.body.salary       || '',
      salary_raw:   req.body.salary_raw   || 0,
      url:          req.body.url          || '',
      location:     req.body.location     || '',
      tech_stack:   req.body.tech_stack   || '',
      status:       req.body.status       || 'Bookmarked',
      priority:     req.body.priority     ?? 3,
      applied_date: req.body.applied_date || '',
      contact:      req.body.contact      || '',
      notes:        req.body.notes        || '',
      source:       req.body.source       || 'manual',
    });

    const job = jobsDb.getById(result.lastInsertRowid);
    res.status(201).json({ ok: true, job });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// PATCH /api/jobs/:id
app.patch('/api/jobs/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!jobsDb.getById(id)) return res.status(404).json({ ok: false, error: 'Not found' });

    // Map camelCase body keys to snake_case db columns
    const fieldMap = {
      company: 'company', role: 'role', salary: 'salary', salaryRaw: 'salary_raw',
      url: 'url', location: 'location', techStack: 'tech_stack', status: 'status',
      priority: 'priority', appliedDate: 'applied_date', contact: 'contact', notes: 'notes',
    };
    const fields = {};
    for (const [k, v] of Object.entries(req.body)) {
      if (fieldMap[k]) fields[fieldMap[k]] = v;
    }
    jobsDb.update(id, fields);
    res.json({ ok: true, job: jobsDb.getById(id) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /api/jobs/:id
app.delete('/api/jobs/:id', (req, res) => {
  try {
    jobsDb.delete(Number(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── CV ADAPTER API ─────────────────────────────────────────────────────────

// GET /api/cvs?job_id=42
app.get('/api/cvs', (req, res) => {
  try {
    const cvs = req.query.job_id
      ? cvsDb.getForJob(Number(req.query.job_id))
      : cvsDb.getRecent();
    res.json({ ok: true, cvs });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/cvs/generate  { job_id, job_description }
app.post('/api/cvs/generate', async (req, res) => {
  const { job_id, job_description } = req.body;
  if (!job_description) return res.status(400).json({ ok: false, error: 'job_description required' });

  const job = job_id ? jobsDb.getById(Number(job_id)) : null;

  try {
    // Inline import to avoid circular deps
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Lazy import MASTER_CV from cv-adapter (we re-export it)
    const { MASTER_CV } = await import('./cv-adapter-data.js');

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      system: 'You are a technical CV writer. Output ONLY valid JSON, no markdown fences.',
      messages: [{
        role: 'user',
        content: `Job: ${job_description}\n\nCV: ${JSON.stringify(MASTER_CV)}\n\nReturn JSON: {relevance_score,keywords_found,missing_skills,adapted_profile,top_experience,cover_letter,advice}`,
      }],
    });

    let raw = message.content[0].text.trim().replace(/^```json\s*/m, '').replace(/\s*```$/m, '');
    const result = JSON.parse(raw);

    const row = cvsDb.insert({
      job_id:          job?.id || null,
      company:         job?.company || req.body.company || '',
      role:            job?.role    || req.body.role    || '',
      relevance_score: result.relevance_score,
      keywords_found:  JSON.stringify(result.keywords_found || []),
      missing_skills:  JSON.stringify(result.missing_skills || []),
      adapted_profile: result.adapted_profile,
      top_experience:  JSON.stringify(result.top_experience || []),
      cover_letter:    result.cover_letter,
      advice:          result.advice,
    });

    res.json({ ok: true, cv: { id: row.lastInsertRowid, ...result } });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── START ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 JobHunt running at http://localhost:${PORT}`);
  console.log(`   DB: db/jobhunt.db`);
  console.log(`   API: http://localhost:${PORT}/api/jobs\n`);
});
