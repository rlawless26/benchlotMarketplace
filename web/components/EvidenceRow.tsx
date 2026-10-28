import { confidenceFor } from '@/lib/api/prices';
import type { ClusterFacts } from '@/lib/price-guide';

const CONFIDENCE_CLASS: Record<string, string> = {
  high: 'bg-success/10 text-success',
  // Not `warning`: it is the same hex as honey-dark, which every price uses.
  medium: 'bg-info/10 text-info',
  low: 'bg-error/10 text-error',
  none: 'bg-error/10 text-error',
};
const CONFIDENCE_LABEL: Record<string, string> = {
  high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence', none: 'Low confidence',
};

function kindCount(v: unknown): number {
  if (typeof v === 'number') return v;
  if (v && typeof v === 'object' && 'count' in v) return Number((v as { count?: number }).count ?? 0);
  return 0;
}

function shortDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/**
 * What the API tells an agent, said to a person: how much evidence sits
 * behind the number, how fresh it is, where it came from, and what was left
 * out. Same thresholds as the API's `confidence` (lib/api/prices.ts), so a
 * page and an answer built from it never disagree. Lives inside the sold
 * card, under the figures; the opening sentence above is untouched.
 */
export default function EvidenceRow({ soldCount, askingCount, facts, byKind, builtAt, full }: {
  soldCount: number;
  askingCount: number;
  facts: ClusterFacts;
  byKind: Record<string, unknown> | null;
  /** The stats build this page reflects; staleness is measured against it, not the clock. */
  builtAt: string | null;
  /** False on pages under the 8-sale threshold: pill and latest sale only. */
  full: boolean;
}) {
  const { confidence } = confidenceFor(soldCount, askingCount);
  const latest = shortDate(facts.lastAt);
  const stale = facts.lastAt && builtAt
    ? new Date(builtAt).getTime() - new Date(facts.lastAt).getTime() > 365 * 86400e3
    : false;

  const kinds = byKind
    ? Object.entries(byKind).map(([k, v]) => [k, kindCount(v)] as const).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])
    : [];
  const kindTotal = kinds.reduce((n, [, c]) => n + c, 0);
  const dealer = kinds.find(([k]) => k === 'Dealer')?.[1] ?? 0;
  const dealerHeavy = full && kindTotal > 0 && dealer / kindTotal >= 0.8;
  const kindLabel: Record<string, string> = { Dealer: 'dealer', Marketplace: 'marketplace', Forum: 'forum', Reddit: 'forum', Auction: 'auction' };

  return (
    <div className="mt-4 text-sm text-spruce-light">
      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${CONFIDENCE_CLASS[confidence]}`}>
        {CONFIDENCE_LABEL[confidence]}
      </span>
      {full ? (
        <p className="mt-2">
          {soldCount.toLocaleString('en-US')} sales on record, {facts.recent.toLocaleString('en-US')} in the last twelve months
          {latest ? `, the latest on ${latest}.` : '.'}
          {stale && ' Nothing has sold in the last year; treat the figures as historical.'}
          {kinds.length > 0 && (
            <>
              {' '}Sources: {kinds.map(([k, n]) => `${n.toLocaleString('en-US')} ${kindLabel[k] ?? k.toLowerCase()}`).join(', ')} sales.
              {dealerHeavy && ' Dealer sales run above what the same tool fetches on eBay or in a forum.'}
            </>
          )}
          {(facts.lotsExcluded > 0 || facts.junkExcluded > 0) && (
            <>
              {' '}{facts.lotsExcluded > 0 ? `${facts.lotsExcluded} ${facts.lotsExcluded === 1 ? 'lot' : 'lots'}` : ''}
              {facts.lotsExcluded > 0 && facts.junkExcluded > 0 ? ' and ' : ''}
              {facts.junkExcluded > 0 ? `${facts.junkExcluded} parts ${facts.junkExcluded === 1 ? 'listing' : 'listings'}` : ''}
              {' '}left out of the figures.
            </>
          )}
        </p>
      ) : (
        latest && <p className="mt-2">The latest sale on record was on {latest}.</p>
      )}
    </div>
  );
}
