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
  firstYear: number | null;
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
        ...(opts.firstYear ? { temporalCoverage: `${opts.firstYear}/${(modified ?? new Date().toISOString()).slice(0, 10)}` } : {}),
        spatialCoverage: 'United States',
        ...(modified ? { dateModified: modified } : {}),
        variableMeasured: ['median sold price', 'interquartile range of sold prices', 'recorded sales', 'listings for sale'],
        measurementTechnique: 'Recorded sale prices from public listings, de-duplicated and filtered for sets, lots and parts; median and quartiles per maker, tool type, size and model.',
        distribution: [
          { '@type': 'DataDownload', encodingFormat: 'text/html', contentUrl: base },
          // The same figures as JSON, with confidence/freshness/coverage fields
          // (lib/api). openapi.json is the entry point; /developers explains it.
          { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${opts.siteUrl}/api/v1/openapi.json` },
        ],
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

/**
 * One page's figures as a Dataset: the median, the middle half, the sale
 * count and the confidence tier, with the API call that returns the same
 * numbers as its distribution. Emitted only on pages with enough sales to
 * publish a median (the caller checks), so the markup never claims a figure
 * the page does not show. schema.org has no "confidence" property; it rides
 * as a measured variable with its definition in the description.
 */
export function clusterDatasetJsonLd(opts: {
  siteUrl: string;
  url: string;
  phrase: string;
  cluster: {
    canonical_type: string | null; canonical_brand: string | null; canonical_model: string | null;
    canonical_size: string | null; plane_type_number: number | null;
    sold_count: number | null; sold_p25: string | null; sold_p50: string | null; sold_p75: string | null;
    last_built_at: string | null;
  };
  facts: { firstAt: string | null; lastAt: string | null; recent: number };
  confidence: string;
}): Record<string, unknown> {
  const { siteUrl, url, phrase, cluster: c, facts, confidence } = opts;
  const n = (v: string | null) => (v === null ? null : Number(v));
  const day = (v: string | null) => (v ? new Date(v).toISOString().slice(0, 10) : null);
  const q = new URLSearchParams({ type: c.canonical_type ?? '', brand: c.canonical_brand ?? '' });
  if (c.canonical_model) q.set('model', c.canonical_model);
  else if (c.canonical_size) q.set('size', c.canonical_size);
  if (c.canonical_model && c.plane_type_number) q.set('plane_type', String(c.plane_type_number));
  const first = day(facts.firstAt);
  const last = day(facts.lastAt);
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    '@id': `${url}#dataset`,
    name: `${phrase} recorded sale prices`,
    description: `Median and middle-half sold prices for used ${phrase}, from ${c.sold_count ?? 0} recorded sales at tool dealers, forum classifieds and marketplaces, de-duplicated across sources with sets, lots and parts excluded.`,
    url,
    isPartOf: { '@id': `${siteUrl}/guide#dataset` },
    creator: { '@id': `${siteUrl}/#organization` },
    license: `${siteUrl}/terms`,
    isAccessibleForFree: true,
    ...(c.last_built_at ? { dateModified: new Date(c.last_built_at).toISOString() } : {}),
    ...(first && last ? { temporalCoverage: `${first}/${last}` } : {}),
    measurementTechnique: 'Recorded sale prices from public listings, de-duplicated and filtered for sets, lots and parts; median and quartiles per maker, tool type, size and model.',
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'median sold price', value: n(c.sold_p50), unitText: 'USD' },
      { '@type': 'PropertyValue', name: 'interquartile range of sold prices', minValue: n(c.sold_p25), maxValue: n(c.sold_p75), unitText: 'USD' },
      { '@type': 'PropertyValue', name: 'recorded sales', value: c.sold_count ?? 0 },
      { '@type': 'PropertyValue', name: 'sales in the last twelve months', value: facts.recent },
      { '@type': 'PropertyValue', name: 'confidence', value: confidence, description: 'high: 20 or more recorded sales; medium: 8 to 19; low: fewer than 8 (no median published)' },
    ],
    distribution: { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${siteUrl}/api/v1/prices?${q.toString()}` },
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
