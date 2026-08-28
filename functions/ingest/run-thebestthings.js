#!/usr/bin/env node
/**
 * Local CLI runner for The Best Things ingestion.
 *
 * Usage:
 *   node functions/ingest/run-thebestthings.js                            # full scrape
 *   node functions/ingest/run-thebestthings.js --max-items 10             # cap
 *   node functions/ingest/run-thebestthings.js --category infill          # one cat
 *   node functions/ingest/run-thebestthings.js --dry-run --max-items 5
 *
 * Requirements:
 *   - functions/service-account.json (or GOOGLE_APPLICATION_CREDENTIALS)
 *     for Firestore writes. Dry-run mode doesn't need credentials.
 */

const path = require('path');
const admin = require('firebase-admin');

function parseArgs(argv) {
  const args = { maxItems: undefined, categories: undefined, dryRun: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--max-items') args.maxItems = Number(argv[++i]);
    else if (a.startsWith('--max-items=')) args.maxItems = Number(a.slice('--max-items='.length));
    else if (a === '--category') args.categories = (args.categories || []).concat(argv[++i]);
    else if (a.startsWith('--category=')) args.categories = (args.categories || []).concat(a.slice('--category='.length));
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node functions/ingest/run-thebestthings.js [--max-items N] [--category SLUG ...] [--dry-run]');
      console.log('Categories: infill, chisels, measurin, misctool, molding, saws, stanley, woodplan');
      process.exit(0);
    }
  }
  if (args.maxItems !== undefined && (!Number.isInteger(args.maxItems) || args.maxItems <= 0)) {
    console.error(`--max-items expects a positive integer, got: ${args.maxItems}`);
    process.exit(2);
  }
  return args;
}

function initAdmin() {
  if (admin.apps.length) return;
  const saPath = path.resolve(__dirname, '..', 'service-account.json');
  try {
    const serviceAccount = require(saPath);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log(`[run-thebestthings] using service account at ${saPath}`);
  } catch (e) {
    admin.initializeApp();
    console.log('[run-thebestthings] using default application credentials');
  }
}

async function main() {
  const args = parseArgs(process.argv);
  initAdmin();

  const tbt = require('./thebestthings');

  if (args.dryRun) {
    const { records, categoryStats } = await tbt.scrapeAll({
      maxItems: args.maxItems,
      categories: args.categories,
    });
    console.log(`[run-thebestthings] dry run — ${records.length} records across ${categoryStats.length} categor${categoryStats.length === 1 ? 'y' : 'ies'}`);
    console.log('[run-thebestthings] per-category:');
    for (const s of categoryStats) {
      if (s.skipped) {
        console.log(`  ${s.slug.padEnd(10)} SKIPPED (${s.reason})`);
      } else if (s.error) {
        console.log(`  ${s.slug.padEnd(10)} ERROR: ${s.error}`);
      } else {
        console.log(`  ${s.slug.padEnd(10)} parsed=${String(s.parsed).padStart(3)} added=${String(s.added).padStart(3)} dup_skipped=${s.dup_skipped}`);
      }
    }

    const sample = records.slice(0, 5).map(({ listing }) => ({
      source_id: listing.source_id,
      title: listing.title_raw,
      price_cents: listing.price_cents,
      heuristic_brand: listing.heuristic_brand,
      heuristic_type: listing.heuristic_type,
      image_count: listing.images.length,
      first_image: listing.images[0] || null,
      source_url: listing.source_url,
      desc_preview: (listing.description_raw || '').slice(0, 120),
      tags: listing.tags,
    }));
    console.log('[run-thebestthings] sample:', JSON.stringify(sample, null, 2));

    const brandCounts = {};
    const typeCounts = {};
    let nullPrice = 0;
    let zeroImages = 0;
    let nullDesc = 0;
    for (const { listing } of records) {
      brandCounts[listing.heuristic_brand] = (brandCounts[listing.heuristic_brand] || 0) + 1;
      typeCounts[listing.heuristic_type] = (typeCounts[listing.heuristic_type] || 0) + 1;
      if (listing.price_cents === null) nullPrice += 1;
      if (listing.images.length === 0) zeroImages += 1;
      if (!listing.description_raw) nullDesc += 1;
    }
    console.log('[run-thebestthings] heuristic brand distribution:', brandCounts);
    console.log('[run-thebestthings] heuristic type distribution:', typeCounts);
    console.log(`[run-thebestthings] null prices: ${nullPrice}, zero-image: ${zeroImages}, null description: ${nullDesc}`);
    return;
  }

  const summary = await tbt.runIngestion({
    maxItems: args.maxItems,
    categories: args.categories,
  });
  console.log('[run-thebestthings] done:');
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[run-thebestthings] failed:', err);
    process.exit(1);
  });
