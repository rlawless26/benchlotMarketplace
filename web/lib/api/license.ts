/**
 * Per-source redistribution rules, applied to every listing the API returns.
 *
 * - Every row names its source and carries the attribution text to show and
 *   the link to show it with. Clicks go to the source, unaltered: no redirect
 *   tracker, no UTM. That is the neutrality promise on the site's footer.
 * - eBay (docs/ebay-integration.md): prices and availability may not be
 *   cached past 24 hours and every display must link the listing. The guide
 *   pages show prices for 45 days as part of a statistic; an API row is the
 *   listing itself, so past 24 hours the price is withheld and the row says
 *   so. Sold prices are historical facts the site already publishes.
 * - Reddit (docs/reddit-integration.md): attribute "via r/handtools", never
 *   an author. No author field is persisted, so there is nothing to strip.
 */
import { SITE_URL } from '@/lib/site';
import { guidePathFor } from '@/lib/guide-paths';
import type { Cluster, Listing as GuideListing } from '@/lib/price-guide';
import type { Listing } from './schemas';

export type ListingRow = {
  id: string;
  source: string;
  source_name: string;
  source_kind: string;
  source_url: string;
  title_raw: string;
  price_cents: number | null;
  currency: string | null;
  condition_raw: string | null;
  images: string[] | null;
  location_display: string | null;
  status: string;
  posted_at: string | null;
  sold_at: string | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  canonical_type: string | null;
  canonical_brand: string | null;
  canonical_model: string | null;
  canonical_size: string | null;
  era_estimate: string | null;
};

const EBAY_PRICE_TTL_MS = 24 * 3600 * 1000;

/** pg returns `::text` timestamps as "2026-10-21 08:01:02.35+00"; agents want ISO 8601. */
export function iso(v: string | null | undefined): string | null {
  if (!v) return null;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? v : new Date(t).toISOString();
}

function attributionFor(source: string, sourceName: string, url: string): Listing['attribution'] {
  if (source === 'reddit') return { text: 'via r/handtools, found through Benchlot', link: url, link_required: true };
  return { text: `${sourceName}, via Benchlot`, link: url, link_required: true };
}

export function applySourcePolicy(r: ListingRow, guideUrl?: string | null): Listing {
  const status = (r.status === 'sold' ? 'sold' : r.status === 'active' ? 'active' : 'expired') as Listing['status'];
  const observed = status === 'sold' ? (r.sold_at ?? r.last_seen_at) : r.last_seen_at;
  let price: Listing['price'] = r.price_cents === null ? null : { amount: r.price_cents / 100, currency: r.currency || 'USD' };
  let priceStatus: Listing['price_status'] = price ? (status === 'sold' ? 'realized' : 'current') : 'unknown';
  let validUntil: string | null = null;

  if (r.source === 'ebay' && status !== 'sold' && price) {
    const seen = r.last_seen_at ? new Date(r.last_seen_at).getTime() : 0;
    validUntil = seen ? new Date(seen + EBAY_PRICE_TTL_MS).toISOString() : null;
    if (!seen || Date.now() > seen + EBAY_PRICE_TTL_MS) {
      price = null;
      priceStatus = 'stale';
    }
  }

  const path = guideUrl === undefined ? guidePathFor(r.canonical_type, r.canonical_brand) : null;
  return {
    id: String(r.id),
    title: r.title_raw,
    status,
    price,
    price_status: priceStatus,
    price_observed_at: iso(observed),
    price_valid_until: validUntil,
    condition: r.condition_raw,
    images: r.images ?? [],
    location: r.location_display,
    listed_at: iso(r.posted_at),
    sold_at: iso(r.sold_at),
    first_seen_at: iso(r.first_seen_at),
    last_seen_at: iso(r.last_seen_at),
    type: r.canonical_type,
    brand: r.canonical_brand,
    model: r.canonical_model,
    size: r.canonical_size,
    era: r.era_estimate,
    guide_url: guideUrl ?? (path ? `${SITE_URL}${path}` : null),
    source: { id: r.source, name: r.source_name, kind: r.source_kind, url: r.source_url },
    attribution: attributionFor(r.source, r.source_name, r.source_url),
  };
}

/** Comps from price-guide.ts (soldComps / activeListings) carry no canonical columns; the cluster supplies them. */
export function fromGuideListing(l: GuideListing, c: Cluster, guideUrl: string): Listing {
  return applySourcePolicy({
    id: l.id, source: l.source, source_name: l.source_name, source_kind: l.source_kind, source_url: l.source_url,
    title_raw: l.title_raw, price_cents: l.price_cents, currency: 'USD', condition_raw: l.condition_raw,
    images: l.images, location_display: l.location_display,
    status: l.sold_at ? 'sold' : 'active',
    posted_at: l.posted_at, sold_at: l.sold_at, first_seen_at: l.first_seen_at, last_seen_at: l.last_seen_at,
    canonical_type: c.canonical_type, canonical_brand: c.canonical_brand,
    canonical_model: c.canonical_model, canonical_size: c.canonical_size, era_estimate: null,
  }, guideUrl);
}
