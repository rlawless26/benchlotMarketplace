#!/usr/bin/env node
/**
 * Local CLI runner for the Facebook Marketplace ingestion pipeline.
 *
 * Use this to populate `externalListings` without waiting for the
 * scheduled function, and to validate the Bright Data response shape
 * before deploys.
 *
 * Usage:
 *   node functions/ingest/run-fbmarketplace.js                        # full sweep
 *   node functions/ingest/run-fbmarketplace.js --brand festool        # single brand
 *   node functions/ingest/run-fbmarketplace.js --city boston          # single city
 *   node functions/ingest/run-fbmarketplace.js --brand festool --city boston --dry-run
 *
 * Requirements:
 *   - functions/.env must contain BRIGHT_DATA_API_KEY.
 *   - functions/service-account.json (or GOOGLE_APPLICATION_CREDENTIALS)
 *     for Firestore writes. --dry-run mode skips Firestore.
 *
 * Cost note — every (keyword, city) is one Bright Data snapshot. The
 * default matrix is 5 cities × 5 keywords = 25 snapshots; expect a few
 * hundred to a few thousand listing records depending on result density.
 */

const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

// Load functions/.env if BRIGHT_DATA_API_KEY isn't already set.
(function loadLocalEnv() {
  if (process.env.BRIGHT_DATA_API_KEY) return;
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
})();

function parseArgs(argv) {
  const args = { brand: undefined, city: undefined, dryRun: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--brand') args.brand = argv[++i];
    else if (a.startsWith('--brand=')) args.brand = a.slice('--brand='.length);
    else if (a === '--city') args.city = argv[++i];
    else if (a.startsWith('--city=')) args.city = a.slice('--city='.length);
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node functions/ingest/run-fbmarketplace.js [--brand <brand>] [--city <city>] [--dry-run]');
      process.exit(0);
    }
  }
  return args;
}

function initAdmin() {
  if (admin.apps.length) return;
  const saPath = path.resolve(__dirname, '..', 'service-account.json');
  try {
    const serviceAccount = require(saPath);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log(`[run-fbmarketplace] using service account at ${saPath}`);
  } catch (e) {
    admin.initializeApp();
    console.log('[run-fbmarketplace] using default application credentials');
  }
}

async function main() {
  const args = parseArgs(process.argv);
  initAdmin();

  if (!process.env.BRIGHT_DATA_API_KEY) {
    console.error('[run-fbmarketplace] BRIGHT_DATA_API_KEY not set');
    process.exit(2);
  }

  const fb = require('./fbmarketplace');

  // Build buckets — default matrix unless filtered by --brand/--city.
  let buckets = fb.SEARCH_BUCKETS;
  if (args.brand || args.city) {
    buckets = buckets.filter((b) => {
      if (args.brand && b.brand.toLowerCase() !== args.brand.toLowerCase()) return false;
      if (args.city && b.city.toLowerCase() !== args.city.toLowerCase()) return false;
      return true;
    });
    if (buckets.length === 0) {
      // Allow ad-hoc one-off brand/city pairs not in the default matrix.
      if (args.brand && args.city) {
        buckets = [{
          brand: args.brand,
          city: args.city,
          url: fb.buildSearchUrl(args.city, args.brand),
        }];
      } else {
        console.error('[run-fbmarketplace] no matching bucket — pass both --brand and --city to run a one-off pair');
        process.exit(2);
      }
    }
  }

  console.log(`[run-fbmarketplace] running ${buckets.length} bucket(s)…`);
  for (const b of buckets) console.log(`  - ${b.city.padEnd(15)} | ${b.brand}`);

  if (args.dryRun) {
    const { records, perBucket } = await fb.scrapeAll({ buckets });
    console.log(`[run-fbmarketplace] dry run — ${records.length} unique records across ${buckets.length} bucket(s):`);
    for (const pb of perBucket) {
      console.log(`  ${pb.city?.padEnd(15) || '?'} | ${(pb.brand || '').padEnd(20)} raw=${pb.raw_count} included=${pb.included} dupes=${pb.dupes}${pb.error ? ' err=' + pb.error : ''}`);
    }
    const sample = records.slice(0, 5).map(({ listing }) => ({
      source_id: listing.source_id,
      title: listing.title_raw,
      price: listing.price_cents != null ? `$${(listing.price_cents / 100).toFixed(0)}` : null,
      images: listing.images.length,
      heuristic_brand: listing.heuristic_brand,
      heuristic_type: listing.heuristic_type,
      url: listing.source_url,
    }));
    console.log('[run-fbmarketplace] sample:', JSON.stringify(sample, null, 2));
    return;
  }

  const summary = await fb.runIngestion({ buckets });
  console.log('[run-fbmarketplace] done:');
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[run-fbmarketplace] failed:', err);
    process.exit(1);
  });
