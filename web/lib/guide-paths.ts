/**
 * URL helpers for the price guide with NO dependencies, so client components
 * (the scan result card) can build guide links without pulling in lib/db
 * through price-guide.ts. price-guide.ts re-exports these; import from there
 * on the server.
 */

/** Mirror of slug() in functions/pricestats/cluster.js. Keep in sync. */
export function slug(s: string | null | undefined): string {
  if (!s) return '_';
  const out = String(s)
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return out || '_';
}

export function clusterPath(c: {
  typeSlug: string; brandSlug: string; sizeSlug: string | null;
  modelSlug?: string | null; planeType?: number | null;
}) {
  const third = c.modelSlug ?? c.sizeSlug;
  if (!third) return `/guide/${c.typeSlug}/${c.brandSlug}`;
  const base = `/guide/${c.typeSlug}/${c.brandSlug}/${third}`;
  return c.modelSlug && c.planeType ? `${base}/type-${c.planeType}` : base;
}

export const brandHubPath = (brandSlug: string) => `/guide/brand/${brandSlug}`;

/** /guide/{type}/{brand} from canonical names; null when either is missing. */
export function guidePathFor(type: string | null | undefined, brand: string | null | undefined): string | null {
  if (!type || !brand || brand === 'Unknown' || type === 'Other') return null;
  return clusterPath({ typeSlug: slug(type), brandSlug: slug(brand), sizeSlug: null });
}
