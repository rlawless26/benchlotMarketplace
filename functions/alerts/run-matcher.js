#!/usr/bin/env node
/**
 * Local CLI runner for the alert matcher.
 *
 * Use this to trigger a matcher pass on demand (instead of waiting for the
 * 04:15 UTC scheduled function). Initializes Firebase Admin with the service
 * account at `functions/service-account.json`.
 *
 * Usage:
 *   node functions/alerts/run-matcher.js                # full pass, sends emails, bumps lastMatchedAt
 *   node functions/alerts/run-matcher.js --dry-run      # match + log, DO NOT send email or bump lastMatchedAt
 *   node functions/alerts/run-matcher.js --user <uid>   # restrict to a single user's alerts
 *
 * Flags combine: `--dry-run --user abc123` is fine.
 */

const path = require('path');
const admin = require('firebase-admin');

function parseArgs(argv) {
  const args = { dryRun: false, userId: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--user') args.userId = argv[++i];
    else if (a.startsWith('--user=')) args.userId = a.slice('--user='.length);
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node functions/alerts/run-matcher.js [--dry-run] [--user <uid>]');
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
    console.log(`[run-matcher] using service account at ${saPath}`);
  } catch (e) {
    admin.initializeApp(); // falls back to GOOGLE_APPLICATION_CREDENTIALS
    console.log('[run-matcher] using default application credentials');
  }
}

async function main() {
  const args = parseArgs(process.argv);
  initAdmin();

  // Require after init so Admin is ready for downstream helpers.
  const { runAlertMatcher } = require('./matcher');

  const mode = args.dryRun ? 'DRY RUN' : 'LIVE';
  const scope = args.userId ? `user=${args.userId}` : 'all users';
  console.log(`[run-matcher] starting — ${mode}, ${scope}`);

  const summary = await runAlertMatcher({
    dryRun: args.dryRun,
    onlyUserId: args.userId,
  });

  console.log('[run-matcher] done:');
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[run-matcher] failed:', err);
    process.exit(1);
  });
