/**
 * Listing search for agents. Uses the `search_vector` the schema has carried
 * since 001 (title weighted A, canonical fields B) and the same eligibility
 * and freshness rules as the guide pages, so an agent and a person looking at
 * the same query see the same rows.
 */
import { sql } from '@/lib/db';
import { FRESH } from '@/lib/price-guide';
import { applySourcePolicy, type ListingRow } from './license';
import { resolveTypeName, resolveBrandName } from './resolve';
import type { ListingsQuery, Listing } from './schemas';

const COLUMNS = `
  l.id::text, l.source, s.name AS source_name, s.kind::text AS source_kind, l.source_url,
  l.title_raw, COALESCE(l.sold_price_cents, l.price_cents) AS price_cents, l.currency,
  l.condition_raw, l.images, l.location_display, l.status::text AS status,
  l.posted_at::text, l.sold_at::text, l.first_seen_at::text, l.last_seen_at::text,
  l.canonical_type, l.canonical_brand, l.canonical_model, l.canonical_size, l.era_estimate`;

const ELIGIBLE = `NOT bl_is_junk(l.title_raw, l.condition_raw) AND NOT bl_is_lot(l.title_raw)`;

type Cursor = { d: string; i: string } | { o: number };

function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString('base64url');
}
function decodeCursor(s: string | undefined): Cursor | null {
  if (!s) return null;
  try {
    const v = JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));
    if (v && typeof v.o === 'number') return { o: Math.max(0, Math.min(5000, v.o)) };
    if (v && typeof v.d === 'string' && typeof v.i === 'string') return { d: v.d, i: v.i };
  } catch { /* fall through */ }
  return null;
}

export type ListingsPage = {
  items: Listing[];
  next_cursor: string | null;
  resolved: { type: string | null; brand: string | null };
  unknown_type?: string;
};

export async function searchListings(q: ListingsQuery): Promise<ListingsPage> {
  const params: unknown[] = [];
  const where: string[] = [];
  const p = (v: unknown) => { params.push(v); return `$${params.length}`; };

  let type: string | null = null;
  let unknownType: string | undefined;
  if (q.type) {
    type = resolveTypeName(q.type);
    if (!type) unknownType = q.type;
    else where.push(`l.canonical_type = ${p(type)}`);
  }
  let brand: string | null = null;
  if (q.brand) {
    brand = (await resolveBrandName(q.brand)).name;
    where.push(`l.canonical_brand = ${p(brand)}`);
  }
  if (unknownType) return { items: [], next_cursor: null, resolved: { type: null, brand }, unknown_type: unknownType };

  where.push(q.status === 'sold' ? `l.status = 'sold'` : `l.status = 'active' AND ${FRESH}`);
  if (!q.include_lots) where.push(ELIGIBLE);
  if (q.source) where.push(`l.source = ${p(q.source)}`);
  if (q.min_price !== undefined) where.push(`COALESCE(l.sold_price_cents, l.price_cents) >= ${p(Math.round(q.min_price * 100))}`);
  if (q.max_price !== undefined) where.push(`COALESCE(l.sold_price_cents, l.price_cents) <= ${p(Math.round(q.max_price * 100))}`);
  where.push(`l.price_cents IS NOT NULL`);

  const dated = q.status === 'sold' ? `COALESCE(l.sold_at, l.posted_at, l.first_seen_at)` : `COALESCE(l.posted_at, l.first_seen_at)`;
  const cursor = decodeCursor(q.cursor);
  let order: string;
  let offset = 0;
  if (q.q) {
    const tsq = p(q.q);
    where.push(`l.search_vector @@ websearch_to_tsquery('english', ${tsq})`);
    order = `ts_rank_cd(l.search_vector, websearch_to_tsquery('english', ${tsq})) DESC, ${dated} DESC, l.id DESC`;
    if (cursor && 'o' in cursor) offset = cursor.o;
  } else {
    order = `${dated} DESC, l.id DESC`;
    if (cursor && 'd' in cursor) where.push(`(${dated}, l.id) < (${p(cursor.d)}::timestamptz, ${p(cursor.i)}::bigint)`);
  }

  const limit = q.limit;
  const rows = await sql<ListingRow & { dated_at: string }>(
    `SELECT ${COLUMNS}, ${dated}::text AS dated_at
       FROM listings l JOIN sources s ON s.id = l.source
      WHERE ${where.join(' AND ')}
      ORDER BY ${order}
      LIMIT ${limit + 1}${offset ? ` OFFSET ${offset}` : ''}`,
    params
  );

  const page = rows.slice(0, limit);
  const more = rows.length > limit;
  const last = page[page.length - 1];
  const next = !more || !last ? null
    : q.q ? encodeCursor({ o: offset + limit })
    : encodeCursor({ d: last.dated_at, i: last.id });

  return { items: page.map((r) => applySourcePolicy(r)), next_cursor: next, resolved: { type, brand } };
}

export async function getListing(id: string): Promise<Listing | null> {
  const rows = await sql<ListingRow>(
    `SELECT ${COLUMNS} FROM listings l JOIN sources s ON s.id = l.source WHERE l.id = $1::bigint AND l.status <> 'excluded_non_tool'`,
    [id]
  );
  return rows[0] ? applySourcePolicy(rows[0]) : null;
}
