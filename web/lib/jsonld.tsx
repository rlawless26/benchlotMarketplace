import { Cluster, ActiveAggregate, clusterTitle, clusterPhrase } from './price-guide';

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
): Record<string, unknown> | null {
  // Google requires a Product to carry offers, review, or aggregateRating;
  // a sold-only cluster has none of the three, and emitting a bare Product
  // is what the 2026-08-26 "Product snippets issues" notice flagged. No
  // markup is the honest state for a page about things no longer for sale.
  if (!(agg.offer_count > 0 && agg.low_cents !== null && agg.high_cents !== null)) {
    return null;
  }

  const name = clusterTitle(cluster);

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    category: cluster.canonical_type,
    ...(cluster.canonical_brand
      ? { brand: { '@type': 'Brand', name: cluster.canonical_brand } }
      : {}),
    description: `Recorded sale prices and current listings for used ${clusterPhrase(cluster)}.`,
    url,
  };

  jsonLd.offers = {
    '@type': 'AggregateOffer',
    priceCurrency: 'USD',
    offerCount: agg.offer_count,
    lowPrice: (agg.low_cents / 100).toFixed(2),
    highPrice: (agg.high_cents / 100).toFixed(2),
    availability: 'https://schema.org/InStock',
    itemCondition: 'https://schema.org/UsedCondition',
  };

  return jsonLd;
}

/**
 * BreadcrumbList mirroring the visible breadcrumb. Cheap, honest, and the one
 * structured-data type that helps every page: it tells a search engine and an
 * AI crawler where this page sits in the guide without a second fetch.
 */
export function breadcrumbJsonLd(
  items: { name: string; path: string }[],
  siteUrl: string
): Record<string, unknown> | null {
  if (items.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${siteUrl}${it.path}`,
    })),
  };
}

/**
 * The page itself, with the date the numbers on it were last rebuilt. The
 * Product node cannot carry a date (schema.org gives Product none), and the
 * visible "Updated 2026-10-13" line is prose; this is the machine-readable
 * version of the same fact for crawlers that weigh freshness.
 */
export function webPageJsonLd(opts: {
  url: string; name: string; description: string; dateModified: string | null; siteUrl: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    url: opts.url,
    name: opts.name,
    description: opts.description,
    ...(opts.dateModified ? { dateModified: new Date(opts.dateModified).toISOString() } : {}),
    isPartOf: { '@id': `${opts.siteUrl}/#website` },
    publisher: { '@id': `${opts.siteUrl}/#organization` },
  };
}

/**
 * The guide as a dataset: what it measures, how big it is, when it was last
 * rebuilt, and an ItemList of the tool types it covers. Dataset Search and
 * AI crawlers read this; nothing on the page changes.
 */
export function guideDatasetJsonLd(opts: {
  siteUrl: string; soldTotal: number; clusterCount: number; dateModified: string | null;
  types: { name: string; path: string; sold: number }[];
}): Record<string, unknown> {
  const base = `${opts.siteUrl}/guide`;
  // pg hands timestamptz columns back as Date objects whatever the row type
  // says, so normalise before slicing.
  const modified = opts.dateModified ? new Date(opts.dateModified).toISOString() : null;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Dataset',
        '@id': `${base}#dataset`,
        name: 'Benchlot used woodworking tool price guide',
        description: `Median sold prices for used woodworking hand tools and machines, by maker, tool type, size and model, from ${opts.soldTotal.toLocaleString('en-US')} recorded sales across ${opts.clusterCount.toLocaleString('en-US')} tools. Built nightly from public listings at tool dealers, forum classifieds, auction houses and marketplaces; sets, lots and parts are excluded; a median is quoted only from eight or more sales.`,
        url: base,
        license: `${opts.siteUrl}/terms`,
        isAccessibleForFree: true,
        creator: { '@id': `${opts.siteUrl}/#organization` },
        keywords: ['used woodworking tools', 'hand tool prices', 'sold prices', 'price guide', 'vintage tools'],
        temporalCoverage: `2024/${(modified ?? new Date().toISOString()).slice(0, 10)}`,
        spatialCoverage: 'United States',
        ...(modified ? { dateModified: modified } : {}),
        variableMeasured: ['median sold price', 'interquartile range of sold prices', 'recorded sales', 'listings for sale'],
        measurementTechnique: 'Recorded sale prices from public listings, de-duplicated and filtered for sets, lots and parts; median and quartiles per maker, tool type, size and model.',
        distribution: { '@type': 'DataDownload', encodingFormat: 'text/html', contentUrl: base },
      },
      {
        '@type': 'ItemList',
        '@id': `${base}#types`,
        name: 'Tool types in the price guide',
        numberOfItems: opts.types.length,
        itemListElement: opts.types.map((t, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: t.name,
          url: `${opts.siteUrl}${t.path}`,
        })),
      },
    ],
  };
}

/** Site-level markup for the homepage only: who publishes this, and how to search it. */
export function siteJsonLd(siteUrl: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'Benchlot',
        url: siteUrl,
        logo: `${siteUrl}/android-chrome-512x512.png`,
        description: 'Recorded sale prices and current listings for used woodworking tools, gathered from dealers, forum classifieds, auctions and marketplaces.',
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: 'Benchlot',
        publisher: { '@id': `${siteUrl}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/search?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };
}

export function JsonLd({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
