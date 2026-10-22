'use client';

import { useState } from 'react';

/** Posts to /api/v1/keys; the key arrives by email, never on screen. */
export function KeyRequestForm({ action }: { action: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState('busy');
    try {
      const res = await fetch(action, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: fd.get('email'), name: fd.get('name') }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.errors?.[0]?.message || 'Try again shortly.');
      setMessage(j.data?.message || 'Check your email.');
      setState('done');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Try again shortly.');
      setState('error');
    }
  }

  if (state === 'done') return <p className="mt-4 rounded-md bg-honey/20 p-3 text-sm text-spruce">{message}</p>;

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
      <label className="flex-1 text-sm text-spruce">
        <span className="block text-xs text-spruce-light">What will use it</span>
        <input name="name" required minLength={2} maxLength={80} placeholder="Acme shopping agent" className="mt-1 w-full rounded-md border border-bone-dark bg-white px-3 py-2" />
      </label>
      <label className="flex-1 text-sm text-spruce">
        <span className="block text-xs text-spruce-light">Email</span>
        <input name="email" type="email" required placeholder="you@example.com" className="mt-1 w-full rounded-md border border-bone-dark bg-white px-3 py-2" />
      </label>
      <button type="submit" disabled={state === 'busy'} className="rounded-md bg-honey px-4 py-2 font-medium text-spruce disabled:opacity-60">
        {state === 'busy' ? 'Sending…' : 'Email me a key'}
      </button>
      {state === 'error' && <p className="text-sm text-red-700 sm:ml-2">{message}</p>}
    </form>
  );
}
