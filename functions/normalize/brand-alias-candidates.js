#!/usr/bin/env node
/**
 * Brand alias candidates (read-only).
 *
 * Lists pairs of canonical_brand spellings that look like the same maker and
 * proposes which one survives, so a human can paste the accepted rows into
 * migration/schema/010_brand_aliases.sql. It never writes.
 *
 * Three buckets:
 *   punctuation  "E. A. Berg" / "E.A. Berg" — same slug, differ only in
 *                spacing/punctuation. These already share a cluster key (and
 *                a URL), so the merge changes no URL; it only stops the page
 *                queries missing the minority spelling. Proposed: the spelling
 *                with the most rows.
 *   suffix       "Sandusky" / "Sandusky Tool Co" — one is the other plus a
 *                corporate suffix (Co, & Co, Company, Inc, Ltd, Mfg, & Sons,
 *                Works, Tool Co, Tool Works, Tools). Proposed: the spelling
 *                with the most rows, which follows the vocabulary's existing
 *                convention ("Auburn Tool Co." -> "Auburn"). Two exceptions
 *                the user chose by name on 2026-09-22: Council Tool and Kelly
 *                Works keep the full name.
 *   human        one is a prefix of the other but the remainder is not a
 *                corporate suffix ("Ace" / "Ace Hardware", "Allen" /
 *                "Allen-Bradley"). Printed for review, never proposed.
 *
 * Usage: node --env-file=web/.env.local functions/normalize/brand-alias-candidates.js [--min-rows 3]
 */
process.removeAllListeners('warning');
const { Pool } = require('pg');
const DB = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!DB) { console.error('DATABASE_URL is not set'); process.exit(1); }
const argv = process.argv.slice(2);
const i = argv.indexOf('--min-rows');
const MIN_ROWS = i >= 0 ? Number(argv[i + 1]) : 3;

const SUFFIX = /^(and |& )?(co\.?|company|inc\.?|ltd\.?|limited|mfg\.?( co\.?)?|manufacturing( co\.?)?|manufacturers|sons?|bros\.?|brothers|works|tool( co\.?| works| company)?|tools|hardware( co\.?)?|cutlery( co\.?)?|saw( co\.?| works)?|plane( co\.?)?|edge tool( co\.?)?|and sons?|& sons?|and co\.?|& co\.?)$/i;

/** Full names the user chose to keep over the shorter, more common form. */
const KEEP_FULL = new Set(['Council Tool', 'Kelly Works']);

function slug(s) {
  return s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function words(s) { return slug(s).split('-').filter(Boolean); }

(async () => {
  const p = new Pool({ connectionString: DB, max: 1 });
  const { rows } = await p.query(`
    SELECT canonical_brand AS brand,
           count(*) FILTER (WHERE status = 'sold')::int AS sold,
           count(*)::int AS total,
           array_agg(DISTINCT canonical_type) FILTER (WHERE canonical_type <> 'Other') AS types
    FROM listings
    WHERE canonical_brand IS NOT NULL AND canonical_brand NOT IN ('Unknown', '')
    GROUP BY 1 HAVING count(*) >= $1`, [MIN_ROWS]);
  await p.end();

  const bySlug = new Map();
  for (const r of rows) { const k = slug(r.brand); bySlug.set(k, [...(bySlug.get(k) ?? []), r]); }

  const punct = [], suffix = [], human = [];
  const seen = new Set();

  // 1. punctuation-only: same slug, different string
  for (const [, group] of bySlug) {
    if (group.length < 2) continue;
    const pref = [...group].sort((a, b) => b.total - a.total || (/\b[A-Z]\.[A-Z]\./.test(b.brand) ? 1 : 0) - (/\b[A-Z]\.[A-Z]\./.test(a.brand) ? 1 : 0))[0];
    for (const r of group) if (r !== pref) punct.push({ alias: r.brand, canonical: pref.brand, a: r, c: pref });
  }

  // 2. prefix relationships between distinct slugs
  const slugs = [...bySlug.keys()];
  for (const s of slugs) {
    for (const t of slugs) {
      if (s === t || !t.startsWith(s + '-')) continue;
      const key = s + '|' + t; if (seen.has(key)) continue; seen.add(key);
      const rest = words(t).slice(words(s).length).join(' ');
      const short = bySlug.get(s).sort((a, b) => b.total - a.total)[0];
      const long = bySlug.get(t).sort((a, b) => b.total - a.total)[0];
      if (SUFFIX.test(rest)) {
        const keepLong = KEEP_FULL.has(long.brand) || long.total > short.total;
        suffix.push(keepLong
          ? { alias: short.brand, canonical: long.brand, a: short, c: long, rest }
          : { alias: long.brand, canonical: short.brand, a: long, c: short, rest });
      }
      else human.push({ short: short.brand, long: long.brand, a: short, c: long, rest });
    }
  }

  const fmt = (r) => `${r.brand} [${r.total}]`;
  console.log(`# PUNCTUATION (${punct.length}) — alias -> canonical`);
  for (const x of punct) console.log(`  ${fmt(x.a)}  ->  ${x.c.brand}`);
  console.log(`\n# CORPORATE SUFFIX (${suffix.length}) — alias -> canonical`);
  for (const x of suffix.sort((a, b) => (b.a.total + b.c.total) - (a.a.total + a.c.total))) console.log(`  ${fmt(x.a)}  ->  ${fmt(x.c)}`);
  console.log(`\n# NEEDS A HUMAN (${human.length}) — not proposed`);
  for (const x of human.sort((a, b) => (b.a.total + b.c.total) - (a.a.total + a.c.total))) console.log(`  ${fmt(x.a)}  ?  ${fmt(x.c)}   [+${x.rest}]`);
})().catch((e) => { console.error(e); process.exit(1); });
