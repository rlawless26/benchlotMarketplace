'use client';

import { useState } from 'react';

/**
 * Alert signup. An email address and nothing else.
 *
 * The old CRA flow required a Firebase account: SaveAlertButton stashed the
 * intent in sessionStorage, opened the auth modal, and completed the save after
 * sign-in. That is the friction the r/handtools thread singled out, where "no
 * signup needed" was the selling point — so this asks for an address, sends one
 * confirmation click, and creates no user record at all.
 */
export default function AlertSignup({
  canonicalType, canonicalBrand, canonicalSize, summary,
}: {
  canonicalType: string;
  canonicalBrand: string;
  canonicalSize?: string | null;
  summary: string;
}) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          canonical_type: canonicalType,
          canonical_brand: canonicalBrand,
          canonical_size: canonicalSize ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState('error');
        setMessage(data.error || 'Something went wrong.');
        return;
      }
      setState('done');
      setMessage(data.message);
    } catch {
      setState('error');
      setMessage('Network problem — try again.');
    }
  }

  if (state === 'done') {
    return (
      <section className="mt-10 rounded-lg border border-bone-dark bg-bone-light p-6">
        <h2 className="font-display text-lg font-semibold text-spruce">Check your email</h2>
        <p className="mt-2 text-sm text-spruce-light">{message}</p>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-lg border border-bone-dark bg-bone-light p-6">
      <h2 className="font-display text-lg font-semibold text-spruce">
        Tell me when a {summary} is listed
      </h2>
      <p className="mt-2 text-sm text-spruce-light">
        One email when something matches, across every source we index.
        No account, no password.
      </p>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="alert-email" className="sr-only">Email address</label>
        <input
          id="alert-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="w-full rounded border border-bone-dark bg-bone px-3 py-2.5 text-dark-teal
                     placeholder:text-spruce-light focus:border-honey focus:outline-none sm:max-w-xs"
        />
        <button
          type="submit"
          disabled={state === 'sending'}
          className="rounded bg-honey px-5 py-2.5 font-medium text-dark-teal hover:bg-honey-light
                     disabled:opacity-60"
        >
          {state === 'sending' ? 'Sending…' : 'Email me'}
        </button>
      </form>

      {state === 'error' && (
        <p className="mt-2 text-sm text-error" role="alert">{message}</p>
      )}
    </section>
  );
}
