'use client';

import { useState } from 'react';
import type { ScanTool } from '@/lib/toolscan';

/**
 * "Email me a copy." Opt-in, after the result, never a gate: the scan page
 * feeds the price guide, and a wall before the result cut that funnel off.
 * One call saves the lead and sends the results email.
 */
export default function EmailCopyForm({
  tool, scanId, onEmail,
}: { tool: ScanTool | null; scanId: string | null; onEmail?: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const addr = email.trim().toLowerCase();
    if (!addr.includes('@')) { setError('Please enter a valid email address.'); return; }
    setState('sending');
    setError(null);
    try {
      const res = await fetch('/api/toolscan/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: addr,
          scan_id: scanId || null,
          tool: tool ? {
            canonical_brand: tool.canonical_brand || null,
            canonical_type: tool.canonical_type || null,
            canonical_model: tool.canonical_model || null,
            plane_type_number: Number.isInteger(tool.plane_type_number) ? tool.plane_type_number : null,
            era_estimate: tool.era_estimate || null,
            condition: tool.condition || null,
            confidence: tool.confidence || null,
            condition_notes: tool.condition_notes || null,
          } : null,
        }),
      });
      if (!res.ok) console.error('[scan email]', res.status);
    } catch (err) {
      console.error('[scan email]', err);
    } finally {
      // The result is already on screen; the copy is a courtesy either way.
      setState('done');
      onEmail?.(addr);
    }
  }

  if (state === 'done') {
    return (
      <p className="mt-6 rounded-xl border border-bone-dark bg-bone-light p-4 text-center text-sm text-spruce-light">
        Sent. Check your inbox for a copy of this result.
      </p>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-bone-dark bg-bone-light p-6 text-center shadow-sm">
      <h2 className="font-display text-lg font-semibold text-spruce">Want a copy of this in your inbox?</h2>
      <form onSubmit={submit} className="mx-auto mt-3 max-w-sm">
        <div className="flex gap-2">
          <label htmlFor="scan-email" className="sr-only">Email address</label>
          <input
            id="scan-email" type="email" required value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            placeholder="you@example.com" autoComplete="email" inputMode="email"
            className="flex-1 rounded border border-bone-dark bg-bone px-3 py-2.5 text-dark-teal focus:border-honey focus:outline-none"
          />
          <button type="submit" disabled={state === 'sending'}
                  className="whitespace-nowrap rounded bg-honey px-5 py-2.5 font-medium text-dark-teal hover:bg-honey-light disabled:opacity-50">
            {state === 'sending' ? 'Sending…' : 'Email it to me'}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-error">{error}</p>}
        <p className="mt-3 text-xs text-spruce-light">One email with these results. Nothing else unless you ask.</p>
      </form>
    </div>
  );
}
