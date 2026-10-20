import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import GuideView from '@/components/GuideView';
import { JsonLd, clusterJsonLd, breadcrumbJsonLd } from './jsonld';
import { SITE_URL } from './site';
import { ogImagePath } from './og-cards';
import {
  getCluster, soldComps, activeListings, relatedClusters, sizeClusters, modelClusters, typeClusters,
  activeAggregate, soldPricePoints, clusterFacts, brandNote, brandHubExists, redirectTarget, isIndexable,
  clusterPhrase, clusterPhraseSingular, clusterPath, money, centsToMoney, SOLD_MIN_FOR_REFERENCE,
  isMachineType, noteFitsPage, slug,
} from './price-guide';

/** Longest title that survives a Google result intact, before " · Benchlot". */
const TITLE_MAX = 70;

/**
 * URL segments: /guide/{type}/{brand}[/{size | model}[/type-N]]. `third` is a
 * size slug or a model slug (getCluster tells them apart); `fourth` is only
 * ever "type-N" beneath a model.
 */
export type GuideParams = { typeSlug: string; brandSlug: string; third?: string; fourth?: string };

function pathFor(p: GuideParams, grain: string, planeType: number | null) {
  const isModel = grain === 'model-fine' || grain === 'type-fine';
  return clusterPath({
    typeSlug: p.typeSlug, brandSlug: p.brandSlug,
    sizeSlug: isModel ? null : p.third ?? null,
    modelSlug: isModel ? p.third ?? null : null,
    planeType: grain === 'type-fine' ? planeType : null,
  });
}

export async function guideMetadata(p: GuideParams): Promise<Metadata> {
  const cluster = await getCluster(p.typeSlug, p.brandSlug, p.third, p.fourth);
  if (!cluster) return { title: 'Not found', robots: { index: false, follow: false } };

  const phrase = clusterPhrase(cluster);           // "Preston moulding planes"
  const singular = clusterPhraseSingular(cluster); // "Preston moulding plane"
  const sold = cluster.sold_count ?? 0;
  const median = money(cluster.sold_p50);
  const p25 = money(cluster.sold_p25);
  const p75 = money(cluster.sold_p75);
  const quotable = sold >= SOLD_MIN_FOR_REFERENCE && median;
  const agg = await activeAggregate(cluster);
  const n = agg.offer_count;
  const forSale = n > 0 ? `${n} for sale` : null;
  const low = centsToMoney(agg.low_cents);

  // The title has to do the work the snippet can't: say "used", say it is a
  // price, and show there is real evidence behind it. A searcher comparing
  // this against the maker's own site needs to see the difference in the tab.
  // The for-sale count rides on the end: the price lead is what gets the
  // page cited, the count is what a buyer scanning results is looking for.
  // It is the first thing dropped if the title would be clipped.
  const base = quotable
    ? `Used ${singular} prices: ${sold} sales, median ${median}`
    : `Used ${singular} prices and listings`;
  const title = forSale && `${base} · ${forSale}`.length <= TITLE_MAX ? `${base} · ${forSale}` : base;

  // Machines: Search Console shows these pages earn impressions and no clicks
  // because the searcher wants listings, so the description leads with supply.
  // Hand tools: the "what is mine worth" query keeps the price-led copy.
  const machine = isMachineType(cluster.canonical_type);
  const supply = n > 0
    ? `${n} used ${n === 1 ? singular : phrase} for sale now${low ? ` from ${low}` : ''}.`
    : null;
  const evidence = quotable
    ? `${sold} recorded sales, median ${median}, half between ${p25} and ${p75}.`
    : null;
  const description = machine && supply
    ? [supply, evidence, 'Free alert when another is listed.'].filter(Boolean).join(' ')
    : quotable
      ? `Used ${phrase} sell for a median of ${median}, with half of sales between ${p25} and ${p75}, from ${sold} recorded sales.${supply ? ` ${supply}` : ''} Free alert when one is listed.`
      : `Recorded sales and current listings for used ${phrase}, gathered from dealers, forum classifieds and marketplaces.${supply ? ` ${supply}` : ''} Free alert when one is listed.`;

  const path = pathFor(p, cluster.grain, cluster.plane_type_number);

  return {
    title: { absolute: `${title} · Benchlot` },
    description,
    alternates: { canonical: path },
    // Thin pages stay live for the for-sale list and the alert form but are
    // not offered to the index; the sitemap leaves them out for the same reason.
    ...(isIndexable(cluster) ? {} : { robots: { index: false, follow: true } }),
    // One card per page, drawn from the same numbers as the title, so a link
    // pasted into a forum or a chat unfurls with the median on it.
    openGraph: {
      title: `${title} · Benchlot`, description, url: path, type: 'website',
      images: [{ url: ogImagePath(path, cluster.last_built_at), width: 1200, height: 630, alt: `${singular}: used prices on Benchlot` }],
    },
    twitter: { card: 'summary_large_image' },
  };
}

