/**
 * Alert signup — no account required.
 *
 * Replaces the previous flow, which wrote to the Firestore `saved_searches`
 * collection behind a Firebase sign-in: anonymous users had their intent
 * stashed in sessionStorage while an auth modal opened, and the save completed
 * after they created an account.
 *
 * Two reasons that had to go. It is the exact friction the r/handtools thread
 * singled out, where "no signup needed" was the selling point. And it is now
 * actively misleading: nothing reads `saved_searches` any more, so every alert
 * saved through it would never fire.
 *
 * Alerts live in Postgres and are cluster-scoped (canonical type + brand), so
 * this renders an inline email capture where a cluster is known, and points at
 * the price guide where it isn't — a free-text search has no single tool to
 * watch for.
 */
import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';

export default function SaveAlertButton({ canonicalType, canonicalBrand, canonicalSize, label }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle'); // idle | open | sending | done | error
  const [message, setMessage] = useState('');

  const summary = [canonicalBrand, canonicalType, canonicalSize].filter(Boolean).join(' ');
  const clusterKnown = Boolean(canonicalType && canonicalBrand);

  const submit = useCallback(
    async (e) => {
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
            canonical_size: canonicalSize || null,
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
    },
    [email, canonicalType, canonicalBrand, canonicalSize, state]
  );

  // No cluster to watch (free-text search): send people where alerts work.
  if (!clusterKnown) {
    return (
      <a
        href="/guide"
        className="inline-flex items-center gap-2 rounded-md border border-bone-dark bg-bone-light px-3 py-2 text-sm font-medium text-spruce hover:border-honey"
      >
        Get price alerts
      </a>
    );
  }

  if (state === 'done') {
    return <p className="text-sm text-spruce">{message}</p>;
  }

  if (state === 'idle') {
    return (
      <button
        type="button"
        onClick={() => setState('open')}
        className="inline-flex items-center gap-2 rounded-md bg-honey px-3 py-2 text-sm font-medium text-dark-teal hover:bg-honey-light"
      >
        {label || `Alert me about ${summary}`}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <label htmlFor="save-alert-email" className="sr-only">Email address</label>
      <input
        id="save-alert-email"
        type="email"
        required
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
        className="w-full rounded-md border border-bone-dark bg-white px-3 py-2 text-sm text-dark-teal focus:border-honey focus:outline-none sm:w-56"
      />
      <button
        type="submit"
        disabled={state === 'sending'}
        className="rounded-md bg-honey px-3 py-2 text-sm font-medium text-dark-teal hover:bg-honey-light disabled:opacity-60"
      >
        {state === 'sending' ? 'Sending…' : 'Email me'}
      </button>
      {state === 'error' && (
        <p className="text-sm text-error sm:basis-full" role="alert">{message}</p>
      )}
    </form>
  );
}

SaveAlertButton.propTypes = {
  canonicalType: PropTypes.string,
  canonicalBrand: PropTypes.string,
  canonicalSize: PropTypes.string,
  label: PropTypes.string,
};
