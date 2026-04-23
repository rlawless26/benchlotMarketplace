# `externalListings` Firestore collection

Aggregated, normalized listings from external sources (dealers, forums, auctions). Populated by scheduled ingestion functions — never by end users. Every click on a Benchlot search result navigates back to `source_url`; Benchlot does not broker these transactions.

## Document ID

`` `${source}__${source_id}` `` — deterministic, enables idempotent upserts.

Double underscore is used so single underscores remain available inside either component without collision.

Example: `jimbode__stanley-no-5-type-11-jack-plane`

## Fields

### Provenance (always populated)
| Field | Type | Notes |
|---|---|---|
| `source` | string | Source identifier. First source: `"jimbode"`. |
| `source_id` | string | Source-native ID. For Shopify sources, the product `handle`. |
| `source_url` | string | Full canonical URL of the listing on the source site. |

### Raw listing fields (populated at ingestion)
| Field | Type | Notes |
|---|---|---|
| `title_raw` | string | Listing title as scraped, untouched. |
| `description_raw` | string &#124; null | Body text if the source exposes one. Shopify sources usually null. |
| `price_cents` | number &#124; null | Price in integer cents (USD assumed). Null if unpriced/sold/TBD. |
| `currency` | string | ISO 4217 code. Default `"USD"`. |
| `condition_raw` | string &#124; null | Free-text condition string as the source describes it. |
| `images` | string[] | Absolute image URLs. First image is the hero. |
| `posted_at` | Timestamp &#124; null | When the source created the listing. Best-effort. |
| `tags` | string[] | Source-native tags, lowercased, deduped. Useful for M2 normalization hints. |

### Baseline heuristics (populated at ingestion — superseded in M2)
| Field | Type | Notes |
|---|---|---|
| `heuristic_brand` | string | Keyword-match brand, or `"Unknown"`. Human-readable. |
| `heuristic_type` | string | Keyword-match tool type. One of ~12 buckets. See `heuristics.js`. |

M2's LLM normalizer reads these as seed hints but is expected to overwrite with higher-quality `canonical_*` values.

### Canonical fields (nullable in M1, populated in M2)
| Field | Type | Notes |
|---|---|---|
| `canonical_brand` | string &#124; null | Closed-vocabulary brand from a fixed list. |
| `canonical_type` | string &#124; null | Closed-vocabulary tool type. |
| `canonical_model` | string &#124; null | Collapsed model string. |
| `canonical_size` | string &#124; null | E.g. `"No. 5"`, `"1/2 inch"`. |
| `era_estimate` | string &#124; null | Best-effort era label. |

### Lifecycle (always populated)
| Field | Type | Notes |
|---|---|---|
| `status` | string | `"active"` while visible on source; `"expired"` when not seen in a subsequent scrape. |
| `scraped_at` | Timestamp | Most recent scrape that touched this row. |
| `first_seen_at` | Timestamp | Set once on first upsert, never updated. |
| `last_seen_at` | Timestamp | Updated on every scrape that sees this `source_id`. Drives expiry. |

## Expiry rule

After each ingestion run completes, any `status === "active"` document with matching `source` and `last_seen_at < this_run_start_time` is flipped to `status = "expired"`. Expired documents are not deleted — they preserve price history for M2+ analysis.

## Composite indexes

Added to `firestore.indexes.json`:
- `(source ASC, last_seen_at DESC)` — expiry sweep after each run
- `(status ASC, source ASC, scraped_at DESC)` — browse-recent by source
- `(status ASC, canonical_type ASC, scraped_at DESC)` — M2 search-by-type
- `(status ASC, canonical_brand ASC, scraped_at DESC)` — M2 search-by-brand

## Raw collection (`externalListingsRaw`)

The scraper preserves the untouched source payload so future normalizer versions can re-derive canonical fields without re-scraping. Ingestion writes the raw doc in the same Firestore batch as the main listing, so they can never drift out of sync.

**Doc ID:** identical to the main listing (`` `${source}__${source_id}` ``). Makes joins trivial.

**Fields:**

| Field | Type | Notes |
|---|---|---|
| `source` | string | Same as main listing. |
| `source_id` | string | Same as main listing. |
| `raw_format` | string | Discriminator. Current values: `"shopify_product"`, `"hyperkitten_item"`, `"sawmillcreek_thread"`. |
| `raw` | object | The full untouched source payload. Shape depends on `raw_format`. |
| `scraped_at` | Timestamp | When this raw payload was captured. |

**Lifecycle:** overwrite-on-scrape. Only the most recent raw is kept. Listings that drop out of the source (expired) keep their last raw. If we ever need through-time history (e.g. tracking when a seller changed a price), move that concern to Cloud Storage with timestamped object keys — don't balloon Firestore.

**Why separate from the main listing:** Firestore bills per-doc-read for bandwidth. Raw payloads are ~5–10 KB each; bundling them on the searchable listing would 10× every search-page payload. Search pages read only `externalListings`; re-normalization jobs read `externalListingsRaw`.

**Replay pattern:** a re-normalization script iterates `externalListingsRaw`, passes `raw` to the current normalizer, writes updated canonical fields back to `externalListings`. Unchanged since the last run means a no-op write. See §Future-proof ingestion in the M2 plan.

## Source identifier registry

| `source` value | Human name | `raw_format` | First indexed |
|---|---|---|---|
| `jimbode` | Jim Bode Tools (Value Guide) | `shopify_product` | M1 |
| `hyperkitten` | Hyperkitten Tool Company | `hyperkitten_item` | M4 |
| `sawmillcreek` | Sawmill Creek Classifieds | `sawmillcreek_thread` | M4 |

Future sources register here and must respect the `(source, source_id)` ID convention.

### Sawmill Creek notes
- `source_id` = XenForo thread ID (e.g. `317326`). Firestore docId: `sawmillcreek__317326`.
- `source_url` = `https://sawmillcreek.org/threads/{slug}.{thread_id}/` — real deep link; clickthrough lands directly on the thread.
- `posted_at` IS populated (XenForo exposes `<time datetime>` on thread-start elements). Unlike Hyperkitten, we have a real listing date.
- Two-phase scrape: new threads get a full detail fetch (OP body, images, price regex); already-ingested threads get a `last_seen_at` touch with no re-fetch. Raw payload is preserved from first fetch.
- Multi-item posts (e.g. "FS - lot of chisels $200 takes all") are ingested as a single listing.
- Title-based filters at ingestion skip WTB / WTT / ISO / "want to buy" / "looking for" threads as well as any thread whose title contains `SOLD`.
- `tags` carry `smc_author:<username>` for attribution/quality use.
- Classifieds is heterogeneous — includes power tools, lumber, magazines, software — that don't map cleanly onto `CANONICAL_TYPES` (hand-tool focused). Those listings land in `canonical_type: Other` for now; a follow-up vocabulary-expansion milestone addresses it.

### Hyperkitten notes
- `source_id` = Hyperkitten's item number (e.g. `C8270`, `P1234`, `MP42`). The prefix mirrors the `data-tool_type` category code.
- `source_url` is `https://www.hyperkitten.com/store/index.php#{item_number}`. Hyperkitten has no per-item detail pages — the fragment is a best-effort anchor; users land on the full store with the item number visible in the URL.
- `posted_at` is always `null` (Hyperkitten doesn't expose per-item timestamps). `first_seen_at` is the recency signal.
- `tags` include `hk_type:<code>` (the dealer's pre-classification) and `hk_new` (items carrying the visible NEW badge). The normalizer reads these as hints.
- Books (`data-tool_type="B"`) are skipped at ingestion — Benchlot surfaces tools, not reference literature.
