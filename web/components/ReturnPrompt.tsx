'use client';

import { useEffect, useState } from 'react';
import AlertSignup from './AlertSignup';
import { track, PROMPT_EVENTS } from '@/lib/analytics';
import { CLICKOUT_EVENT } from './OutboundListingLink';
import { isDismissed, dismiss } from '@/lib/alert-memory';

const KEY = 'return_prompt';

/**
 * The one self-appearing ask on a guide page. Listings open in a new tab, so
 * after a click-out the guide page is still here when the visitor comes
 * back; that moment — they looked at one, they are still interested — is
 * when a one-line "hear when another is listed?" is welcome. It renders
 * inline above the for-sale list, covers nothing, shows at most once per
 * page view, and a dismissal keeps it away on this device for 30 days.
 */
export default function ReturnPrompt({
  canonicalType, canonicalBrand, canonicalSize, singular,
}: { canonicalType: string; canonicalBrand: string; canonicalSize?: string | null; singular: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isDismissed(KEY)) return;
    let armed = false;
    let shown = false;
    const onClickout = () => { armed = true; };
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !armed || shown) return;
      shown = true;
      setShow(true);
    };
    window.addEventListener(CLICKOUT_EVENT, onClickout);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      window.removeEventListener(CLICKOUT_EVENT, onClickout);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  if (!show) return null;

  return (
    <AlertSignup
      compact
      className="mb-4"
      canonicalType={canonicalType}
      canonicalBrand={canonicalBrand}
      canonicalSize={canonicalSize}
      phrase={singular}
      surface="guide_page"
      placement={KEY}
      onDismiss={() => {
        dismiss(KEY);
        setShow(false);
        track(PROMPT_EVENTS.DISMISSED, { surface: 'guide_page', placement: KEY });
      }}
    />
  );
}
