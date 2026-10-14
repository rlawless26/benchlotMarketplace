'use client';

import { useState } from 'react';
import { track } from '@/lib/analytics';
import { guidePathFor, brandHubPath, slug } from '@/lib/guide-paths';
import OutboundListingLink from '@/components/OutboundListingLink';
import type { ScanTool, ScanReference, ScanListing } from '@/lib/toolscan';
import { TOOLSCAN_TYPES } from '@/lib/toolscan-prompt';

export type Feedback = {
  vote: 'correct' | 'corrected';
  originalResult: Record<string, unknown>;
  correctedResult: Record<string, unknown> | null;
  userEdits: Record<string, unknown> | null;
};

const CONFIDENCE: Record<string, string> = {
  High: 'bg-success/10 text-success',
  Medium: 'bg-warning/10 text-warning',
  Low: 'bg-error/10 text-error',
};
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Project'];
// The closed type list the scanner emits; the correction select offers the same.
const TYPES: string[] = TOOLSCAN_TYPES;

const dollars = (c: number | null) => (c == null ? '—' : `$${Math.round(c / 100).toLocaleString('en-US')}`);

/**
 * The identification, the reference band, the matching listings and the
 * feedback vote. Port of the CRA ToolScanCardFull; the follow-up-photo flow
 * (previous_scan_id) was dropped for v1 and can return as its own component.
 */
