import {
  getCluster, activeAggregate, getBrandHub, brandActiveCount, isMachineType,
  clusterPhraseSingular, typePlural, typeLower, money, centsToMoney, isIndexable,
  SOLD_MIN_FOR_REFERENCE, HUB_MIN_TYPES, type Cluster, type BrandHub,
} from './price-guide';
import type { OgCard } from './og';

/**
 * What each guide page's share card says. Kept apart from the renderer so
 * the numbers can be unit-checked without rasterising anything, and apart
 * from the route so metadata can build the same URL the route serves.
 */

/** `/guide/bench-plane/stanley` -> `/guide/og/bench-plane/stanley?v=20261020`. */
export function ogImagePath(pagePath: string, builtAt: string | null | undefined): string {
  const rest = pagePath.replace(/^\/guide/, '');
  const stamp = builtAt ? new Date(builtAt).toISOString().slice(0, 10).replace(/-/g, '') : null;
  return `/guide/og${rest}${stamp ? `?v=${stamp}` : ''}`;
}

const num = (v: string | null | undefined) => (v === null || v === undefined ? null : parseFloat(v));

export function clusterCard(cluster: Cluster, offerCount: number, lowCents: number | null, pagePath: string): OgCard {
  const singular = clusterPhraseSingular(cluster);
  const sold = cluster.sold_count ?? 0;
  const median = money(cluster.sold_p50);
  const p25 = money(cluster.sold_p25);
  const p75 = money(cluster.sold_p75);
  const quotable = sold >= SOLD_MIN_FOR_REFERENCE && !!median;
  const low = centsToMoney(lowCents);
  const typeWord = cluster.canonical_type ? typePlural(cluster.canonical_type) : 'tools';
  const machine = isMachineType(cluster.canonical_type);

  const tiles: OgCard['tiles'] = [];
  if (quotable) {
    tiles.push({ value: sold.toLocaleString('en-US'), label: 'recorded sales' });
    if (p25 && p75) tiles.push({ value: `${p25}–${p75}`, label: 'middle half of sales' });
    if (offerCount > 0) tiles.push({ value: offerCount.toLocaleString('en-US'), label: low ? `for sale now, from ${low}` : 'for sale now' });
  } else {
    if (sold > 0) tiles.push({ value: sold.toLocaleString('en-US'), label: sold === 1 ? 'recorded sale' : 'recorded sales' });
    if (low) tiles.push({ value: low, label: 'lowest asking price' });
  }

  const p10 = num(cluster.sold_p10);
  const p90 = num(cluster.sold_p90);
  const band = quotable && p10 !== null && p90 !== null && p90 > p10
    ? {
        low: p10, p25: num(cluster.sold_p25) ?? p10, median: num(cluster.sold_p50) ?? p10, p75: num(cluster.sold_p75) ?? p90, high: p90,
        lowLabel: `${money(p10)} low`, highLabel: `${money(p90)} high`,
      }
    : null;

  // Machines: the searcher wants what is for sale, and the description already
  // leads with supply, so the card does too when there is any.
  const leadWithSupply = !quotable || (machine && offerCount >= 3);

  return {
    eyebrow: `Used ${typeWord}`,
    title: `${singular} prices`,
    figure: leadWithSupply && offerCount > 0 ? offerCount.toLocaleString('en-US') : quotable ? (median as string) : '—',
    figureLabel: leadWithSupply && offerCount > 0
      ? `for sale now${low ? `, from ${low}` : ''}`
      : quotable ? 'median sold price' : 'no median yet: fewer than 8 recorded sales',
    // Supply-led card: the median and the sales count ride as tiles; two is
    // all that fits beside a long figure label.
    tiles: leadWithSupply && offerCount > 0 && quotable
      ? [{ value: median as string, label: 'median sold price' }, { value: sold.toLocaleString('en-US'), label: 'recorded sales' }]
      : tiles,
    band,
    pathLabel: `benchlot.com${pagePath}`,
  };
}

export async function clusterOgCard(typeSlug: string, brandSlug: string, third?: string, fourth?: string, pagePath?: string): Promise<{ card: OgCard; cluster: Cluster } | null> {
  const cluster = await getCluster(typeSlug, brandSlug, third, fourth);
  if (!cluster) return null;
  const agg = await activeAggregate(cluster);
  return { card: clusterCard(cluster, agg.offer_count, agg.low_cents, pagePath ?? ''), cluster };
}

export function hubCard(hub: BrandHub, forSale: number, pagePath: string): OgCard {
  const b = hub.canonical_brand;
  const lead = hub.types[0];
  const soldTypes = hub.types.filter(isIndexable);
  const rows = soldTypes.slice(0, 4).map((t) => ({
    name: typePlural(t.canonical_type),
    value: money(t.sold_p50) ?? `${t.sold_count} sold`,
  }));
  const tiles: OgCard['tiles'] = [{ value: String(hub.types.length), label: 'tool types' }];
  if (forSale > 0) tiles.push({ value: forSale.toLocaleString('en-US'), label: 'for sale now' });
  if (lead && isIndexable(lead) && money(lead.sold_p50)) {
    tiles.push({ value: money(lead.sold_p50) as string, label: `median ${typeLower(typePlural(lead.canonical_type))}` });
  }
  return {
    eyebrow: 'Maker price guide',
    title: `What used ${b} tools sell for`,
    figure: hub.sold_total.toLocaleString('en-US'),
    figureLabel: 'recorded sales across the guide',
    tiles,
    rows,
    pathLabel: `benchlot.com${pagePath}`,
  };
}

export async function hubOgCard(brandSlug: string, pagePath: string): Promise<{ card: OgCard; hub: BrandHub } | null> {
  const hub = await getBrandHub(brandSlug);
  if (!hub || hub.types.length < HUB_MIN_TYPES) return null;
  const forSale = await brandActiveCount(hub.canonical_brand);
  return { card: hubCard(hub, forSale, pagePath), hub };
}
