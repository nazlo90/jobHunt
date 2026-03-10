// src/cv-adapter.js
// Run: node src/cv-adapter.js
// Or:  node src/cv-adapter.js --job-id 42  (to link result to a tracked job)

import Anthropic from '@anthropic-ai/sdk';
import readline from 'readline';
import { jobsDb, cvsDb } from './db.js';
import { MASTER_CV } from './cv-adapter-data.js';
import { argv } from 'process';

// ── YOUR MASTER CV ─────────────────────────────────────────────────────────
// Update this once — adapter uses it as the source of truth forever
// (Edit src/cv-adapter-data.js instead of this file)

// ── CLAUDE API ─────────────────────────────────────────────────────────────
async function adaptCV(jobDescription, company, role, jobId = null) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY not set.\n   export ANTHROPIC_API_KEY=sk-ant-...');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  const systemPrompt = `You are an expert technical CV writer specializing in frontend developer resumes.
Your job is to select and rewrite CV content to match a specific job description.

Rules:
- Keep all metrics and numbers intact — never invent new ones
- Reorder/rephrase bullets to front-load keywords from the job description
- Do NOT add skills the candidate doesn't have
- Be specific and technical, not fluffy
- Output ONLY valid JSON, no markdown fences, no explanation`;

  const userPrompt = `JOB DESCRIPTION:
${jobDescription}

CANDIDATE CV:
${JSON.stringify(MASTER_CV, null, 2)}

Return JSON with EXACTLY this structure:
{
  "relevance_score": 8,
  "keywords_found": ["angular", "typescript", "rxjs"],
  "missing_skills": ["kubernetes"],
  "adapted_profile": "2-sentence profile targeting this specific role",
  "top_experience": [
    {
      "company": "...",
      "title": "...",
      "period": "...",
      "stack": "...",
      "bullets": ["bullet 1", "bullet 2", "bullet 3"]
    }
  ],
  "cover_letter": "3 paragraphs. Start with a hook referencing the company/role specifically. Para 2: 2-3 concrete achievements matching their needs. Para 3: CTA. No 'I am writing to express'. Under 250 words.",
  "advice": "1-2 sentences on what to emphasize or watch out for"
}

Include top 3 most relevant roles, up to 4 bullets each, rewritten to mirror the JD keywords.`;

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  let raw = message.content[0].text.trim();
  // Strip markdown fences if model adds them
  raw = raw.replace(/^```json\s*/m, '').replace(/\s*```$/m, '');

  return JSON.parse(raw);
}

// ── READLINE HELPERS ───────────────────────────────────────────────────────
function ask(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function multilineInput(rl, prompt) {
  console.log(prompt);
  console.log('(Type END on a new line when done)\n');
  const lines = [];
  return new Promise(resolve => {
    rl.on('line', line => {
      if (line.trim() === 'END') {
        rl.removeAllListeners('line');
        resolve(lines.join('\n'));
      } else {
        lines.push(line);
      }
    });
  });
}

// ── OUTPUT ─────────────────────────────────────────────────────────────────
function printResult(result, company, role) {
  const bar = '█'.repeat(result.relevance_score) + '░'.repeat(10 - result.relevance_score);
  console.log('\n' + '='.repeat(60));
  console.log(`  ADAPTED CV — ${company} / ${role}`);
  console.log('='.repeat(60));
  console.log(`\n📊 Relevance: ${result.relevance_score}/10  ${bar}`);
  console.log(`🔑 Keywords matched: ${result.keywords_found?.join(', ')}`);
  if (result.missing_skills?.length) {
    console.log(`⚠️  Missing: ${result.missing_skills.join(', ')}`);
  }
  if (result.advice) console.log(`\n💡 ${result.advice}`);

  console.log('\n── PROFILE ──────────────────────────────────────────────');
  console.log(result.adapted_profile);

  console.log('\n── TOP EXPERIENCE ───────────────────────────────────────');
  for (const exp of (result.top_experience || [])) {
    console.log(`\n${exp.title} @ ${exp.company}  (${exp.period})`);
    console.log(`Stack: ${exp.stack}`);
    for (const b of exp.bullets) console.log(`  • ${b}`);
  }

  console.log('\n── COVER LETTER ─────────────────────────────────────────');
  console.log(result.cover_letter);
  console.log();
}

// ── MAIN ───────────────────────────────────────────────────────────────────
async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('='.repeat(60));
  console.log('  CV ADAPTER — powered by Claude API');
  console.log('='.repeat(60));

  // Check if --job-id flag passed
  const jobIdArg = argv.includes('--job-id') ? argv[argv.indexOf('--job-id') + 1] : null;
  let linkedJob = null;

  if (jobIdArg) {
    linkedJob = jobsDb.getById(Number(jobIdArg));
    if (linkedJob) {
      console.log(`\nLinked to tracked job: ${linkedJob.company} — ${linkedJob.role}`);
    }
  }

  const jd = await multilineInput(rl, '\nPaste the job description:');
  const company = linkedJob?.company || await ask(rl, 'Company name: ');
  const role    = linkedJob?.role    || await ask(rl, 'Role title: ');

  rl.close();

  if (!jd.trim()) { console.error('❌ No job description.'); process.exit(1); }

  console.log(`\n⚙️  Adapting CV for ${company.trim()} — ${role.trim()}...`);

  const result = await adaptCV(jd, company.trim(), role.trim(), jobIdArg);
  printResult(result, company.trim(), role.trim());

  // Save to DB
  const row = cvsDb.insert({
    job_id:          linkedJob?.id || null,
    company:         company.trim(),
    role:            role.trim(),
    relevance_score: result.relevance_score,
    keywords_found:  JSON.stringify(result.keywords_found || []),
    missing_skills:  JSON.stringify(result.missing_skills || []),
    adapted_profile: result.adapted_profile,
    top_experience:  JSON.stringify(result.top_experience || []),
    cover_letter:    result.cover_letter,
    advice:          result.advice,
  });

  console.log(`💾 Saved to database (cv id: ${row.lastInsertRowid})`);
  console.log('   View in tracker: http://localhost:3000\n');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
