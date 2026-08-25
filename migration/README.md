# Firestore → Postgres migration

One-time (but re-runnable) port of Benchlot's data off Firestore, per the
target architecture in `BENCHLOT-HANDOFF.md` §4.

## Why the data is split into export → load → validate

Reading the full corpus is ~350k Firestore document reads. Dumping to local
JSONL once means the Postgres side can be dropped and reloaded as many times as
it takes to get the schema right without re-paying for reads — and the JSONL
doubles as the artifact the validator diffs Postgres against.

## Running it

```bash
# 0. Get the connection string. If Neon was installed via the Vercel
#    Marketplace and linked to a project:
vercel env pull .env.local --yes
export DATABASE_URL="$(grep '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')"

cd migration
npm install

# 1. Firestore -> JSONL. Resumable: rerun after an interruption and it
#    continues from migration/data/<name>.cursor.
node export.js
node export.js listings          # or one collection at a time

# 2. JSONL -> Postgres. --init creates the schema and seeds sources first.
node load.js --init
node load.js --init --skip-raw   # see "Storage" below
node load.js --only=listings     # reload a single table

# 3. Prove it.
node validate.js
```

Two helpers sit alongside the main flow:

- `apply-indexes.js` — applies `002_indexes.sql` one statement at a time, so a
  quota failure names the exact index that ran out of room instead of aborting
  the whole file.
- `sizes.js` — per-table and total database size. Worth running after any bulk
  load; see "Storage" below.

`load.js` is idempotent for the big tables (`ON CONFLICT DO NOTHING` on the
natural keys), so a re-run tops up rather than duplicating. To start clean:
`DROP SCHEMA public CASCADE; CREATE SCHEMA public;` then `load.js --init`.

## Schema

| File | Contents |
|---|---|
| `schema/001_tables.sql` | Tables, enums, the generated `search_vector` |
| `schema/002_indexes.sql` | Every index — applied **after** the bulk load |
| `schema/003_seed_sources.sql` | Source registry, generated from `src/firebase/adapters/sources.js` |

Indexes are deliberately deferred: building a GIN index incrementally across a
167k-row import is far slower than building it once at the end.

The schema is fitted to the **live Firestore data** profiled 2026-08-25, not to
`functions/ingest/SCHEMA.md`. That doc is stale — real documents also carry
`plane_type_number`, `normalizer_model`, `normalized_at` and `excluded_reason`,
and two of the four composite indexes it claims exist are not deployed.

### What is deliberately NOT migrated

- **Legacy marketplace collections** (`users`, `offers`, `orders`,
  `conversations`, `carts`). Per the plan these are archived to cold storage and
  must not enter the new schema. The one exception: alert owners' email
  addresses are resolved out of `users` at export time, because the new schema
  keys alerts by email rather than by Firebase uid (there is no auth system).
- **Firebase Storage objects** (ToolScan images, training-corpus images).
  `training_examples.image_path` and `tool_scans.image_paths` still point at
  Firebase Storage; moving the objects is a separate job.
- **`priceSnapshots`** — the collection is empty (0 documents).

## Storage

`listings_raw` holds ~168k untouched source payloads at roughly 5–10 KB each.
That is the single largest object in the database and it is only needed to
re-derive canonical fields without re-scraping.

If the Postgres plan is storage-constrained, run `load.js --skip-raw`: search,
price stats and alert matching — the three workloads that motivated the move —
do not read it. The JSONL export on disk remains the durable copy, and
`load.js --only=listings_raw` can add it later.

## Validation

`validate.js` runs four independent checks plus four reports:

1. **Census** — counts vs the Firestore census taken before any writes.
2. **Parity** — counts vs the JSONL actually exported (catches a partial export
   that a census check alone would round past).
3. **Fidelity** — field-by-field diff on 200 randomly sampled listings across 28
   fields, including exact timestamp equality. Catches silent type coercion.
4. **Integrity** — FK orphans, NULL `search_vector`, unresolved alert emails.

Reports: search smoke test, per-source scrape freshness, canonical vocabulary
drift, table storage sizes.

Exit code is non-zero if any check fails.