export async function GuideRoute(p: GuideParams) {
  const cluster = await getCluster(p.typeSlug, p.brandSlug, p.third, p.fourth);
  if (!cluster) {
    // A merged brand spelling, a normalised size, or a raw "m-" model key
    // keeps its old URL alive with a 301.
    const to = await redirectTarget(p.typeSlug, p.brandSlug, p.third, p.fourth);
    if (to) permanentRedirect(to);
    notFound();
  }

  // Raw "m-no-4" keys resolve through the model branch of getCluster; make
  // sure they are served at the clean URL only.
  if (p.third?.startsWith('m-')) {
    permanentRedirect(pathFor({ ...p, third: p.third.slice(2) }, cluster.grain, cluster.plane_type_number));
  }

  const [sold, active, related, sizes, models, types, agg, points, facts, note, hub] = await Promise.all([
    soldComps(cluster),
    activeListings(cluster),
    relatedClusters(cluster),
    sizeClusters(cluster),
    modelClusters(cluster),
    typeClusters(cluster),
    activeAggregate(cluster),
    soldPricePoints(cluster),
    clusterFacts(cluster),
    brandNote(cluster.canonical_brand),
    brandHubExists(p.brandSlug),
  ]);

  const path = pathFor(p, cluster.grain, cluster.plane_type_number);
  const url = `${SITE_URL}${path}`;

  // Same trail the visible breadcrumb renders in GuideView.
  const crumbs = [{ name: 'Price guide', path: '/guide' }];
  if (cluster.canonical_type) {
    crumbs.push({ name: cluster.canonical_type, path: `/guide#${slug(cluster.canonical_type)}` });
  }
  if (cluster.grain !== 'coarse' && cluster.canonical_brand) {
    crumbs.push({ name: cluster.canonical_brand, path: clusterPath({ typeSlug: p.typeSlug, brandSlug: p.brandSlug, sizeSlug: null, modelSlug: null, planeType: null }) });
  }
  if (cluster.grain === 'type-fine' && cluster.canonical_model && p.third) {
    crumbs.push({ name: cluster.canonical_model, path: clusterPath({ typeSlug: p.typeSlug, brandSlug: p.brandSlug, sizeSlug: null, modelSlug: p.third, planeType: null }) });
  }
  crumbs.push({ name: clusterPhraseSingular(cluster) + ' prices', path });

  return (
    <>
      <JsonLd data={clusterJsonLd(cluster, agg, url)} />
      <JsonLd data={breadcrumbJsonLd(crumbs, SITE_URL)} />
      <GuideView
        cluster={cluster} sold={sold} active={active} activeCount={agg.offer_count}
        related={related} sizes={sizes}
        models={models} types={types} points={points} facts={facts}
        note={noteFitsPage(note, cluster.canonical_type)} hub={hub} path={path}
      />
    </>
  );
}
