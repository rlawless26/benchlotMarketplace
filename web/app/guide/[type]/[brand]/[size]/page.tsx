import { listPublishableClusters } from '@/lib/price-guide';
import { GuideRoute, guideMetadata } from '@/lib/guide-route';

/**
 * Third segment: a SIZE ("10-inch") or a MODEL ("no-4", "d-8"). The folder is
 * still called [size] from when only sizes lived here; getCluster resolves
 * which one a segment is (models first). Plane-type pages sit one level down
 * in [planeType].
 */
export const revalidate = 3600;
export const dynamicParams = true;

type Params = { params: Promise<{ type: string; brand: string; size: string }> };

export async function generateStaticParams() {
  const clusters = await listPublishableClusters({ indexableOnly: true, grains: ['fine', 'model-fine'] });
  return clusters.map((c) => ({ type: c.typeSlug, brand: c.brandSlug, size: (c.modelSlug ?? c.sizeSlug) as string }));
}

export async function generateMetadata({ params }: Params) {
  const { type, brand, size } = await params;
  return guideMetadata({ typeSlug: type, brandSlug: brand, third: size });
}

export default async function Page({ params }: Params) {
  const { type, brand, size } = await params;
  return <GuideRoute typeSlug={type} brandSlug={brand} third={size} />;
}
