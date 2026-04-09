#!/usr/bin/env node

/**
 * Reset Stripe Connect test accounts.
 *
 * One-time cleanup script to delete every connected account on the platform
 * (after the Custom → Express migration in commit 96512f74) and clear the
 * matching `stripeAccountId` fields from Firestore so users can re-onboard
 * fresh as Express accounts.
 *
 * This script:
 *   1. Lists every Connect account on the Stripe platform
 *   2. Cross-references with Firestore users to show which doc references each
 *   3. In dry-run mode (default): prints the table and exits
 *   4. With --commit: deletes each Stripe account, then clears
 *      stripeAccountId / chargesEnabled / payoutsEnabled / detailsSubmitted /
 *      stripeStatus / hasBankAccount / needsBankDetails on the matching user doc
 *
 * Safety:
 *   - Dry-run by default (no --commit)
 *   - When the Stripe key is live (sk_live_*), requires --i-mean-it flag in
 *     addition to --commit
 *   - --limit N caps how many accounts get touched per run
 *
 * Usage:
 *   node scripts/reset-stripe-test-accounts.js                                      # dry run
 *   node scripts/reset-stripe-test-accounts.js --commit                             # delete all (test key)
 *   node scripts/reset-stripe-test-accounts.js --commit --i-mean-it                 # delete all (live key)
 *   node scripts/reset-stripe-test-accounts.js --commit --i-mean-it --limit 5       # cap to 5
 *
 * Requires functions/.env (for STRIPE_SECRET / STRIPE_SECRET_TEST) and
 * functions/service-account.json (for Firestore admin access).
 */

const path = require('path');
const fs = require('fs');

// ─── env loading (mirrors scripts/cleanup-pending-images.js pattern) ──────
const envPath = path.join(__dirname, '..', 'functions', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

// ─── CLI args ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const I_MEAN_IT = args.includes('--i-mean-it');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : Infinity;

// ─── Stripe init ──────────────────────────────────────────────────────────
const stripeKey = process.env.STRIPE_SECRET_TEST || process.env.STRIPE_SECRET || process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.error('No Stripe key found. Set STRIPE_SECRET (or STRIPE_SECRET_TEST) in functions/.env.');
  process.exit(1);
}
const STRIPE_MODE = stripeKey.startsWith('sk_live') ? 'LIVE' : 'TEST';
const stripe = require(path.join(__dirname, '..', 'functions', 'node_modules', 'stripe'))(stripeKey);

// ─── Firebase Admin init ──────────────────────────────────────────────────
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
const serviceAccountPath = path.join(__dirname, '..', 'functions', 'service-account.json');
let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (err) {
  console.error(`Could not load service account at ${serviceAccountPath}`);
  process.exit(1);
}
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// ─── helpers ──────────────────────────────────────────────────────────────
async function listAllConnectAccounts() {
  const accounts = [];
  let hasMore = true;
  let startingAfter;
  while (hasMore) {
    const params = { limit: 100 };
    if (startingAfter) params.starting_after = startingAfter;
    const page = await stripe.accounts.list(params);
    accounts.push(...page.data);
    hasMore = page.has_more;
    if (hasMore) startingAfter = page.data[page.data.length - 1].id;
  }
  return accounts;
}

async function findUserDocByStripeAccountId(accountId) {
  const snap = await db.collection('users').where('stripeAccountId', '==', accountId).limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0];
}

function fmtAccount(acct, userDoc) {
  const created = new Date(acct.created * 1000).toISOString().split('T')[0];
  const email = acct.email || '(no email)';
  const type = acct.type || (acct.controller && acct.controller.type) || '(unknown)';
  const charges = acct.charges_enabled ? '✓' : '✗';
  const payouts = acct.payouts_enabled ? '✓' : '✗';
  const userInfo = userDoc ? `→ users/${userDoc.id}` : '(no Firestore user)';
  return `  ${acct.id}  ${created}  ${type.padEnd(8)} charges:${charges} payouts:${payouts}  ${email.padEnd(40)} ${userInfo}`;
}

// ─── main ─────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nMode:   ${COMMIT ? 'COMMIT (will modify Stripe + Firestore)' : 'DRY RUN (read-only)'}`);
  console.log(`Stripe: ${STRIPE_MODE} mode`);
  console.log(`Limit:  ${LIMIT === Infinity ? 'no limit' : LIMIT}\n`);

  // Live mode safety gate
  if (COMMIT && STRIPE_MODE === 'LIVE' && !I_MEAN_IT) {
    console.error('🛑 You are about to delete LIVE Stripe Connect accounts.');
    console.error('   Re-run with --i-mean-it to confirm:\n');
    console.error('   node scripts/reset-stripe-test-accounts.js --commit --i-mean-it\n');
    process.exit(1);
  }

  console.log('Listing Stripe Connect accounts…\n');
  const accounts = await listAllConnectAccounts();
  console.log(`Found ${accounts.length} connected account(s):\n`);

  if (accounts.length === 0) {
    console.log('Nothing to do. ✓');
    process.exit(0);
  }

  // Resolve Firestore users for each account
  const rows = [];
  for (const acct of accounts) {
    const userDoc = await findUserDocByStripeAccountId(acct.id);
    rows.push({ acct, userDoc });
  }

  for (const { acct, userDoc } of rows) {
    console.log(fmtAccount(acct, userDoc));
  }

  if (!COMMIT) {
    console.log(`\nDRY RUN — no changes were made.`);
    console.log(`Re-run with --commit${STRIPE_MODE === 'LIVE' ? ' --i-mean-it' : ''} to delete these accounts and clear matching Firestore docs.`);
    process.exit(0);
  }

  // Commit mode — delete each account + clear Firestore
  console.log(`\nDeleting…\n`);
  let deleted = 0;
  let cleared = 0;
  let processed = 0;
  for (const { acct, userDoc } of rows) {
    if (processed >= LIMIT) {
      console.log(`Hit --limit ${LIMIT}, stopping.`);
      break;
    }
    processed++;

    // Stripe delete
    try {
      await stripe.accounts.del(acct.id);
      console.log(`  ✓ deleted Stripe ${acct.id}`);
      deleted++;
    } catch (err) {
      console.error(`  ✗ Stripe delete failed for ${acct.id}: ${err.message}`);
      // Don't bail — still try to clear Firestore so the dangling reference goes away
    }

    // Firestore clear
    if (userDoc) {
      try {
        await userDoc.ref.update({
          stripeAccountId: admin.firestore.FieldValue.delete(),
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          stripeStatus: admin.firestore.FieldValue.delete(),
          hasBankAccount: admin.firestore.FieldValue.delete(),
          needsBankDetails: admin.firestore.FieldValue.delete(),
          'seller.stripeAccountId': admin.firestore.FieldValue.delete(),
          'seller.stripeStatus': admin.firestore.FieldValue.delete(),
          lastStatusUpdate: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`  ✓ cleared users/${userDoc.id}`);
        cleared++;
      } catch (err) {
        console.error(`  ✗ Firestore clear failed for users/${userDoc.id}: ${err.message}`);
      }
    }
  }

  console.log(`\nSummary:`);
  console.log(`  Stripe accounts deleted: ${deleted}/${processed}`);
  console.log(`  Firestore users cleared: ${cleared}`);
  console.log(`\nDone.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
