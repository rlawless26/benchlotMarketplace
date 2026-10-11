'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { track, getDistinctId } from '@/lib/analytics';
import { prepareImages, MAX_IMAGES } from '@/lib/downscale-image';
import type { ScanTool, ScanResults, ScanReference, ScanListing } from '@/lib/toolscan';
import CategoryGate from './CategoryGate';
import ScanResultCard, { type Feedback } from './ScanResultCard';
import EmailCopyForm from './EmailCopyForm';

// Photos are shrunk in the browser before upload, so the only cap that
// matters here is one that stops a 200 MB screenshot dump from being decoded.
const MAX_FILE_SIZE = 25 * 1024 * 1024;

type ScanResponse = {
  scanId: string; imagePaths: string[]; results: ScanResults;
  reference: ScanReference | null; activeListings: ScanListing[];
};

/**
 * The upload control, placed inside the server-rendered landing by the page
 * (`<ScanLanding upload={<UploadZone />} />`). It reads its handlers from
 * ScanClient's context, which is how a client control can sit inside a
 * server component's markup without the page passing functions across the
 * server/client boundary.
 */
type UploadCtx = {
  dragging: boolean;
  error: string | null;
  onInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent) => void;
  setDragging: (v: boolean) => void;
};
const ScanContext = createContext<UploadCtx | null>(null);

export function UploadZone() {
  const ctx = useContext(ScanContext);
  const picker = (label: string, capture = false) => (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded bg-honey px-6 py-3 font-medium text-dark-teal hover:bg-honey-light">
      {label}
      <input type="file" accept="image/*,.heic,.heif" multiple={!capture} {...(capture ? { capture: 'environment' as const } : {})}
             onChange={ctx?.onInput} className="hidden" />
    </label>
  );
  return (
    <div
      className={`rounded-xl border-2 border-dashed p-8 transition-colors ${ctx?.dragging ? 'border-honey bg-honey/10' : 'border-bone-dark bg-bone-light'}`}
      onDragOver={(e) => { e.preventDefault(); ctx?.setDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); ctx?.setDragging(false); }}
      onDrop={ctx?.onDrop}
    >
      <p className="mb-3 hidden font-medium text-dark-teal sm:block">{ctx?.dragging ? 'Drop your photo here' : 'Drag a photo here, or'}</p>
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <span className="sm:hidden">{picker('Take a photo', true)}</span>
        {picker('Choose photos')}
      </div>
      {ctx?.error && <p className="mt-3 text-sm text-error">{ctx.error}</p>}
    </div>
  );
}

/**
 * The interactive half of /scan. `landing` is the server-rendered page body
 * (H1, example, how it works, with an UploadZone inside it); it is shown
 * until the first photo is picked and replaced by the upload panel and then
 * the result. The HTML a crawler sees already contains the real form.
 */
