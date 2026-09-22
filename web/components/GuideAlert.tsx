'use client';

import { useEffect, useState } from 'react';
import AlertSignup from './AlertSignup';
import { GUIDE_ALERT_PLACEMENT_FLAG, getVariant, onFlags } from '@/lib/analytics';

/**
 * Where the alert form sits on a guide page — the first flag-driven test.
 *
 * Flag `guide-alert-placement` (PostHog, multivariate):
 *   control — form after the listings, where it has always been.
 *   top     — form directly under the sold-price block, before the tables.
 *
 * GuideView renders this twice, once per slot. Each instance decides whether
 * the current variant belongs to it, so exactly one form is ever visible.
 *
 * Why client-side flags rather than middleware: the guide pages are
 * prerendered on purpose (that IS the SEO value), and reading a flag on the
 * server would force them dynamic. The cost is a possible one-time shift after
 * flags load. To keep the control experience identical to before — including
 * when PostHog is blocked or absent — the bottom slot renders immediately and
 * only yields once a `top` assignment is known.
 */
export default function GuideAlert({
  slot, canonicalType, canonicalBrand, canonicalSize, summary,
}: {
  slot: 'top' | 'bottom';
  canonicalType: string;
  canonicalBrand: string;
  canonicalSize?: string | null;
  summary: string;
}) {
  const [variant, setVariant] = useState<string | null>(null);

  useEffect(() => {
    const read = () => setVariant(getVariant(GUIDE_ALERT_PLACEMENT_FLAG));
    read();
    return onFlags(read);
  }, []);

  const resolved = variant === 'top' ? 'top' : 'control';
  const show = slot === 'top' ? resolved === 'top' : resolved === 'control';
  if (!show) return null;

  return (
    <AlertSignup
      canonicalType={canonicalType}
      canonicalBrand={canonicalBrand}
      canonicalSize={canonicalSize}
      summary={summary}
      surface="guide_page"
      placement={slot}
      variant={variant ?? 'unassigned'}
    />
  );
}
