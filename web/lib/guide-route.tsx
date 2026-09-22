import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import GuideView from '@/components/GuideView';
import { JsonLd, clusterJsonLd } from './jsonld';
import { SITE_URL } from './site';
import {
  getCluster, soldComps, activeListings, relatedClusters, sizeClusters, activeAggregate,
  soldPricePoints, clusterFacts, brandNote, redirectTarget,
  clusterPhrase, clusterPhraseSingular, clusterPath, money, SOLD_MIN_FOR_REFERENCE,
} from './price-guide';

export async function guideMetadata(
  typeSlug: string, brandSlug: string, sizeSlug?: string
): Promise<Metadata> {
  const cluster = await getCluster(typeSlug, brandSlug, sizeSlug);
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

  const path = clusterPath({
    typeSlug, brandSlug, sizeSlug: sizeSlug ?? null,
  });

  return {
    title: { absolute: `${title} · Benchlot` },
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} · Benchlot`, description, url: path, type: 'website' },
  };
}

export async function GuideRoute({
  typeSlug, brandSlug, sizeSlug,
}: { typeSlug: string; brandSlug: string; sizeSlug?: string }) {
  const cluster = await getCluster(typeSlug, brandSlug, sizeSlug);
  if (!cluster) {
    // A merged brand spelling or a normalised size keeps its old URL alive.
    const to = await redirectTarget(typeSlug, brandSlug, sizeSlug);
    if (to) permanentRedirect(to);
    notFound();
  }

  const [sold, active, related, sizes, agg, points, facts, note] = await Promise.all([
    soldComps(cluster),
    activeListings(cluster),
    relatedClusters(cluster),
    sizeClusters(cluster),
    activeAggregate(cluster),
    soldPricePoints(cluster),
    clusterFacts(cluster),
    brandNote(cluster.canonical_brand),
  ]);

  const url = `${SITE_URL}${clusterPath({
    typeSlug, brandSlug, sizeSlug: sizeSlug ?? null,
  })}`;

  return (
    <>
      <JsonLd data={clusterJsonLd(cluster, agg, url)} />
      <GuideView
        cluster={cluster} sold={sold} active={active} related={related} sizes={sizes}
        points={points} facts={facts} note={note}
      />
    </>
  );
}
