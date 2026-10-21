# Normalizer backfill runbook

How to pay down the unnormalized backlog with the Message Batches API, and how
to tell it worked. Context: `functions/normalize/run-postgres.js`,
`migration/schema/013_normalizer_batches.sql`, `scripts/coverage-report.js`.

## Why there is a backlog

Anthropic credits ran out on 2026-07-03. Every scrape since then has inserted
listings the nightly normalizer could not name. Measured 2026-10-21 (the
baseline is in `docs/data/coverage-before-2026-10-21.json`): 222,697 tool
listings, 49.2% typed, 33.7% reaching the price guide, **89,643 distinct
untyped titles**, 113k of the untyped rows on eBay. The nightly cron
deliberately excludes active eBay rows (`--durable-only`), so the backlog does
not drain itself.

Before 013 a title whose call failed was indistinguishable from one never
tried, and was re-billed every pass. `normalize_attempts` fixes that: three
failures and the title is left alone.

## Cost

Measured 2026-10-21 on this backlog (`--batch-submit` prints the same figures
from a `countTokens` sample before it sends anything):

| per title | Haiku 4.5 | Haiku 5.5 |
|---|---|---|
| standard, prompt cache warm | ≈ $0.0025 | ≈ $0.00024 |
| **batch** (what this runbook uses) | **≈ $0.0013**, up to ≈ $0.0049 if the cache misses | **≈ $0.00012** |
| 89.6k titles | **≈ $115**, worst case ≈ $400 | **≈ $11** |

Batches cache the system prompt best-effort, so the Haiku 4.5 worst case is
real money; `--max-cost` trims the request list at worst-case pricing, which
is why a $20 slice submits fewer titles than $20 ÷ $0.0013 would suggest.
`coverage-report.js` prints the remaining cost on every run
(`NORMALIZE_PER_TITLE_USD` overrides the per-title figure).

Haiku 5.5 is a model change under a published number. Checked 2026-10-21 with
`scripts/normalizer-model-compare.js --model claude-haiku-5-5 --n 50`: type
agreement 48/50 (no downgrades to Other), brand agreement 44/50, where four of
the six brand misses were spelling variants (`Moseley & Son` vs `Moseley`,
`Iron City` vs `Iron City Star`) that `brand_aliases` folds nightly, one was
`Unknown` where 4.5 had written null, and one was wrong (`Ax` for Plumb).
Re-run the comparison before switching models again.

## Steps

All commands run from the repo root. `ANTHROPIC_API_KEY` is in
`functions/.env` (the scripts load it). There is no local
`DATABASE_URL_UNPOOLED`; export the pooled one from `web/.env.local` with the
`-pooler` host suffix removed (`migration/apply.js` does this for you):

```sh
export DATABASE_URL="$(grep '^DATABASE_URL=' web/.env.local | cut -d= -f2- | tr -d '"' | sed 's/-pooler\./\./')"
```

1. **Apply the migration** (once).
   ```sh
   node migration/apply.js schema/013_normalizer_batches.sql
   ```
2. **Baseline, and decide the model.**
   ```sh
   node scripts/coverage-report.js --json > docs/data/coverage-before.json
   node functions/normalize/run-postgres.js --sample 20
   node scripts/normalizer-model-compare.js --model claude-haiku-5-5 --n 50
   ```
   `--sample` normalizes 20 real titles synchronously (and writes them) to
   prove the key, the prompt cache and the write path. The comparison asks the
   candidate model about titles the current model already answered and writes
   nothing; read the disagreement table by hand. Switch models by setting
   `BENCHLOT_NORMALIZER_MODEL` in the ingest workflow env and in `functions/.env`.
   If the candidate rejects the request shape, the error surfaces on the first
   call; fix `modelExtras()` in `normalizer.js` before going further.
3. **First slice: the titles Search Console cares about.** Power tools on
   eBay drew the impressions; spend there first.
   ```sh
   node functions/normalize/run-postgres.js --batch-submit \
     --match 'table saw|band ?saw|jointer|planer|drill press|dust collector|router|lathe|festool|sawstop|powermatic|grizzly|delta|jet ' \
     --max-cost 10
   ```
   The script prints the batch id(s). Nothing is written to `listings` yet.
4. **Next day, collect.**
   ```sh
   node functions/normalize/run-postgres.js --collect
   node scripts/coverage-report.js
   node -e "const{Pool}=require('./functions/node_modules/pg');new Pool({connectionString:process.env.DATABASE_URL}).query('SELECT * FROM rebuild_price_stats()').then(r=>{console.log(r.rows[0]);process.exit()})"
   ```
   `--collect` is safe to run any time; batches still in progress are skipped
   and reported. Results are written by title with `canonical_type IS NULL` as
   a guard, so a row normalized by the nightly sync pass in between is never
   overwritten.
5. **Repeat in larger slices** until the queue is empty: `--max-cost 20`
   without `--match`, on Mon/Wed/Fri nights after the eBay scrape so new rows
   ride along. Or from the Actions UI: run the **Ingest** workflow with
   `normalize_max_cost` set and `sources` blank; the workflow collects first,
   then submits.
6. **Finish.** `coverage-report.js --json > docs/data/coverage-after.json`,
   diff against the baseline, and note the numbers in `docs/growth-plan.md`.

## Reading the bookkeeping

```sql
SELECT id, status, request_count, estimated_cost_usd, actual_cost_usd, submitted_at, collected_at
  FROM normalize_batches ORDER BY submitted_at DESC;

SELECT status, count(*) FROM normalize_batch_items GROUP BY 1;

-- Titles the model keeps declining (worth a look at the prompt, not a resubmit):
SELECT normalize_last_error, count(*) FROM listings
 WHERE canonical_type IS NULL AND normalize_attempts >= 3 GROUP BY 1 ORDER BY 2 DESC;
```

## Rules

- **Never resubmit a batch whose items errored with `invalid_request`.** The
  request shape is wrong and will be wrong again; fix `buildRequestParams()`.
  `expired` items are safe to resubmit (they come back into the selection after
  two days and under three attempts).
- **Do not backfill from `heuristic_type`/`heuristic_brand`.** Tried
  2026-08-27 at 20–40% precision and reverted the same day. See
  `migration/backfill-normalization.js` and the README section that explains it.
- **Audit precision on a real sample before celebrating a coverage number.**
  Wrong types under a published price cost more trust than a missing page.
- The nightly cron caps itself at $5 per run and is durable-only. Draining the
  eBay backlog is a manual decision, taken in slices with `--max-cost`.
