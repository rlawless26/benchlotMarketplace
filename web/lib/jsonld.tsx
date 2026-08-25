import { Cluster, ActiveAggregate, clusterTitle } from './price-guide';

/**
 * Product + AggregateOffer for a price-guide cluster.
 *
 * The offers block is built from a cluster-wide aggregate, never from the rows
 * the page happens to render -- markup that disagrees with the visible page is
 * worse than no markup. Omitted entirely when nothing is actually for sale.
 */
export function clusterJsonLd(
  cluster: Cluster,
  agg: ActiveAggregate,
  url: string
): Record<string, unknown> {
  const name = clusterTitle(cluster);

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    category: cluster.canonical_type,
    ...(cluster.canonical_brand
      ? { brand: { '@type': 'Brand', name: cluster.canonical_brand } }
      : {}),
    description: `Sold prices and current listings for used ${name}.`,
    url,
  };

  if (agg.offer_count > 0 && agg.low_cents !== null && agg.high_cents !== null) {
    jsonLd.offers = {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      offerCount: agg.offer_count,
      lowPrice: (agg.low_cents / 100).toFixed(2),
      highPrice: (agg.high_cents / 100).toFixed(2),
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/UsedCondition',
    };
  }

  return jsonLd;
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