export default function ScanResultCard({
  tool, scanId, previewImage, reference, listings, onFeedback, onUpdate,
}: {
  tool: ScanTool;
  scanId: string | null;
  previewImage?: string | null;
  reference: ScanReference | null;
  listings: ScanListing[];
  onFeedback: (f: Feedback) => void;
  onUpdate: (t: ScanTool) => void;
}) {
  const [feedback, setFeedback] = useState<null | 'correcting' | 'saved_correct' | 'saved_corrected'>(null);
  const [analysisOpen, setAnalysisOpen] = useState(true);
  const trustedBrand = tool.canonical_brand && tool.canonical_brand !== 'Unknown' && tool.confidence !== 'Low'
    ? tool.canonical_brand : null;
  const guideHref = reference?.guidePath ?? guidePathFor(tool.canonical_type, trustedBrand);
  const hubHref = trustedBrand ? brandHubPath(slug(trustedBrand)) : null;
  const searchHref = (() => {
    const p = new URLSearchParams();
    const q = [trustedBrand, tool.canonical_model].filter(Boolean).join(' ');
    if (q) p.set('q', q);
    if (tool.canonical_type) p.set('cat', tool.canonical_type);
    if (trustedBrand) p.set('maker', trustedBrand);
    return `/search${p.toString() ? `?${p}` : ''}`;
  })();

  const name = (() => {
    let n = [tool.canonical_brand, tool.canonical_model].filter(Boolean).join(' ');
    if (Number.isInteger(tool.plane_type_number)) n = n ? `${n} · Type ${tool.plane_type_number}` : `Type ${tool.plane_type_number}`;
    return n || tool.canonical_type || 'Tool identified';
  })();

  const [fields, setFields] = useState({
    canonical_brand: tool.canonical_brand || '',
    canonical_model: tool.canonical_model || '',
    canonical_type: tool.canonical_type || '',
    plane_type_number: Number.isInteger(tool.plane_type_number) ? String(tool.plane_type_number) : '',
    condition: tool.condition || 'Good',
  });
  const set = (k: keyof typeof fields, v: string) => setFields((f) => ({ ...f, [k]: v }));

  const original = () => ({
    canonical_brand: tool.canonical_brand, canonical_model: tool.canonical_model, canonical_type: tool.canonical_type,
    plane_type_number: Number.isInteger(tool.plane_type_number) ? tool.plane_type_number : null,
    condition: tool.condition, confidence: tool.confidence,
  });
  const corrected = () => ({
    canonical_brand: fields.canonical_brand, canonical_model: fields.canonical_model, canonical_type: fields.canonical_type,
    plane_type_number: fields.plane_type_number.trim() === '' ? null : parseInt(fields.plane_type_number, 10),
    condition: fields.condition,
  });
  const edits = () => {
    const o = original() as Record<string, unknown>;
    const c = corrected() as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of ['canonical_brand', 'canonical_model', 'canonical_type', 'plane_type_number', 'condition']) {
      if ((o[k] ?? '') !== (c[k] ?? '')) out[k] = { from: o[k] ?? null, to: c[k] ?? null };
    }
    return Object.keys(out).length ? out : null;
  };

  const confirmed = feedback === 'saved_correct' || feedback === 'saved_corrected';
  const guideClick = (surface: string) => () =>
    track('toolscan_price_guide_link_clicked', { scanId: scanId || null, cluster_key: null, surface });

  return (
    <div className="rounded-xl border border-bone-dark bg-bone-light shadow-sm">
      <div className="p-5">
        <div className="flex items-start gap-4">
          {previewImage && (
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-bone-dark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewImage} alt="Scanned tool" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-semibold text-spruce">{name}</h2>
            {tool.canonical_type && <p className="mt-0.5 text-sm text-spruce-light">{tool.canonical_type}</p>}
            {(tool.era_estimate || tool.canonical_size) && (
              <p className="mt-2 flex flex-wrap gap-x-4 text-spruce-light">
                {tool.canonical_size && <span><strong className="text-dark-teal">Size:</strong> {tool.canonical_size}</span>}
                {tool.era_estimate && <span><strong className="text-dark-teal">Era:</strong> {tool.era_estimate}</span>}
              </p>
            )}
            {reference && (
              <p className="mt-2 text-sm text-spruce-light">
                {reference.source === 'sold' ? 'Recent sales' : 'Asking prices'}:{' '}
                <strong className="tnum text-honey-dark">{reference.low} – {reference.high}</strong>{' '}
                across {reference.count} {reference.source === 'sold' ? 'recorded sales' : 'listings'}
                {' · '}
                <a href={reference.guidePath} onClick={guideClick('reference')} className="text-honey-dark underline hover:no-underline">
                  see the price guide →
                </a>
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {tool.confidence && (
                <span className={`rounded-full px-2.5 py-0.5 font-medium ${CONFIDENCE[tool.confidence] ?? 'bg-bone-dark text-spruce'}`}>
                  {tool.confidence} confidence
                </span>
              )}
              {tool.condition && <span className="rounded-full bg-info/10 px-2.5 py-0.5 font-medium text-info">{tool.condition}</span>}
            </div>
          </div>
        </div>

        {tool.confidence === 'Low' && !confirmed && (
          <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
            <p className="font-semibold text-dark-teal">Low-confidence identification</p>
            <p className="mt-1 text-spruce-light">{tool.confidence_reasoning || 'Review the details carefully; a clearer photo of any maker’s mark would help.'}</p>
          </div>
        )}
      </div>

      {/* Feedback and corrections */}
      <div className="border-t border-bone-dark px-5 pb-4 pt-4">
        {feedback === null && (
          <div className="mb-4 rounded-lg bg-bone p-4">
            <p className="mb-3 font-semibold text-dark-teal">How did we do?</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => { setFeedback('saved_correct'); onFeedback({ vote: 'correct', originalResult: original(), correctedResult: null, userEdits: null }); }}
                      className="rounded bg-honey px-5 py-2.5 text-sm font-medium text-dark-teal hover:bg-honey-light">
                Looks right
              </button>
              <button type="button" onClick={() => setFeedback('correcting')}
                      className="rounded bg-spruce px-5 py-2.5 text-sm font-medium text-bone hover:bg-spruce-light">
                I&rsquo;ll make some corrections
              </button>
            </div>
          </div>
        )}
        {feedback === 'saved_correct' && (
          <p className="mb-4 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">Confirmed. Thanks — every answer makes the next identification better.</p>
        )}
        {feedback === 'saved_corrected' && (
          <p className="mb-4 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">Corrections saved. Thanks for helping us get better at this.</p>
        )}

        <h3 className="font-display text-base font-semibold uppercase tracking-wide text-spruce">Identification</h3>
        {confirmed ? (
          <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {([['Maker', fields.canonical_brand], ['Model', fields.canonical_model], ['Type', fields.canonical_type],
               ['Plane type number', fields.plane_type_number], ['Condition', fields.condition]] as const).map(([l, v]) => (
              <div key={l} className="rounded-lg border border-bone-dark bg-bone px-3 py-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-spruce-light">{l}</dt>
                <dd className="mt-0.5 text-dark-teal">{v || '—'}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-spruce-light">Maker</span>
              <input value={fields.canonical_brand} onChange={(e) => set('canonical_brand', e.target.value)} disabled={feedback !== 'correcting'}
                     className="w-full rounded border border-bone-dark bg-bone px-3 py-2 text-dark-teal focus:border-honey focus:outline-none disabled:opacity-80" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-spruce-light">Model</span>
              <input value={fields.canonical_model} onChange={(e) => set('canonical_model', e.target.value)} placeholder="e.g. No. 5" disabled={feedback !== 'correcting'}
                     className="w-full rounded border border-bone-dark bg-bone px-3 py-2 text-dark-teal focus:border-honey focus:outline-none disabled:opacity-80" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-spruce-light">Type</span>
              <select value={fields.canonical_type} onChange={(e) => set('canonical_type', e.target.value)} disabled={feedback !== 'correcting'}
                      className="w-full rounded border border-bone-dark bg-bone px-3 py-2 text-dark-teal focus:border-honey focus:outline-none disabled:opacity-80">
                <option value="">—</option>
                {(TYPES.includes(fields.canonical_type) ? TYPES : [fields.canonical_type, ...TYPES]).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-spruce-light">Plane type number</span>
              <input type="number" min={1} max={20} value={fields.plane_type_number} onChange={(e) => set('plane_type_number', e.target.value)}
                     placeholder="1–20, Stanley bench planes only" disabled={feedback !== 'correcting'}
                     className="w-full rounded border border-bone-dark bg-bone px-3 py-2 text-dark-teal focus:border-honey focus:outline-none disabled:opacity-80" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-spruce-light">Condition</span>
              <select value={fields.condition} onChange={(e) => set('condition', e.target.value)} disabled={feedback !== 'correcting'}
                      className="w-full rounded border border-bone-dark bg-bone px-3 py-2 text-dark-teal focus:border-honey focus:outline-none disabled:opacity-80">
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            {feedback === 'correcting' && (
              <div className="sm:col-span-2">
                <button type="button"
                        onClick={() => {
                          setFeedback('saved_corrected');
                          onFeedback({ vote: 'corrected', originalResult: original(), correctedResult: corrected(), userEdits: edits() });
                          onUpdate({ ...tool, ...corrected() });
                        }}
                        className="rounded bg-honey px-6 py-2.5 font-medium text-dark-teal hover:bg-honey-light">
                  Save corrections
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Matching listings: identification back to the index. */}
      {tool.canonical_type && tool.canonical_type !== 'Other' && (
        <div className="border-t border-bone-dark px-5 py-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="font-display text-base font-semibold uppercase tracking-wide text-spruce">For sale now</h3>
            <span className="text-sm">
              {guideHref && <a href={guideHref} onClick={guideClick('listings')} className="text-honey-dark hover:underline">Full price guide →</a>}
              {hubHref && <a href={hubHref} onClick={guideClick('brand_hub')} className="ml-3 text-honey-dark hover:underline">All {trustedBrand} tools →</a>}
            </span>
          </div>
          {listings.length === 0 ? (
            <div className="rounded-lg bg-bone p-4 text-sm">
              <p className="text-dark-teal">No matching listings right now.</p>
              <a href={searchHref} onClick={() => track('toolscan_save_alert_clicked', { scanId: scanId || null, has_brand: Boolean(trustedBrand), canonical_type: tool.canonical_type })}
                 className="mt-1 inline-block font-medium text-honey-dark hover:underline">
                Search the index and save an alert →
              </a>
            </div>
          ) : (
            <>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {listings.map((l, i) => (
                  <li key={l.id}>
                    <OutboundListingLink
                      href={l.source_url} listingId={l.id} source={l.source} sourceKind={null}
                      priceCents={l.price_cents} status="active" position={i} clusterKey={null} surface="scan_results"
                      className="block rounded-lg border border-bone-dark bg-bone p-3 hover:border-honey"
                    >
                      <span className="flex items-start gap-3">
                        {l.image && (
                          <span className="h-14 w-14 shrink-0 overflow-hidden rounded bg-bone-dark">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={l.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 text-sm text-dark-teal">{l.title_raw}</span>
                          <span className="mt-1 flex items-center justify-between">
                            <span className="tnum font-semibold text-honey-dark">{dollars(l.price_cents)}</span>
                            <span className="text-xs text-spruce-light">{l.source_name} ↗</span>
                          </span>
                        </span>
                      </span>
                    </OutboundListingLink>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-right text-sm">
                <a href={searchHref} className="font-medium text-honey-dark hover:underline">See all matches →</a>
              </p>
            </>
          )}
        </div>
      )}

      {(tool.condition_notes || tool.confidence_reasoning) && (
        <div className="border-t border-bone-dark">
          <button type="button" onClick={() => setAnalysisOpen((o) => !o)}
                  className="flex w-full items-center justify-between px-5 py-3 text-left font-semibold text-dark-teal hover:bg-bone">
            <span>How we got there</span>
            <span aria-hidden className="text-spruce-light">{analysisOpen ? '▴' : '▾'}</span>
          </button>
          {analysisOpen && (
            <dl className="space-y-3 px-5 pb-5 text-sm">
              {tool.condition_notes && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-spruce-light">Condition notes</dt>
                  <dd className="mt-0.5 text-spruce">{tool.condition_notes}</dd>
                </div>
              )}
              {tool.confidence_reasoning && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-spruce-light">Reasoning</dt>
                  <dd className="mt-0.5 text-spruce">{tool.confidence_reasoning}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      )}
    </div>
  );
}
