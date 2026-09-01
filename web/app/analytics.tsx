'use client';

/**
 * Client-side analytics for the price-guide app.
 *
 * These 800+ pages are the acquisition channel and, until now, carried no
 * instrumentation at all — there was no way to answer "do the guide pages draw
 * traffic?", which is the question that gates whether the eBay normalization
 * backlog is worth paying for.
 *
 * Two deliberate choices:
 *
 * 1. NO useSearchParams. Reading it in a client component opts the whole route
 *    out of static generation unless every consumer is wrapped in Suspense, and
 *    these routes are prerendered on purpose — that prerendering IS the SEO
 *    value. `usePathname` alone is enough to detect client-side navigation, and
 *    posthog fills $current_url from window.location anyway, so query strings
 *    and UTM parameters still land on the event.
 *
 * 2. capture_pageview: false. The App Router does not reload the document on
 *    navigation, so posthog's automatic pageview would only ever fire once per
 *    session. The effect below fires one per route instead.
 *
 * Config otherwise mirrors src/index.js in the CRA app so both surfaces report
 * into the same PostHog project consistently.
 */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import posthog from 'posthog-js';

export function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    // No key in local dev / unconfigured previews: stay silent rather than
    // throwing, matching the CRA app's behaviour.
    if (!key || posthog.__loaded) return;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      autocapture: true,
      capture_pageview: false,
      capture_pageleave: true,
    });
  }, []);

  useEffect(() => {
    if (!posthog.__loaded) return;
    posthog.capture('$pageview');
  }, [pathname]);

  return null;
}
