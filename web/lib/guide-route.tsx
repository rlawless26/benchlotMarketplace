import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import GuideView from '@/components/GuideView';
import { JsonLd, clusterJsonLd } from './jsonld';
import { SITE_URL } from './site';
import {
  getCluster, soldComps, activeListings, relatedClusters, activeAggregate,
  clusterTitle, clusterPath, money, SOLD_MIN_FOR_REFERENCE,
} from './price-guide';

export async function guideMetadata(
  typeSlug: string, brandSlug: string, sizeSlug?: string
): Promise<Metadata> {
  const cluster = await getCluster(typeSlug, brandSlug, sizeSlug);
  if (!cluster) return { title: 'Not found', robots: { index: false, follow: false } };

  const name = clusterTitle(cluster);
  const sold = cluster.sold_count ?? 0;
  const median = money(cluster.sold_p50);

  const description =
    sold >= SOLD_MIN_FOR_REFERENCE && median
      ? `${name} sell for a median of ${median}, based on ${sold} recorded sales. See every comp and what's for sale now.`
      : `Recorded sales and current listings for used ${name}, gathered from dealers, forums and marketplaces.`;

  const path = clusterPath({
    typeSlug, brandSlug, sizeSlug: sizeSlug ?? null,
  });

  return {
    title: `${name} prices`,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${name} prices · Benchlot`, description, url: path, type: 'website' },
  };
}

export async function GuideRoute({
  typeSlug, brandSlug, sizeSlug,
}: { typeSlug: string; brandSlug: string; sizeSlug?: string }) {
  const cluster = await getCluster(typeSlug, brandSlug, sizeSlug);
  if (!cluster) notFound();

  const [sold, active, related, agg] = await Promise.all([
    soldComps(cluster),
    activeListings(cluster),
    relatedClusters(cluster),
    activeAggregate(cluster),
  ]);

  const url = `${SITE_URL}${clusterPath({
    typeSlug, brandSlug, sizeSlug: sizeSlug ?? null,
  })}`;

  return (
    <>
      <JsonLd data={clusterJsonLd(cluster, agg, url)} />
      <GuideView cluster={cluster} sold={sold} active={active} related={related} />
    </>
  );
}
