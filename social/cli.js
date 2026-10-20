#!/usr/bin/env node
/**
 * Benchlot social pipeline.
 *
 *   node cli.js migrate                         apply migration/schema/013_social.sql
 *   node cli.js generate [--start YYYY-MM-DD] [--days 30] [--name NAME] [--force] [--no-render]
 *   node cli.js render   --batch NAME           re-render every card in a batch
 *   node cli.js preview  --batch NAME           write out/<batch>/preview.html (renders first if needed)
 *   node cli.js list                            batches and their status
 *   node cli.js show     --batch NAME           schedule, captions and first comments as text
 *   node cli.js approve  --batch NAME           the one-row toggle the publisher honours
 *   node cli.js unapprove --batch NAME
 *   node cli.js delete   --batch NAME           drop a pending batch (frees its tools for the repeat guard)
 *
 * Output lives in social/out/<batch>/ (gitignored).
 */
const fs = require('node:fs');
const path = require('node:path');
require('./lib/env');
const db = require('./lib/db');
const state = require('./lib/state');
const config = require('./config');
const { parseLocalDate, localDateString } = require('./lib/schedule');

const OUT = path.join(__dirname, 'out');

function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = rest[i + 1];
    if (next !== undefined && !next.startsWith('--')) { flags[key] = next; i++; } else flags[key] = true;
  }
  return { cmd, flags };
}

async function renderBatch(name, log) {
  const { renderPosts } = require('./render/render');
  const batch = await state.getBatch(name);
  if (!batch) throw new Error(`No batch named ${name}`);
  const posts = await state.postsForBatch(name);
  const outDir = path.join(OUT, name);
  const rendered = await renderPosts(posts, outDir, { log });
  for (const p of posts) {
    const files = rendered.get(p.id);
    if (files) { await state.setPostImages(p.id, files); p.images = files; }
  }
  return { batch, posts, outDir };
}

async function previewBatch(name, log) {
  const { writeContactSheet } = require('./render/preview');
  const batch = await state.getBatch(name);
  if (!batch) throw new Error(`No batch named ${name}`);
  let posts = await state.postsForBatch(name);
  const outDir = path.join(OUT, name);
  const missing = posts.some((p) => !p.images?.length || !p.images.every((f) => fs.existsSync(f)));
  if (missing) ({ posts } = await renderBatch(name, log));
  const file = writeContactSheet(batch, posts, outDir);
  log(`Contact sheet: ${file}`);
  return file;
}

async function main() {
  const { cmd, flags } = parseArgs(process.argv.slice(2));
  const log = (...a) => console.log(...a);

  switch (cmd) {
    case 'migrate': {
      const file = path.join(__dirname, '..', 'migration', 'schema', '013_social.sql');
      const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
      const { Pool } = require('pg');
      const pool = new Pool({ connectionString: url });
      await pool.query(fs.readFileSync(file, 'utf8'));
      await pool.end();
      log(`Applied ${path.basename(file)}`);
      break;
    }
    case 'generate': {
      const { generate } = require('./lib/generate');
      const start = flags.start ? parseLocalDate(flags.start) : new Date(Date.now() + 86_400_000);
      const days = flags.days ? Number(flags.days) : config.schedule.defaultDays;
      const { batch } = await generate({ start, days, name: flags.name, force: Boolean(flags.force), log });
      if (!flags['no-render']) {
        await renderBatch(batch.name, log);
        await previewBatch(batch.name, log);
      }
      break;
    }
    case 'render': {
      if (!flags.batch) throw new Error('--batch NAME is required');
      await renderBatch(flags.batch, log);
      break;
    }
    case 'preview': {
      if (!flags.batch) throw new Error('--batch NAME is required');
      await previewBatch(flags.batch, log);
      break;
    }
    case 'list': {
      const rows = await state.listBatches();
      if (!rows.length) { log('No batches yet. Run: node cli.js generate'); break; }
      for (const b of rows) {
        log(`${b.name.padEnd(12)} ${b.status.padEnd(9)} ${String(b.posts).padStart(3)} posts  ${b.published} published  ${b.failed} failed  window ${localDateString(new Date(b.window_start))} +${b.window_days}d`);
      }
      break;
    }
    case 'show': {
      if (!flags.batch) throw new Error('--batch NAME is required');
      const { formatET } = require('./lib/text');
      const posts = await state.postsForBatch(flags.batch);
      for (const p of posts) {
        log(`\n=== #${p.id} ${p.post_type} · ${formatET(new Date(p.scheduled_for), config.timezone)} ET · ${p.status} · ${p.subject_key}`);
        log(p.caption);
        log(`-- ${p.first_comment}`);
      }
      break;
    }
    case 'delete': {
      if (!flags.batch) throw new Error('--batch NAME is required');
      const ok = await state.deleteBatch(flags.batch);
      log(ok ? `Deleted pending batch ${flags.batch}` : `No batch named ${flags.batch}`);
      break;
    }
    case 'approve':
    case 'unapprove': {
      if (!flags.batch) throw new Error('--batch NAME is required');
      const b = await state.setBatchStatus(flags.batch, cmd === 'approve' ? 'approved' : 'pending');
      log(`Batch ${b.name} is now ${b.status}`);
      break;
    }
    default:
      console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, 15).join('\n').replace(/^ \* ?/gm, ''));
      process.exitCode = cmd ? 1 : 0;
  }
}

main()
  .catch((e) => { console.error(`[social] ${e.message}`); process.exitCode = 1; })
  .finally(() => db.end());
