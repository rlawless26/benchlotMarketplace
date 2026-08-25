import { listPublishableClusters } from '@/lib/price-guide';
import { GuideRoute, guideMetadata } from '@/lib/guide-route';

export const revalidate = 3600;
export const dynamicParams = true;

type Params = { params: Promise<{ type: string; brand: string; size: string }> };

export async function generateStaticParams() {
  const clusters = await listPublishableClusters();
  return clusters
    .filter((c) => c.sizeSlug !== null)
    .map((c) => ({ type: c.typeSlug, brand: c.brandSlug, size: c.sizeSlug as string }));
}

export async function generateMetadata({ params }: Params) {
  const { type, brand, size } = await params;
  return guideMetadata(type, brand, size);
}

export default async function Page({ params }: Params) {
  const { type, brand, size } = await params;
  return <GuideRoute typeSlug={type} brandSlug={brand} sizeSlug={size} />;
}
