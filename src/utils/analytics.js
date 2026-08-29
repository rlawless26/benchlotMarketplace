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
