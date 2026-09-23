import { notFound } from 'next/navigation';
import { listPublishableClusters } from '@/lib/price-guide';
import { GuideRoute, guideMetadata } from '@/lib/guide-route';

/**
 * Plane type-study pages: /guide/bench-plane/stanley/no-4/type-11. Only ever
 * "type-N" under a model segment; anything else is a 404 before any query.
 */
export const revalidate = 3600;
export const dynamicParams = true;

type Params = { params: Promise<{ type: string; brand: string; size: string; planeType: string }> };

const TYPE_RE = /^type-\d{1,2}$/;

export async function generateStaticParams() {
  const clusters = await listPublishableClusters({ indexableOnly: true, grains: ['type-fine'] });
  return clusters
    .filter((c) => c.modelSlug && c.planeType)
    .map((c) => ({ type: c.typeSlug, brand: c.brandSlug, size: c.modelSlug as string, planeType: `type-${c.planeType}` }));
}

export async function generateMetadata({ params }: Params) {
  const { type, brand, size, planeType } = await params;
  if (!TYPE_RE.test(planeType)) return { title: 'Not found', robots: { index: false, follow: false } };
  return guideMetadata({ typeSlug: type, brandSlug: brand, third: size, fourth: planeType });
}

export default async function Page({ params }: Params) {
  const { type, brand, size, planeType } = await params;
  if (!TYPE_RE.test(planeType)) notFound();
  return <GuideRoute typeSlug={type} brandSlug={brand} third={size} fourth={planeType} />;
}
