/**
 * The price-guide answer for one cluster, with the honesty fields an agent
 * needs: confidence from sample size, freshness from the stats build and the
 * last sale, coverage from which sources the sales came from and what was
 * excluded. Numbers are USD as numbers (price_stats stores dollars as NUMERIC
 * strings).
 */
import { SITE_URL } from '@/lib/site';
import { clusterPath } from '@/lib/guide-paths';
import {
  activeAggregate, clusterFacts, soldComps, activeListings, toRef,
  SOLD_MIN_FOR_REFERENCE, ASKING_MIN_FOR_REFERENCE, FRESH_DAYS,
  type Cluster, type ClusterRef,
} from '@/lib/price-guide';
import type { PriceGuide, PriceGuideRef } from './schemas';
import { fromGuideListing, iso } from './license';

const HIGH_MIN = 20;

const n = (v: string | number | null | undefined): number | null =>
  v === null || v === undefined || v === '' ? null : Number(v);

export function confidenceFor(sold: number, asking: number): { confidence: PriceGuide['confidence']; note: string } {
  if (sold >= HIGH_MIN) return { confidence: 'high', note: `${sold} recorded sales.` };
  if (sold >= SOLD_MIN_FOR_REFERENCE) return { confidence: 'medium', note: `${sold} recorded sales; percentiles beyond the quartiles are withheld under 20.` };
  if (sold > 0) return { confidence: 'low', note: `Only ${sold} recorded sale${sold === 1 ? '' : 's'}: no sold median is published. ${asking >= ASKING_MIN_FOR_REFERENCE ? `The asking block (${asking} asks) is the reference.` : ''}`.trim() };
  if (asking >= ASKING_MIN_FOR_REFERENCE) return { confidence: 'low', note: `No recorded sales; ${asking} asking prices only. Asking is not selling.` };
  return { confidence: 'none', note: 'Not enough evidence to publish a figure.' };
}

export function guideUrl(ref: Pick<ClusterRef, 'typeSlug' | 'brandSlug' | 'sizeSlug' | 'modelSlug' | 'planeType'>): string {
  return `${SITE_URL}${clusterPath(ref)}`;
}

export function refToApi(r: ClusterRef): PriceGuideRef {
  const sold = r.sold_count ?? 0;
  return {
    cluster_key: r.cluster_key,
    grain: r.grain,
    type: r.canonical_type,
    brand: r.canonical_brand,
    model: r.canonical_model,
    size: r.canonical_size,
    plane_type: r.planeType,
    sold_count: sold,
    sold_median: sold >= SOLD_MIN_FOR_REFERENCE ? n(r.sold_p50) : null,
    asking_count: r.asking_count ?? 0,
    for_sale_now: r.asking_count_active ?? 0,
    confidence: confidenceFor(sold, r.asking_count ?? 0).confidence,
    guide_url: guideUrl(r),
    stats_built_at: iso(r.last_built_at),
  };
}

export async function priceGuide(c: Cluster, opts: { includeComps?: boolean } = {}): Promise<PriceGuide> {
  const ref = toRef({ ...c, canonical_type: c.canonical_type ?? '', canonical_brand: c.canonical_brand ?? '' });
  const [facts, agg, comps] = await Promise.all([
    clusterFacts(c),
    activeAggregate(c),
    opts.includeComps
      ? Promise.all([soldComps(c, 12), activeListings(c, 12)])
      : Promise.resolve(null),
  ]);
  const sold = c.sold_count ?? 0;
  const asking = c.asking_count ?? 0;
  const { confidence, note } = confidenceFor(sold, asking);
  const soldOk = sold >= SOLD_MIN_FOR_REFERENCE;
  const askOk = asking >= ASKING_MIN_FOR_REFERENCE;
  const url = guideUrl(ref);

  const out: PriceGuide = {
    cluster_key: c.cluster_key,
    grain: c.grain,
    type: c.canonical_type ?? ref.canonical_type,
    brand: c.canonical_brand ?? ref.canonical_brand,
    model: c.canonical_model,
    size: c.canonical_size,
    plane_type_number: c.plane_type_number,
    guide_url: url,
    confidence,
    confidence_note: note,
    sold: {
      window: 'all_time',
      count: sold,
      median: soldOk ? n(c.sold_p50) : null,
      mean: soldOk ? n(c.sold_mean) : null,
      p10: soldOk ? n(c.sold_p10) : null,
      p25: soldOk ? n(c.sold_p25) : null,
      p75: soldOk ? n(c.sold_p75) : null,
      p90: soldOk ? n(c.sold_p90) : null,
      by_source_kind: soldOk ? c.sold_by_kind : null,
    },
    asking: {
      window_days: 365,
      count: asking,
      count_active: c.asking_count_active ?? 0,
      median: askOk ? n(c.asking_p50) : null,
      mean: askOk ? n(c.asking_mean) : null,
      p25: askOk ? n(c.asking_p25) : null,
      p75: askOk ? n(c.asking_p75) : null,
      by_source_kind: askOk ? c.asking_by_kind : null,
    },
    for_sale_now: {
      count: agg.offer_count,
      low: agg.low_cents === null ? null : agg.low_cents / 100,
      high: agg.high_cents === null ? null : agg.high_cents / 100,
    },
    freshness: {
      stats_built_at: iso(c.last_built_at),
      first_sale_at: iso(facts.firstAt),
      last_sale_at: iso(facts.lastAt),
      sales_last_365d: facts.recent,
      active_window_days: FRESH_DAYS,
    },
    coverage: {
      sources: facts.sources.map((s) => ({ name: s.name, sales: s.n })),
      sales_total: facts.total,
      lots_excluded: facts.lotsExcluded,
      parts_excluded: facts.junkExcluded,
      method: 'Median and quartiles over public listings, de-duplicated across sources; multi-item lots and parts/project listings excluded; realized price used where a sale price is known. Rebuilt nightly.',
    },
  };
  if (comps) {
    const [soldRows, activeRows] = comps;
    out.comps = {
      sold: soldRows.map((l) => fromGuideListing(l, c, url)),
      active: activeRows.map((l) => fromGuideListing(l, c, url)),
    };
  }
  return out;
}
