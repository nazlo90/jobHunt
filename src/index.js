#!/usr/bin/env node
// src/index.js — LinkedIn content tools CLI
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';
import { scrapeLinkedInPosts } from './scrapers/linkedinPosts.js';
import { generateComments } from './ai/commentGenerator.js';
import { generatePosts, VALID_CATEGORIES } from './ai/postGenerator.js';
import { generateDM } from './ai/dmGenerator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = join(__dirname, '.posts-cache.json');

const [,, command, ...args] = process.argv;

async function runPosts() {
  console.log('Scraping LinkedIn posts...\n');
  const posts = await scrapeLinkedInPosts();

  if (posts.length === 0) {
    console.log('No posts found. LinkedIn may require authentication for content search.');
    return;
  }

  posts.forEach((post, i) => {
    const engagement = post.likesCount > 0 ? `${post.likesCount} likes` : 'engagement unknown';
    console.log(`[${i + 1}] ${post.authorName}${post.authorTitle ? ` (${post.authorTitle})` : ''} — ${engagement}`);
    console.log(`    "${post.postText.slice(0, 120)}${post.postText.length > 120 ? '...' : ''}"`);
    console.log(`    URL: ${post.postUrl}`);
    console.log(`    > node src/index.js comment ${post.postId}`);
    console.log();
  });
}

async function runComment(id) {
  if (!id) {
    console.error('Usage: node src/index.js comment <postId>');
    process.exit(1);
  }

  if (!existsSync(CACHE_FILE)) {
    console.error('No cached posts found. Run "node src/index.js posts" first.');
    process.exit(1);
  }

  const cached = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
  const post = cached.find(p => p.postId === id);

  if (!post) {
    console.error(`Post "${id}" not found in cache. Run "node src/index.js posts" to refresh.`);
    process.exit(1);
  }

  console.log(`Generating comments for post by ${post.authorName}...\n`);
  const comments = await generateComments(post);

  console.log('── SHORT ─────────────────────────────────────');
  console.log(comments.short);
  console.log();
  console.log('── MEDIUM ────────────────────────────────────');
  console.log(comments.medium);
  console.log();
  console.log('── OPINIONATED ───────────────────────────────');
  console.log(comments.opinionated);
  console.log();
}

async function runWrite(category) {
  if (!category || !VALID_CATEGORIES.includes(category)) {
    console.error(`Usage: node src/index.js write <category>`);
    console.error(`Categories: ${VALID_CATEGORIES.join(' | ')}`);
    process.exit(1);
  }

  const seedIdea = args[1] || '';
  console.log(`Generating 2 LinkedIn posts for category "${category}"...\n`);
  const posts = await generatePosts(category, seedIdea);

  posts.forEach(({ variant, text }) => {
    console.log(`── VARIANT ${variant} ${'─'.repeat(40 - variant.toString().length)}`);
    console.log(text);
    console.log();
  });
}

async function runDm() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = q => new Promise(resolve => rl.question(q, resolve));

  console.log('DM Generator — press Enter to skip optional fields\n');
  const recruiterName = await ask('Recruiter name: ');
  const company      = await ask('Company: ');
  const roleTitle    = await ask('Role title: ');
  const companyNote  = await ask('Why this company (1 sentence): ');
  rl.close();

  if (!recruiterName || !company || !roleTitle) {
    console.error('recruiterName, company, and roleTitle are required.');
    process.exit(1);
  }

  console.log('\nGenerating DM...\n');
  const result = await generateDM({ recruiterName, company, roleTitle, companyNote });
  console.log('── DM ────────────────────────────────────────');
  console.log(result.text);
  console.log();
}

function printHelp() {
  console.log(`LinkedIn Content Tools

Commands:
  node src/index.js posts                   Scrape and rank LinkedIn posts
  node src/index.js comment <postId>        Generate 3 comment variants for a post
  node src/index.js write <category>        Generate 2 LinkedIn post drafts
  node src/index.js dm                      Interactive DM generator

Categories for write:
  ${VALID_CATEGORIES.join(' | ')}

Requires: GROQ_API_KEY env variable`);
}

try {
  switch (command) {
    case 'posts':   await runPosts(); break;
    case 'comment': await runComment(args[0]); break;
    case 'write':   await runWrite(args[0]); break;
    case 'dm':      await runDm(); break;
    default:        printHelp(); break;
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
