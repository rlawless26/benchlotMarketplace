/**
 * One place the batch scripts get their Anthropic client.
 *
 * With POSTHOG_KEY (the public project token; NEXT_PUBLIC_POSTHOG_KEY is
 * accepted too) the client is PostHog's @posthog/ai wrapper, which captures
 * one `$ai_generation` event per call — model, latency, tokens, cost, the
 * prompt and the reply — into LLM analytics. Without the key it is the plain
 * SDK and nothing changes. Either way the returned object is a drop-in for
 * `new Anthropic()`.
 *
 * Every script runs as the service identity `benchlot-ingest` so nightly
 * runs do not mint thousands of PostHog persons; the per-call
 * `posthogTraceId` / `posthogProperties` (passed through messages.create)
 * say which listing, brand or thread a generation was about. Call
 * `shutdown()` before the process exits so the queue flushes.
 */
const Anthropic = require('@anthropic-ai/sdk');

const SERVICE_DISTINCT_ID = 'benchlot-ingest';

function createAnthropic(opts = {}) {
  const key = process.env.POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    return { client: new Anthropic.Anthropic(opts), posthog: null, shutdown: async () => {} };
  }
  // Required lazily so a machine without the packages still runs the plain
  // path (the workflow installs them; a stale local checkout might not).
  const { PostHog } = require('posthog-node');
  const { Anthropic: PostHogAnthropic } = require('@posthog/ai/anthropic');
  const posthog = new PostHog(key, {
    host: process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  });
  const client = new PostHogAnthropic({
    apiKey: opts.apiKey || process.env.ANTHROPIC_API_KEY,
    posthog,
    ...opts,
  });
  return {
    client,
    posthog,
    shutdown: () => posthog.shutdown().catch((e) => console.warn('[posthog] flush failed:', e?.message)),
  };
}

/** Per-call monitoring params for messages.create; empty when telemetry is off. */
function telemetry(feature, traceId, properties = {}) {
  const key = process.env.POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return {};
  return {
    posthogDistinctId: SERVICE_DISTINCT_ID,
    posthogTraceId: traceId,
    posthogProperties: { feature, ...properties },
  };
}

module.exports = { createAnthropic, telemetry, SERVICE_DISTINCT_ID };
