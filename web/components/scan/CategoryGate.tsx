'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { track, getDistinctId } from '@/lib/analytics';
import type { ScanTool } from '@/lib/toolscan';

/**
 * Rendered when the model returns canonical_type 'Other' (or none): the tool
 * is real but outside the categories Benchlot can price. Turns the dead end
 * into a category-interest signal (leads, source 'category_interest').
 */
export default function CategoryGate({
  tool, scanId, imagePaths, previewImage,
}: { tool: ScanTool; scanId: string | null; imagePaths: string[]; previewImage?: string | null }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  useEffect(() => {
    track('category_gate_shown', { scanId: scanId || null, canonical_type: tool.canonical_type || null });
  }, [scanId, tool.canonical_type]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'saving') return;
    setState('saving');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          source: 'category_interest',
          scan_id: scanId || null,
          posthog_distinct_id: getDistinctId(),
          payload: { requested_category: tool.canonical_type || 'unknown', image_paths: imagePaths || [] },
        }),
      });
      if (!res.ok) throw new Error(`leads ${res.status}`);
      setState('done');
      track('category_gate_email_captured', { scanId: scanId || null, canonical_type: tool.canonical_type || null });
    } catch {
      setState('error');
    }
  }

  return (
    <div className="rounded-xl border border-bone-dark bg-bone-light p-6 shadow-sm">
      <div className="flex items-start gap-4">
        {previewImage && (
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-bone-dark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImage} alt="Uploaded tool" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="flex-1">
          <h2 className="font-display text-xl font-semibold text-spruce">We couldn&rsquo;t pin this one down</h2>
          <p className="mt-1 text-spruce-light">
            Benchlot identifies and prices woodworking hand tools and machines — planes, saws, chisels, lathes,
            drill presses and more — but this one didn&rsquo;t match a category it can price with confidence.
          </p>
        </div>
      </div>
      <div className="mt-4 rounded-lg bg-bone p-4 text-sm">
        <p className="font-semibold text-dark-teal">What you can do</p>
        <ul className="mt-2 space-y-1 text-spruce-light">
          <li>· Try another photo — maker&rsquo;s marks, medallions and castings help most</li>
          <li>· <a href="/search" className="text-honey-dark hover:underline">Search the index</a> for it by name</li>
          <li>· <Link href="/guide" className="text-honey-dark hover:underline">Browse the price guide</Link> by category and maker</li>
        </ul>
      </div>
      {state === 'done' ? (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
          Thanks — we&rsquo;ll let you know when this category goes live.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-4">
          <label htmlFor="gate-email" className="mb-1 block text-sm font-medium text-spruce-light">
            Email me when Benchlot covers this category
          </label>
          <div className="flex gap-2">
            <input
              id="gate-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" disabled={state === 'saving'} autoComplete="email" inputMode="email"
              className="flex-1 rounded border border-bone-dark bg-bone px-3 py-2 text-dark-teal focus:border-honey focus:outline-none"
            />
            <button type="submit" disabled={state === 'saving'}
                    className="whitespace-nowrap rounded bg-honey px-5 py-2 text-sm font-medium text-dark-teal hover:bg-honey-light disabled:opacity-50">
              {state === 'saving' ? 'Saving…' : 'Notify me'}
            </button>
          </div>
          {state === 'error' && <p className="mt-2 text-sm text-error">Something went wrong. Try again?</p>}
        </form>
      )}
    </div>
  );
}
