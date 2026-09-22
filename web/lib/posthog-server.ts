import { PostHog } from 'posthog-node';

/**
 * Server-side PostHog capture for the two places the browser can't see:
 *
 *   - the alerts API, which knows whether a submit actually created a row
 *     (the client is told the same message either way — see route.ts), and
 *   - the confirmation page, where the real conversion happens, often in a
 *     different browser session from the one that submitted the form.
 *
 * Attribution: the browser sends its PostHog distinct_id with the alert POST
 * and it is stored on the row (alerts.filters.posthog_distinct_id). Capturing
 * against that id makes `alert_confirmed` land on the same person as the
 * `$pageview`s and `alert_submitted` that preceded it, so experiments can use
 * it as a goal.
 *
 * Uses the same public project key as the browser SDK — capture is a public
 * write on PostHog, no secret is involved. A short-lived client per call is
 * deliberate: this runs on Fluid compute where a process-wide queue may never
 * flush before the sandbox is frozen.
 */
export async function captureServer(
  distinctId: string,
  event: string,
  properties: Record<string, unknown> = {}
): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || !distinctId) return;

  const client = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    flushAt: 1,
    flushInterval: 0,
  });

  try {
    client.capture({
      distinctId,
      event,
      properties: { ...properties, $lib_source: 'benchlot-web-server' },
    });
    await client.shutdown();
  } catch (e) {
    // Telemetry must never fail the request that carried it.
    console.error('[posthog-server]', e instanceof Error ? e.message : e);
  }
}
