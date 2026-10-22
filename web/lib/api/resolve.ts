/**
 * Names in, canonical spellings and cluster keys out. Agents send whatever
 * the user said ("stanley no 4 smoothing plane"); the guide is keyed by the
 * normalizer's canonical vocabulary and slugs. slug() is idempotent on slugs,
 * so names and slugs both work.
 */
import { sql } from '@/lib/db';
import { slug } from '@/lib/guide-paths';
import { getCluster, resolveBrandAlias, type Cluster } from '@/lib/price-guide';
// The normalizer's closed vocabulary (74 types incl. Other). toolscan-prompt.js
// is the copy that already lives in web/; functions/normalize/vocabulary.js
// must stay identical to it.
import { TOOLSCAN_TYPES } from '@/lib/toolscan-prompt';

export const CANONICAL_TYPES: readonly string[] = TOOLSCAN_TYPES;
const TYPE_BY_SLUG = new Map(CANONICAL_TYPES.map((t) => [slug(t), t]));
const TYPE_SYNONYMS: Record<string, string> = {
  'smoothing-plane': 'bench-plane', 'jack-plane': 'bench-plane', 'jointer-plane': 'bench-plane',
  'fore-plane': 'bench-plane', 'smoother': 'bench-plane', 'handsaw': 'hand-saw', 'backsaw': 'back-saw',
  'plane': 'bench-plane', 'saw': 'hand-saw',
};

/** "bench plane" | "Bench Plane" | "bench-plane" | "smoothing plane" → "Bench Plane". */
export function resolveTypeName(input: string): string | null {
  const s = slug(input);
  const direct = TYPE_BY_SLUG.get(s);
  if (direct) return direct;
  const syn = TYPE_SYNONYMS[s];
  if (syn) return TYPE_BY_SLUG.get(syn) ?? null;
  // "planes" → "plane"; "chisels" → "chisel"
  const singular = s.replace(/s$/, '');
  return TYPE_BY_SLUG.get(singular) ?? null;
}

export function typeSuggestions(input: string, n = 5): string[] {
  const words = slug(input).split('-').filter((w) => w.length > 2);
  return CANONICAL_TYPES.filter((t) => t !== 'Other' && words.some((w) => slug(t).includes(w))).slice(0, n);
}

/** Canonical maker spelling for a name or slug, via brand_aliases then the stats table. */
export async function resolveBrandName(input: string): Promise<{ name: string; slug: string }> {
  const raw = slug(input);
  const aliased = await resolveBrandAlias(raw);
  const brandSlug = aliased ?? raw;
  const rows = await sql<{ canonical_brand: string }>(
    `SELECT canonical_brand FROM price_stats WHERE split_part(cluster_key, '::', 3) = $1 LIMIT 1`,
    [brandSlug]
  );
  return { name: rows[0]?.canonical_brand ?? input.trim(), slug: brandSlug };
}

export type ResolveInput = { type: string; brand: string; model?: string; size?: string; plane_type?: number };

export type Resolved = {
  cluster: Cluster | null;
  type: string | null;
  brand: { name: string; slug: string };
  typeSlug: string;
  third: string | null;
  fourth: string | null;
};

/**
 * Model wins over size (a model page is more specific). getCluster() tries the
 * model key then the size key for the same third segment, which also lets a
 * "No. 4" that was normalised as a size resolve.
 */
export async function resolveCluster(q: ResolveInput): Promise<Resolved> {
  const type = resolveTypeName(q.type);
  const typeSlug = type ? slug(type) : slug(q.type);
  const brand = await resolveBrandName(q.brand);
  let third: string | null = null;
  let fourth: string | null = null;
  if (q.model) {
    third = slug(q.model);
    if (q.plane_type) fourth = `type-${q.plane_type}`;
  } else if (q.size) {
    const rows = await sql<{ s: string }>(`SELECT bl_slug(bl_normalize_size($1)) AS s`, [q.size]);
    if (rows[0]?.s && rows[0].s !== '_') third = rows[0].s;
  }
  let cluster = type ? await getCluster(typeSlug, brand.slug, third ?? undefined, fourth ?? undefined) : null;
  // A model or size with no page of its own falls back to the maker's page,
  // and says so (the caller reads `grain`).
  if (!cluster && type && third) cluster = await getCluster(typeSlug, brand.slug);
  return { cluster, type, brand, typeSlug, third, fourth };
}
