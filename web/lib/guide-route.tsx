import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import GuideView from '@/components/GuideView';
import { JsonLd, clusterJsonLd } from './jsonld';
import { SITE_URL } from './site';
import {
  getCluster, soldComps, activeListings, relatedClusters, sizeClusters, modelClusters, typeClusters,
  activeAggregate, soldPricePoints, clusterFacts, brandNote, redirectTarget, isIndexable,
  clusterPhrase, clusterPhraseSingular, clusterPath, money, SOLD_MIN_FOR_REFERENCE,
} from './price-guide';

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

  // The title has to do the work the snippet can't: say "used", say it is a
  // price, and show there is real evidence behind it. A searcher comparing
  // this against the maker's own site needs to see the difference in the tab.
  const title = quotable
    ? `Used ${singular} prices: ${sold} sales, median ${median}`
    : `Used ${singular} prices and listings`;

  const description = quotable
    ? `Used ${phrase} sell for a median of ${median}, with half of sales between ${p25} and ${p75}, from ${sold} recorded sales. Every sale, what's for sale now, and a free alert when one is listed.`
    : `Recorded sales and current listings for used ${phrase}, gathered from dealers, forum classifieds and marketplaces. Free alert when one is listed.`;

  const path = pathFor(p, cluster.grain, cluster.plane_type_number);

  return {
    title: { absolute: `${title} · Benchlot` },
    description,
    alternates: { canonical: path },
    // Thin pages stay live for the for-sale list and the alert form but are
    // not offered to the index; the sitemap leaves them out for the same reason.
    ...(isIndexable(cluster) ? {} : { robots: { index: false, follow: true } }),
    openGraph: { title: `${title} · Benchlot`, description, url: path, type: 'website' },
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

  const [sold, active, related, sizes, models, types, agg, points, facts, note] = await Promise.all([
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
  ]);

  const url = `${SITE_URL}${pathFor(p, cluster.grain, cluster.plane_type_number)}`;

  return (
    <>
      <JsonLd data={clusterJsonLd(cluster, agg, url)} />
      <GuideView
        cluster={cluster} sold={sold} active={active} related={related} sizes={sizes}
        models={models} types={types} points={points} facts={facts} note={note}
      />
    </>
  );
}
