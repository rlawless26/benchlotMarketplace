'use client';

/**
 * Client-side analytics for the price-guide app.
 *
 * Mirrors `src/utils/analytics.js` in the CRA app: one place to no-op when
 * PostHog isn't initialised (no NEXT_PUBLIC_POSTHOG_KEY in local dev or a
 * preview without the key), and one place to swallow errors so telemetry can
 * never break a user-facing page. Both apps report into the same PostHog
 * project, so event names and property shapes here must match the CRA app's.
 *
 * Goal events — the two things the product is trying to make happen. Every
 * surface that can produce one fires the SAME event name so experiments can
 * share a goal definition (the PostHog actions "Listing click-out" and
 * "Alert confirmed" are built on these):
 *
 *   listing_clicked_out  — outbound click to a source listing.
 *   alert_submitted      — the alert form was submitted and the API accepted it.
 *   alert_confirmed      — fired SERVER-SIDE from the confirm page
 *                          (lib/posthog-server.ts), attributed to the same
 *                          distinct_id via `getDistinctId()` stored on the row.
 */
import posthog from 'posthog-js';

export const GOAL_EVENTS = {
  LISTING_CLICKED_OUT: 'listing_clicked_out',
  ALERT_SUBMITTED: 'alert_submitted',
  ALERT_CONFIRMED: 'alert_confirmed',
} as const;

/** The one flag-driven guide-page variant in flight. See components/GuideAlert.tsx. */
export const GUIDE_ALERT_PLACEMENT_FLAG = 'guide-alert-placement';

function loaded(): boolean {
  return typeof window !== 'undefined' && Boolean(posthog.__loaded);
}

export function track(event: string, properties: Record<string, unknown> = {}): void {
  if (!loaded()) return;
  try {
    posthog.capture(event, properties);
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[analytics] capture failed for ${event}:`, err);
    }
  }
}

/**
 * The anonymous PostHog id for this browser, or null when PostHog isn't
 * running. Sent with the alert POST so the server can attribute the later
 * `alert_confirmed` to the same person — without it the real conversion is
 * invisible to experiments.
 */
export function getDistinctId(): string | null {
  if (!loaded()) return null;
  try {
    return posthog.get_distinct_id() ?? null;
  } catch {
    return null;
  }
}

/**
 * Read a multivariate flag. Returns the variant string, or null when PostHog
 * is off, flags haven't loaded, or the flag is absent — callers treat null as
 * control. Going through `getFeatureFlag` (not `getFeatureFlagPayload`) is what
 * emits `$feature_flag_called`, which PostHog Experiments need to count exposure.
 */
export function getVariant(flag: string): string | null {
  if (!loaded()) return null;
  try {
    const v = posthog.getFeatureFlag(flag);
    return typeof v === 'string' ? v : null;
  } catch {
    return null;
  }
}

/**
 * Run `cb` once flags are available (immediately if they already are) and on
 * every later reload. Returns an unsubscribe. No-op when PostHog is off.
 */
export function onFlags(cb: () => void): () => void {
  if (!loaded()) return () => {};
  try {
    return posthog.onFeatureFlags(() => cb());
  } catch {
    return () => {};
  }
}
