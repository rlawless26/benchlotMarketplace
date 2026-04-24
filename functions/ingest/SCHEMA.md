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
| `raw_format` | string | Discriminator. Current values: `"shopify_product"`, `"hyperkitten_item"`, `"sawmillcreek_thread"`, `"woodnet_thread"`, `"ebay_item_summary"`. |
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
| `woodnet` | Woodnet Tool Swap N' Sell | `woodnet_thread` | M4 |
| `ebay` | eBay Carpentry & Woodworking (category 13870) | `ebay_item_summary` | M5 |

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

### Woodnet notes
- `source_id` = MyBB thread ID (e.g. `7380609`). Firestore docId: `woodnet__7380609`.
- `source_url` = `https://forums.woodnet.net/showthread.php?tid={thread_id}` — direct link; clickthrough lands on the thread.
- `posted_at` IS populated. Source is `span.thread_start_datetime span[title]` (absolute "MM-DD-YYYY, HH:MM AM/PM" even when the visible text is relative "50 minutes ago"). Timestamps are stored as UTC — the forum renders US Eastern but a 4-5 hour skew doesn't affect date-granularity filters.
- Same two-phase scrape pattern as Sawmill Creek: new threads get a full detail fetch; already-ingested threads get a `last_seen_at` touch with no re-fetch.
- MyBB quirk: the display "#N" label next to the first post is offset (often shows `#2` even for a zero-reply OP). The scraper does NOT rely on the label — it takes the FIRST `.post.classic` div on the thread page as the OP, which is always chronologically correct.
- Title-based filters skip WTB / WTT / ISO / "want to buy" / "looking for" threads, FREE giveaways, and any thread whose title contains `SOLD`.
- Inventory skews power-tool heavy (Festool, Delta, Powermatic, Woodpecker, Atlas lathes, Shaper Origin) — complementary to Sawmill Creek's hand-tool lean. Power-tool threads fall to `canonical_type: Other` until the hand-tool-only vocabulary is expanded.
- Price extraction is simple regex (first `$XXX` in title or body). Limitation: OPs that reference comparison prices ("recent eBay sales $103-$375") can confuse the regex when the actual asking price appears later. The normalizer may correct via description context.
- `tags` carry `wn_author:<username>` for attribution.

### eBay notes
- `source_id` = eBay's `legacyItemId` (digits only, e.g. `127821750819`). Firestore docId: `ebay__127821750819`.
- `source_url` = `itemWebUrl` from the Browse API response — canonical `ebay.com/itm/{id}` link including eBay's own `hash` query params. Clickthrough lands on the live listing.
- `posted_at` IS populated from `itemCreationDate` on every listing (eBay's API always exposes it).
- Data source: Buy Browse API `/item_summary/search` endpoint, category_ids=`13870` (Collectibles > Antiques > Tools > Carpentry, Woodworking), `sort=newlyListed`, app-level OAuth (Client Credentials grant, 2h TTL, in-memory cache only). See `docs/ebay-integration.md`.
- **PII hygiene — Marketplace Account Deletion exemption commitment**: the `seller` object (username, feedbackScore, feedbackPercentage) is stripped from the raw payload before write. No seller / buyer identifiers land in `tags` or anywhere else on the document. Approved listing fields only: id, title, price, image URLs, category, listing URL, posted_at, condition.
- `description_raw` is always null — the Browse API item_summary endpoint doesn't expose descriptions, and per-item detail fetches would multiply API-call volume by ~2000x per run with limited quality gain. The LLM normalizer works from the title alone for this source.
- `tags` carry `ebay_leaf:<id>` (e.g. `ebay_leaf:13874`), `ebay_leaf_name:<name>` (e.g. `ebay_leaf_name:planes`), and `ebay_condition:<cond>` (e.g. `ebay_condition:used`). No seller tags.
- Scrape cap: 2000 items per run out of ~242k in-category. We sample the freshest by `sort=newlyListed`, rotating the window nightly. Unlike forum/dealer sources, this adapter does NOT run `markExpired` — an item missing from today's 2000-item window hasn't sold, it's just rotated off the newlyListed frontier. A TTL-based expiry sweep (expire items unseen for >30 days) is a follow-up concern, intentionally deferred.

### Hyperkitten notes
- `source_id` = Hyperkitten's item number (e.g. `C8270`, `P1234`, `MP42`). The prefix mirrors the `data-tool_type` category code.
- `source_url` is `https://www.hyperkitten.com/store/index.php#{item_number}`. Hyperkitten has no per-item detail pages — the fragment is a best-effort anchor; users land on the full store with the item number visible in the URL.
- `posted_at` is always `null` (Hyperkitten doesn't expose per-item timestamps). `first_seen_at` is the recency signal.
- `tags` include `hk_type:<code>` (the dealer's pre-classification) and `hk_new` (items carrying the visible NEW badge). The normalizer reads these as hints.
- Books (`data-tool_type="B"`) are skipped at ingestion — Benchlot surfaces tools, not reference literature.
