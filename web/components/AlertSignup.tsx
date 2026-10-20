'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { track, getDistinctId, GOAL_EVENTS, PROMPT_EVENTS, ALERT_SUBMIT_FAILED_EVENT } from '@/lib/analytics';
import { getAlertEmail, rememberAlertEmail, subscribeAlertEmail } from '@/lib/alert-memory';

/**
 * Alert signup. An email address and nothing else.
 *
 * The old CRA flow required a Firebase account: SaveAlertButton stashed the
 * intent in sessionStorage, opened the auth modal, and completed the save after
 * sign-in. That is the friction the r/handtools thread singled out, where "no
 * signup needed" was the selling point — so this asks for an address, sends one
 * confirmation click, and creates no user record at all.
 *
 * `phrase` is the plural noun phrase for the cluster ("Preston moulding
 * planes"). `heading` overrides the default title: the guide page uses it to
 * lead with "Nothing for sale right now" when the form is standing in for the
 * for-sale list. `compact` is the one-line form the return prompt uses.
 *
 * Once an address has signed up on this device, every instance switches to a
 * one-tap "also alert me for this tool" — nobody types their email twice.
 *
 * Telemetry: `email_prompt_shown` once when the form scrolls into view,
 * `alert_submitted` when the API accepts the request. The POST carries the
 * browser's PostHog id so the server can attribute the later
 * `alert_confirmed` (the real conversion, clicked from a mail client in a
 * fresh session) to the same person. `surface` / `placement` say where the
 * form was.
 */
export default function AlertSignup({
  canonicalType, canonicalBrand, canonicalSize, phrase, heading, className = 'mt-10',
  surface = 'guide_page', placement = 'bottom', variant = null, compact = false, onDismiss,
}: {
  canonicalType: string;
  canonicalBrand: string;
  canonicalSize?: string | null;
  phrase: string;
  heading?: string;
  className?: string;
  surface?: string;
  placement?: string;
  variant?: string | null;
  compact?: boolean;
  onDismiss?: () => void;
}) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const ref = useRef<HTMLElement>(null);

  // The server snapshot is null so the prerendered HTML always carries the
  // form; the client re-renders with the remembered address after hydration.
  const known = useSyncExternalStore(subscribeAlertEmail, getAlertEmail, () => null);

  // One "shown" per instance, when it is actually in view.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fire = () => track(PROMPT_EVENTS.SHOWN, { surface, placement, canonical_type: canonicalType, canonical_brand: canonicalBrand });
    if (typeof IntersectionObserver === 'undefined') { fire(); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { fire(); io.disconnect(); }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [surface, placement, canonicalType, canonicalBrand]);

  async function send(address: string) {
    if (state === 'sending') return;
    setState('sending');
    const attribution = { posthog_distinct_id: getDistinctId(), surface, placement, variant };
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: address,
          canonical_type: canonicalType,
          canonical_brand: canonicalBrand,
          canonical_size: canonicalSize ?? null,
          attribution,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState('error');
        setMessage(data.error || 'Something went wrong.');
        track(ALERT_SUBMIT_FAILED_EVENT, { surface, placement, status: res.status, one_tap: Boolean(known) });
        return;
      }
      setState('done');
      setMessage(data.message);
      rememberAlertEmail(address);
      track(GOAL_EVENTS.ALERT_SUBMITTED, {
        surface, placement, variant,
        one_tap: Boolean(known),
        canonical_type: canonicalType,
        canonical_brand: canonicalBrand,
        canonical_size: canonicalSize ?? null,
      });
    } catch {
      setState('error');
      setMessage('Network problem — try again.');
      track(ALERT_SUBMIT_FAILED_EVENT, { surface, placement, status: 0, one_tap: Boolean(known) });
    }
  }

  const box = compact
    ? `${className} flex flex-wrap items-center justify-between gap-3 rounded-lg border border-honey bg-bone-light px-4 py-3`
    : `${className} rounded-lg border border-bone-dark bg-bone-light p-6`;

  if (state === 'done') {
    return (
      <section ref={ref} className={box} data-placement={placement}>
        <div>
          <h2 className={`font-display font-semibold text-spruce ${compact ? 'text-base' : 'text-lg'}`}>
            {known ? 'Done' : 'Check your email'}
          </h2>
          <p className="mt-1 text-sm text-spruce-light">
            {known ? `You'll get one email when a match is listed, at ${known}.` : message}
          </p>
        </div>
      </section>
    );
  }

  // Returning signer-up: one tap, no typing.
  if (known) {
    return (
      <section ref={ref} className={box} data-placement={placement}>
        <div className="min-w-0">
          <h2 className={`font-display font-semibold text-spruce ${compact ? 'text-base' : 'text-lg'}`}>
            {compact ? `Alert me when another is listed` : `Also alert me when ${phrase} are listed`}
          </h2>
          <p className="mt-1 truncate text-sm text-spruce-light">Alerts go to {known}.</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => send(known)} disabled={state === 'sending'}
                  className="rounded bg-honey px-5 py-2.5 font-medium text-dark-teal hover:bg-honey-light disabled:opacity-60">
            {state === 'sending' ? 'Saving…' : 'Alert me'}
          </button>
          {onDismiss && <Dismiss onClick={onDismiss} />}
        </div>
        {state === 'error' && <p className="mt-2 w-full text-sm text-error" role="alert">{message}</p>}
      </section>
    );
  }

  return (
    <section ref={ref} className={box} data-placement={placement}>
      <div className={compact ? 'min-w-0' : ''}>
        <h2 className={`font-display font-semibold text-spruce ${compact ? 'text-base' : 'text-lg'}`}>
          {heading ?? (compact ? `Hear when another is listed?` : `Tell me when ${phrase} are listed`)}
        </h2>
        {!compact && (
          <p className="mt-2 text-sm text-spruce-light">
            {heading
              ? `One email when ${phrase} turn up anywhere we index. No account, no password.`
              : 'One email per match, across every source we index. No account, no password, unsubscribe any time.'}
          </p>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(email.trim().toLowerCase()); }}
            className={compact ? 'flex flex-wrap items-center gap-2' : 'mt-4 flex flex-col gap-2 sm:flex-row'}>
        <label htmlFor={`alert-email-${placement}`} className="sr-only">Email address</label>
        <input
          id={`alert-email-${placement}`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          inputMode="email"
          className={`rounded border border-bone-dark bg-bone px-3 py-2.5 text-dark-teal placeholder:text-spruce-light focus:border-honey focus:outline-none ${compact ? 'w-48' : 'w-full sm:max-w-xs'}`}
        />
        <button
          type="submit"
          disabled={state === 'sending'}
          className="rounded bg-honey px-5 py-2.5 font-medium text-dark-teal hover:bg-honey-light disabled:opacity-60"
        >
          {state === 'sending' ? 'Sending…' : compact ? 'Alert me' : 'Email me'}
        </button>
        {onDismiss && <Dismiss onClick={onDismiss} />}
      </form>

      {state === 'error' && (
        <p className="mt-2 w-full text-sm text-error" role="alert">{message}</p>
      )}
    </section>
  );
}

function Dismiss({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Dismiss"
            className="rounded px-2 py-1 text-sm text-spruce-light hover:bg-bone-dark hover:text-spruce">
      ✕
    </button>
  );
}
