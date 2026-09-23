import { listPublishableClusters } from '@/lib/price-guide';
import { GuideRoute, guideMetadata } from '@/lib/guide-route';

// Sold comps change once a night at most; hourly revalidation is ample and keeps
// these pages served from cache for crawlers.
export const revalidate = 3600;
export const dynamicParams = true;

type Params = { params: Promise<{ type: string; brand: string }> };

// Prerender the pages worth indexing; thin (noindex) pages render on demand.
export async function generateStaticParams() {
  const clusters = await listPublishableClusters({ indexableOnly: true, grains: ['coarse'] });
  return clusters.map((c) => ({ type: c.typeSlug, brand: c.brandSlug }));
}

export async function generateMetadata({ params }: Params) {
  const { type, brand } = await params;
  return guideMetadata({ typeSlug: type, brandSlug: brand });
}

export default async function Page({ params }: Params) {
  const { type, brand } = await params;
  return <GuideRoute typeSlug={type} brandSlug={brand} />;
}
