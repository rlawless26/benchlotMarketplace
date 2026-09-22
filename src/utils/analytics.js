/**
 * Thin PostHog wrapper for aggregator instrumentation.
 *
 * Usage: `import { track } from '../utils/analytics';`
 *
 * Why this layer instead of calling posthog.capture directly:
 *   - Single place to no-op if PostHog isn't initialized (env without
 *     REACT_APP_POSTHOG_KEY — local dev, preview deploys without the key).
 *   - Single place to swallow capture errors so analytics can never break
 *     the user-facing app.
 *   - Future hook for adding common context (release version, build mode)
 *     without touching every call site.
 *
 * No batching or queueing here — posthog-js already handles that.
 */

import posthog from 'posthog-js';

/**
 * Goal events — the two things the product is trying to make happen. Every
 * surface that can produce one fires the SAME event name, in both this app
 * and the Next.js guide app (web/lib/analytics.ts), so experiments can share
 * one goal definition (PostHog actions "Listing click-out" / "Alert confirmed").
 */
export const GOAL_EVENTS = {
  LISTING_CLICKED_OUT: 'listing_clicked_out',
  ALERT_SUBMITTED: 'alert_submitted',
  // alert_confirmed is fired server-side by web/ from the confirm page.
};

/**
 * Outbound click to a source listing. `surface` names the UI that produced
 * it (search_results, scan_results, price_guide_cra, plane_type_page,
 * guide_page); `listing_status` is 'active' for buyable listings and 'sold'
 * for comps. Keep the property names in step with OutboundListingLink.tsx.
 */
export function trackListingClickOut({
  surface, listingId = null, source = null, sourceKind = null, priceUsd = null,
  listingStatus = 'active', position = null, clusterKey = null, ...rest
}) {
  track(GOAL_EVENTS.LISTING_CLICKED_OUT, {
    surface,
    listing_id: listingId,
    source,
    source_kind: sourceKind,
    listing_status: listingStatus,
    price_usd: typeof priceUsd === 'number' ? priceUsd : null,
    position,
    cluster_key: clusterKey,
    ...rest,
  });
}

/**
 * This browser's anonymous PostHog id, or null when PostHog is off. Sent with
 * alert signups so the server-side `alert_confirmed` lands on the same person.
 */
export function getDistinctId() {
  if (!posthog.__loaded) return null;
  try {
    return posthog.get_distinct_id() || null;
  } catch {
    return null;
  }
}

export function track(eventName, properties = {}) {
  if (!posthog.__loaded) return;
  try {
    posthog.capture(eventName, properties);
  } catch (err) {
    // Never let analytics break the app
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[analytics] capture failed for ${eventName}:`, err);
    }
  }
}
