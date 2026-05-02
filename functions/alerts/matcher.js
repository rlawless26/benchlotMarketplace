/**
 * Alert matcher — polls saved_searches against newly-indexed externalListings,
 * sends digest emails per user, and updates lastMatchedAt on matched alerts.
 *
 * Design:
 *   - Fetches every active saved_search.
 *   - For each alert, identifies listings with first_seen_at >= the alert's
 *     lastMatchedAt (or createdAt if the alert has never matched before).
 *   - Filters those listings through predicates.matchesAlert() for exact
 *     query + filter semantics that mirror the client UI.
 *   - Groups matched alerts by userId so each user gets ONE digest email
 *     across all their alerts — pivot-doc rule ("batch consecutive hits").
 *   - Skips users whose `profile.preferences.notifications.email.alerts` is
 *     explicitly false (default: send).
 *   - Updates lastMatchedAt on every alert that sent at least one match.
 *     Alerts with zero matches keep their existing floor so the NEXT run
 *     still looks back to the same window.
 *
 * Runs independently of the scrape on its own cron, 15 min after the scrape
 * starts (see scheduledAlertMatcher in functions/index.js). Safe to re-run;
 * lastMatchedAt gates what's considered "new."
 */

const admin = require('firebase-admin');

const { matchesAlert } = require('./predicates');
const { sendEmail } = require('../email');
const { getSource } = require('./sourceRegistry');

const SAVED_SEARCHES = 'saved_searches';
const EXTERNAL_LISTINGS = 'externalListings';
const USERS = 'users';

const MAX_LISTINGS_PER_ALERT_IN_EMAIL = 4;
const BASE_URL = process.env.APP_URL || process.env.BENCHLOT_BASE_URL || 'https://benchlot.com';

/**
 * Build the deep-link URL for an alert's aggregator results page. Mirrors
 * the client-side state → URL-params serializer in useAggregatorState.
 */
function alertToUrl(alert) {
  const params = new URLSearchParams();
  if (alert.query && alert.query.trim()) params.set('q', alert.query.trim());
  const filters = alert.filters || {};
  for (const group of ['cat', 'maker', 'cond', 'src', 'state']) {
    const g = filters[group];
    if (g && typeof g === 'object') {
      const keys = Object.keys(g).filter((k) => g[k]);
      if (keys.length > 0) params.set(group, keys.join('|'));
    }
  }
  if (filters.price && filters.price.min != null) params.set('min', String(filters.price.min));
  if (filters.price && filters.price.max != null) params.set('max', String(filters.price.max));
  if (alert.sort && alert.sort !== 'newest') params.set('sort', alert.sort);
  const qs = params.toString();
  return `${BASE_URL}/${qs ? `?${qs}` : ''}`;
}

/** Short human summary of a saved search, used in the email's block header. */
function summarizeAlert(alert) {
  const parts = [];
  if (alert.query && alert.query.trim()) parts.push(`"${alert.query.trim()}"`);
  const filters = alert.filters || {};
  const activeGroups = ['cat', 'maker', 'cond', 'src', 'state'].filter((g) => {
    const m = filters[g];
    return m && Object.values(m).some(Boolean);
  });
  if (activeGroups.length > 0) {
    parts.push(`${activeGroups.length} filter${activeGroups.length === 1 ? '' : 's'}`);
  }
  if (filters.price && (filters.price.min != null || filters.price.max != null)) parts.push('price range');
  if (parts.length === 0) return 'All listings';
  return parts.join(' · ');
}

function listingToEmailShape(listing) {
  const maker = listing.canonical_brand && listing.canonical_brand !== 'Unknown'
    ? listing.canonical_brand
    : (listing.heuristic_brand && listing.heuristic_brand !== 'Unknown'
      ? listing.heuristic_brand
      : '');
  const priceDollars =
    typeof listing.price_cents === 'number' ? Math.round(listing.price_cents / 100) : null;
  const price = priceDollars != null ? `$${priceDollars.toLocaleString()}` : 'Price not stated';
  const source = getSource(listing.source);
  return {
    title: listing.title_raw || 'Untitled listing',
    price,
    sourceName: source ? source.name : listing.source,
    sourceUrl: listing.source_url || '',
    imageUrl: Array.isArray(listing.images) && listing.images[0] ? listing.images[0] : '',
    maker,
  };
}