export default function ScanClient({ landing }: { landing: React.ReactNode }) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [context, setContext] = useState('');
  const [showContext, setShowContext] = useState(false);
  const [started, setStarted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  // Object URLs are revoked on unmount; the ref tracks the latest list
  // without the cleanup closing over a stale render.
  const previewsRef = useRef<string[]>([]);
  useEffect(() => { previewsRef.current = previews; }, [previews]);
  useEffect(() => () => previewsRef.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const addFiles = useCallback((incoming: File[]) => {
    const list = incoming.filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    if (list.length === 0) return;
    if (files.length + list.length > MAX_IMAGES) { setError(`Up to ${MAX_IMAGES} photos per scan.`); return; }
    for (const f of list) {
      if (f.size > MAX_FILE_SIZE) { setError(`${f.name} is too large. The limit is 25 MB per photo.`); return; }
    }
    setError(null);
    setFiles((p) => [...p, ...list]);
    setPreviews((p) => [...p, ...list.map((f) => URL.createObjectURL(f))]);
    setStarted(true);
  }, [files.length]);

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = '';
  };
  const removeAt = (i: number) => {
    URL.revokeObjectURL(previews[i]);
    setFiles((p) => p.filter((_, j) => j !== i));
    setPreviews((p) => p.filter((_, j) => j !== i));
  };
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); addFiles(Array.from(e.dataTransfer.files)); };

  async function scan() {
    if (files.length === 0 || scanning) return;
    setScanning(true);
    setError(null);
    const t0 = Date.now();
    track('toolscan_started', { image_count: files.length, has_context: Boolean(context.trim()) });
    try {
      const images = await prepareImages(files);
      const res = await fetch('/api/toolscan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, context: context.trim() || undefined, distinct_id: getDistinctId() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      const out: ScanResponse = {
        scanId: data.scanId, imagePaths: Array.isArray(data.imagePaths) ? data.imagePaths : [],
        results: data.results, reference: data.reference ?? null,
        activeListings: Array.isArray(data.activeListings) ? data.activeListings : [],
      };
      setResult(out);
      const tool = out.results?.tool;
      track('toolscan_completed', {
        status: tool ? 'success' : 'no_tools',
        canonical_brand: tool?.canonical_brand || null,
        canonical_type: tool?.canonical_type || null,
        canonical_model: tool?.canonical_model || null,
        plane_type_number: tool && Number.isInteger(tool.plane_type_number) ? tool.plane_type_number : null,
        confidence: tool?.confidence || null,
        duration_ms: Date.now() - t0,
      });
      if (tool && tool.canonical_type && tool.canonical_type !== 'Other') {
        track('toolscan_active_listings_shown', {
          scanId: out.scanId, canonical_type: tool.canonical_type, canonical_brand: tool.canonical_brand || null,
          listings_returned: out.activeListings.length,
          filter_strategy: tool.canonical_brand && tool.canonical_brand !== 'Unknown' && tool.confidence !== 'Low' ? 'type_and_brand' : 'type_only',
          cluster_key: null, data_band_applied: Boolean(out.reference),
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
      track('toolscan_completed', { status: 'error', tool_count: 0, error_message: message, duration_ms: Date.now() - t0 });
    } finally {
      setScanning(false);
    }
  }

  async function sendFeedback(f: Feedback) {
    if (!result) return;
    try {
      await fetch('/api/toolscan/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vote: f.vote, scan_id: result.scanId, image_paths: result.imagePaths, email,
          original_result: f.originalResult, corrected_result: f.correctedResult,
          user_edits: f.userEdits, has_edits: Boolean(f.userEdits),
        }),
      });
    } catch (err) {
      console.error('[scan feedback]', err);
    }
  }

  function reset() {
    previews.forEach((u) => URL.revokeObjectURL(u));
    setFiles([]); setPreviews([]); setContext(''); setResult(null); setError(null); setStarted(false); setEmail(null);
  }

  if (!started && !result) {
    return (
      <ScanContext.Provider value={{ dragging, error, onInput, onDrop, setDragging }}>
        {landing}
      </ScanContext.Provider>
    );
  }

  const tool: ScanTool | null = result?.results?.tool ?? null;

  return (
    <div className="mx-auto max-w-3xl">
      {!result && (
        <section className="rounded-xl border border-bone-dark bg-bone-light p-6 shadow-sm">
          <h1 className="font-display text-3xl font-semibold text-spruce">Scan a tool</h1>
          <p className="mt-1 mb-5 text-sm text-spruce-light">Up to {MAX_IMAGES} photos. A maker&rsquo;s mark or casting close-up helps most.</p>
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {previews.map((src, i) => (
              <div key={src} className="relative aspect-square overflow-hidden rounded-lg border border-bone-dark">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
                <button type="button" onClick={() => removeAt(i)} aria-label="Remove photo"
                        className="absolute right-2 top-2 rounded-full bg-spruce/70 px-2 py-0.5 text-xs text-bone hover:bg-spruce">✕</button>
              </div>
            ))}
            {previews.length < MAX_IMAGES && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-bone-dark hover:border-honey hover:bg-honey/5">
                <span className="text-2xl text-spruce-light">+</span>
                <span className="mt-1 text-sm text-spruce-light">Add more</span>
                <input type="file" accept="image/*,.heic,.heif" multiple onChange={onInput} className="hidden" />
              </label>
            )}
          </div>
          <button type="button" onClick={() => setShowContext((s) => !s)} className="text-sm text-spruce-light hover:text-spruce">
            {showContext ? '▴' : '▾'} Add context (optional)
          </button>
          {showContext && (
            <textarea value={context} onChange={(e) => setContext(e.target.value)} rows={3}
                      placeholder={'E.g. "From my grandfather’s workshop" or "Estate sale, mostly machinist tools"'}
                      className="mt-3 w-full resize-none rounded border border-bone-dark bg-bone px-4 py-3 text-sm text-dark-teal focus:border-honey focus:outline-none" />
          )}
          {error && <p className="mt-4 rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">{error}</p>}
          <button type="button" onClick={scan} disabled={files.length === 0 || scanning}
                  className="mt-5 w-full rounded bg-honey px-6 py-3 font-medium text-dark-teal hover:bg-honey-light disabled:cursor-not-allowed disabled:opacity-50">
            {scanning ? 'Identifying…' : `Scan ${files.length === 1 ? 'photo' : `${files.length} photos`}`}
          </button>
          {scanning && <p className="mt-3 text-center text-sm text-spruce-light">This usually takes 15–40 seconds.</p>}
        </section>
      )}

      {result && (
        <>
          <p className="mb-6 text-sm text-spruce-light">
            <span className="font-semibold text-spruce">Benchlot</span> · {tool ? 'Tool identified' : 'No tool identified'}
          </p>
          {!tool && (
            <div className="rounded-xl border border-bone-dark bg-bone-light p-8 text-center text-spruce-light">
              No tool was identified. Try a clearer photo with better lighting.
            </div>
          )}
          {tool && (tool.canonical_type === 'Other' || !tool.canonical_type) && (
            <CategoryGate tool={tool} scanId={result.scanId} imagePaths={result.imagePaths} previewImage={previews[0]} />
          )}
          {tool && tool.canonical_type && tool.canonical_type !== 'Other' && (
            <ScanResultCard
              tool={tool} scanId={result.scanId} previewImage={previews[0]}
              reference={result.reference} listings={result.activeListings}
              onFeedback={sendFeedback}
              onUpdate={(t) => setResult((r) => (r ? { ...r, results: { ...r.results, tool: t } } : r))}
            />
          )}
          <div className="mt-8 text-center">
            <button type="button" onClick={reset} className="rounded bg-honey px-6 py-3 font-medium text-dark-teal hover:bg-honey-light">
              Scan another tool →
            </button>
            <p className="mt-3 text-sm text-spruce-light">
              Or <a href="/search" className="text-honey-dark underline hover:no-underline">search every listing</a> and save an alert for similar tools.
            </p>
          </div>
          {tool && !email && <EmailCopyForm tool={tool} scanId={result.scanId} onEmail={setEmail} />}
          <p className="mt-6 rounded-lg bg-bone-light p-4 text-sm text-spruce-light">
            Benchlot uses AI to identify tools and match listings. Identifications and price ranges are
            suggestions, not appraisals — verify before buying or selling.
          </p>
        </>
      )}
    </div>
  );
}