async function fetchAllAlerts(db) {
  const snap = await db.collection(SAVED_SEARCHES).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch listings added since the given floor (first_seen_at >= floor).
 * Scoped to active listings; single query per alert is fine at current scale.
 */
async function fetchNewListingsSince(db, floor) {
  if (!floor) return [];
  const snap = await db
    .collection(EXTERNAL_LISTINGS)
    .where('status', '==', 'active')
    .where('first_seen_at', '>=', floor)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function fetchUser(db, userId) {
  try {
    const snap = await db.collection(USERS).doc(userId).get();
    if (!snap.exists) return null;
    return { uid: userId, ...snap.data() };
  } catch (e) {
    console.error(`[alertMatcher] user fetch failed for ${userId}:`, e.message);
    return null;
  }
}

function userAllowsAlertEmails(userDoc) {
  if (!userDoc) return false;
  const pref = userDoc?.profile?.preferences?.notifications?.email?.alerts;
  // Default: undefined / null → allow. Only explicit false blocks.
  return pref !== false;
}

/**
 * Main entry point. Returns a summary suitable for Cloud Function logs.
 *
 * Options:
 *   - now:     Timestamp used for lastMatchedAt writes (defaults to server now).
 *   - dryRun:  When true, skips the email send AND the lastMatchedAt batch
 *              update. Still runs the full match pass so the summary reflects
 *              what WOULD have been sent. Use from the local CLI runner.
 *   - userId:  Restrict the run to a single user's alerts (local testing).
 */
async function runAlertMatcher({
  now = admin.firestore.Timestamp.now(),
  dryRun = false,
  onlyUserId = null,
} = {}) {
  const db = admin.firestore();
  const startedAt = Date.now();

  const allAlerts = await fetchAllAlerts(db);
  const alerts = onlyUserId ? allAlerts.filter((a) => a.userId === onlyUserId) : allAlerts;
  if (alerts.length === 0) {
    return { alerts: 0, usersEmailed: 0, emailsSent: 0, durationMs: Date.now() - startedAt };
  }

  // Per-alert: find new matched listings since the alert's floor.
  const matchedByAlert = [];
  for (const alert of alerts) {
    const floor = alert.lastMatchedAt || alert.createdAt;
    if (!floor) continue; // new alerts that haven't been fully written yet — skip
    const candidates = await fetchNewListingsSince(db, floor);
    const hits = candidates.filter((l) => matchesAlert(l, alert));
    if (hits.length > 0) {
      matchedByAlert.push({ alert, hits });
    }
  }

  // Group by user for digest emails.
  const perUser = new Map();
  for (const { alert, hits } of matchedByAlert) {
    if (!perUser.has(alert.userId)) perUser.set(alert.userId, []);
    perUser.get(alert.userId).push({ alert, hits });
  }

  let usersEmailed = 0;
  let emailsSent = 0;
  let alertsUpdated = 0;

  for (const [userId, entries] of perUser.entries()) {
    const user = await fetchUser(db, userId);
    if (!userAllowsAlertEmails(user)) {
      console.log(`[alertMatcher] user ${userId} has alerts disabled; skipping digest`);
      continue;
    }
    if (!user.email) {
      console.warn(`[alertMatcher] user ${userId} has no email on file; skipping`);
      continue;
    }

    const totalMatchCount = entries.reduce((sum, e) => sum + e.hits.length, 0);
    const matches = entries.map(({ alert, hits }) => ({
      alertSummary: summarizeAlert(alert),
      alertUrl: alertToUrl(alert),
      listings: hits.slice(0, MAX_LISTINGS_PER_ALERT_IN_EMAIL).map(listingToEmailShape),
      totalForThisAlert: hits.length,
    }));

    const displayName = user.profile?.firstName || '';

    if (dryRun) {
      console.log(
        `[alertMatcher] DRY RUN — would email ${user.email} (${entries.length} alert(s), ${totalMatchCount} match(es))`,
      );
      usersEmailed += 1;
      continue;
    }

    try {
      await sendEmail({
        templateId: '11-alert-match',
        to: user.email,
        vars: {
          displayName,
          matches,
          totalMatchCount,
          manageAlertsUrl: `${BASE_URL}/alerts`,
          unsubscribeUrl: `${BASE_URL}/settings`,
        },
      });
      emailsSent += 1;
      usersEmailed += 1;
    } catch (err) {
      console.error(`[alertMatcher] email send failed for ${userId}:`, err.message);
      continue;
    }

    // Only bump lastMatchedAt for alerts that actually matched. Unmatched
    // alerts keep their prior floor so the next run still looks back.
    const batch = db.batch();
    for (const { alert } of entries) {
      batch.update(db.collection(SAVED_SEARCHES).doc(alert.id), { lastMatchedAt: now });
      alertsUpdated += 1;
    }
    try {
      await batch.commit();
    } catch (err) {
      console.error(`[alertMatcher] failed to update lastMatchedAt for ${userId}:`, err.message);
    }
  }

  return {
    alerts: alerts.length,
    alertsWithHits: matchedByAlert.length,
    alertsUpdated,
    usersEmailed,
    emailsSent,
    durationMs: Date.now() - startedAt,
  };
}

module.exports = { runAlertMatcher };
