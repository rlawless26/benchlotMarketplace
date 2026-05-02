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

### Location (US-only v1)
| Field | Type | Notes |
|---|---|---|
| `location_state` | string &#124; null | ISO US state code (e.g. `"NY"`, `"MA"`). Null when source provides no per-listing or per-source location data. Used at read time to derive the region filter. |
| `location_display` | string &#124; null | Human-readable location for the card (e.g. `"Boston, MA"`, `"Lansing, NY"`). Falls back to `location_state` if null. |

Region (Northeast / Midwest / South / West / Other) is **derived at read time** from `location_state` via the Census Bureau 4-region split. Not stored. The `STATE_TO_REGION` map lives in two places (client `externalListingAdapter.js`, server `functions/alerts/predicates.js`) — same dual-bundle pattern as the source registry.

Per-source coverage:

| Source | location_state populated by | Coverage |
|---|---|---|
| jimbode | hardcoded `'NY'` (Elizaville) in `toRecord` | 100% |
| hyperkitten | hardcoded `'CT'` (Oxford) | 100% |
| vintagevials | hardcoded `'MA'` (Boston) | 100% |
| thebestthings | hardcoded `'VA'` (Herndon — buried in philosop.htm/order.htm, not the homepage) | 100% |
| rouillard | hardcoded `'CT'` (Plainfield — from Facebook page; site never lists it) | 100% |
| oldtools | TBD — operator state unverified | 0% (lands in Other) |
| fbmarketplace | `parseFbmLocation(item.location)` over Bright Data's "City, ST" | ~99% |
| ebay | `stateFromZip3(itemLocation.postalCode)` — eBay's Browse API exposes a 3-digit zip prefix per item, which uniquely identifies a US state via the USPS SCF mapping. Earlier "API doesn't expose location" claim was wrong | ~99% |
| sawmillcreek | `parseLocationTag(title \|\| body)` | 0% (verified against full corpus — bracket tagging isn't used in practice) |
| woodnet | same | 0% (same — community doesn't bracket-tag) |
| reddit | same | 0% (small corpus, no bracket tags so far) |

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
| `raw_format` | string | Discriminator. Current values: `"shopify_product"`, `"hyperkitten_item"`, `"sawmillcreek_thread"`, `"woodnet_thread"`, `"ebay_item_summary"`, `"thebestthings_item"`, `"reddit_post"`, `"woocommerce_product"`, `"oldtools_item"`. |
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
| `thebestthings` | The Best Things (Bob Kaune) | `thebestthings_item` | post-launch |
| `reddit` | Reddit (r/handtools, r/AntiqueToolBroker) | `reddit_post` | post-launch |
| `rouillard` | Michael Rouillard Antique Tools | `woocommerce_product` | post-launch |
| `vintagevials` | Vintage Vials | `woocommerce_product` | post-launch |
| `oldtools` | OldTools.com | `oldtools_item` | post-launch |

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

### Reddit notes
- `source_id` = Reddit post id (base36, e.g. `1abc23`). Firestore docId: `reddit__1abc23`. We use the bare id rather than the full `t3_xxxxxx` fullname so the docId stays consistent with our other source patterns; the fullname is recoverable as `t3_${source_id}` if a future consumer needs it.
- `source_url` = `https://www.reddit.com<permalink>` — full Reddit thread URL (e.g. `https://www.reddit.com/r/handtools/comments/1abc23/wts_stanley_no_5_jack_plane/`). Clickthrough lands on the thread itself.
- `posted_at` IS populated from `created_utc` on every post.
- Data source: Reddit App-Only OAuth (Application-Only Client Credentials grant, 24h token TTL, in-memory cache only). Endpoints: `/api/v1/access_token` for the token, `oauth.reddit.com/r/<sub>/new.json` for the list-sweep, `oauth.reddit.com/r/<sub>/comments/<id>.json` for per-thread detail. See `docs/reddit-integration.md`.
- **Subreddit buckets** (v1): `r/handtools` (title-keyword sale detection), `r/AntiqueToolBroker` (`link_flair_text === 'For Sale'` flair). The detection mode is per-bucket configuration.
- **Sale detection** (r/handtools): include if title matches `^\s*\[?\s*(WTS|FS|For Sale|Selling|FT)\s*\]?\b` or has inline `[WTS]`/`[FS]` etc. Skip first if title matches WTB/ISO/[SOLD]/[CLOSED] patterns. Skip stickied posts, NSFW posts, and posts where `selftext === '[removed]'` or `'[deleted]'`.
- **PII hygiene** (defensive posture, mirrors eBay's exemption): we do NOT persist `author`, `author_fullname`, `author_flair_text`, `author_premium`, `subreddit_subscribers`, or `subreddit_id`. Source attribution on the UI is "via r/handtools" — never an author handle. Reddit accounts are user-deletable and we have no way to track deletions cleanly, so the safer posture is to never store the username in the first place. The `run-reddit.js` runner asserts on this and fails the run if any user-identifiable field appears in the serialized listing or raw payload.
- **Image handling**: 4-case fallback in `extractImagesFromPost()` — gallery posts (`media_metadata` keyed by image id), single-image posts (`url_overridden_by_dest` if it points at i.redd.it / imgur), preview images (`preview.images[0].source.url`), or empty array for text-only posts. Critical: Reddit's `media_metadata.s.u` field returns HTML-encoded URLs (`&amp;` not `&`); the literal `&amp;` breaks the URL signature and 403s — must unescape.
- **Crossposts**: prefer `crosspost_parent_list[0]` for body / media metadata (the crosspost shell often has empty selftext and metadata).
- `tags` carry `r_subreddit:<sub>` (e.g. `r_subreddit:handtools`) and `r_flair:<slug>` when a flair is present (e.g. `r_flair:for_sale`). No author tags.
- Standard markExpired sweep at end of full runs. Reddit's `/new` caps at ~1000 posts (~150 days of activity on r/handtools), well past the bucket's age cutoff (30 days for r/handtools, 60 for r/AntiqueToolBroker). Within that window, anything not seen this run is genuinely gone.
- Cron slot: `35 3 * * *` UTC nightly, between Woodnet (03:30) and Hyperkitten (03:45).

### The Best Things notes
- `source_id` = TBT's product code (e.g. `BM26029`, `WP25022`). Prefix encodes the category: BM (British Metal/Infill), CH (Chisels), ME (Measuring), MI (Misc), MP (Molding Plane), SA (Saw), ST (Stanley), WP (Wooden Plane). Firestore docId: `thebestthings__BM26029`.
- `source_url` = `https://www.thebestthings.com/{category}.htm#{product_id}`. The site has no per-item URLs (single big HTML page per category), but the `#product_id` fragment shows up in the user's URL bar after clickthrough so they can Cmd-F for it. Same UX as Hyperkitten.
- `posted_at` IS NULL — TBT doesn't expose per-item timestamps. `first_seen_at` is the recency signal (same convention as Hyperkitten).
- Data source: 8 static HTML category pages at `thebestthings.com/{infill|chisels|measurin|misctool|molding|saws|stanley|woodplan}.htm`. Each page is parsed once per run; items are extracted from `<form action="/cgi/cart/additem.pl">` blocks via cheerio. Hidden inputs (`product_id`, `price`, `name`) supply the structured fields; surrounding text supplies `description_raw`. `condition_raw` is left null (the condition grade is embedded in the prose — "Fine-", "Good+", etc. — and the normalizer reads it from `description_raw`).
- `tags` carry `tbt_category:<slug>` (e.g. `tbt_category:infill`) and `tbt_id_prefix:<two-letter>` (e.g. `tbt_id_prefix:bm`). The id-prefix is a deterministic finer-grained category signal the normalizer can pick up.
- Newtools (their new-tool retail) and knives (cutlery) categories are intentionally excluded — Benchlot indexes used woodworking tools, not new retail or pocket knives.
- Sold items disappear from the HTML when Bob removes them. The standard `markExpired()` sweep flips unseen listings to `expired` — same model as Hyperkitten (catalog is finite, no rotation-window concern like eBay).
- ~382 active items as of 2026-04-26 across all 8 categories (infill 27, chisels 13, measuring 53, misc 144, molding 26, saws 30, stanley 28, wooden 61). Premium vintage skew: median price ~$200, top end well into four figures.
- Polite scrape: 500ms delay between category-page fetches. Total run is ~10 seconds.

### eBay notes
- `source_id` = eBay's `legacyItemId` (digits only, e.g. `127821750819`). Firestore docId: `ebay__127821750819`.
- `source_url` = `itemWebUrl` from the Browse API response — canonical `ebay.com/itm/{id}` link including eBay's own `hash` query params. Clickthrough lands on the live listing.
- `posted_at` IS populated from `itemCreationDate` on every listing (eBay's API always exposes it).
- Data source: Buy Browse API `/item_summary/search`, app-level OAuth (Client Credentials grant, 2h TTL, in-memory cache only). See `docs/ebay-integration.md`.
- **Multi-bucket design**: instead of one sweep the scraper walks 27 search buckets and merges into a single deduplicated stream. Buckets fall into three classes: (1) a single category sweep of `category_ids=13870` (Collectibles > Antiques > Tools > Carpentry, Woodworking) covering ~242k vintage hand-tool listings; (2) brand-targeted queries for high-end woodworking power-tool and precision brands — Festool, Woodpeckers, Laguna Tools, SawStop, Powermatic, Mafell, Bridge City Tool Works, Shaper Origin, Delta Rockwell, Oneway, Jet, Felder, Harvey, Grizzly, Incra, JessEm, Shopsmith, MiniMax; (3) brand-targeted queries for premium / mid-market hand-tool makers whose per-day volume under-represents them in the category-13870 newlyListed window — Lie-Nielsen, Veritas, Norris (vintage British infill), Hock Tools, Two Cherries, Clifton, Narex, WoodRiver. Each bucket sorted by `newlyListed` with per-bucket caps (see `SEARCH_BUCKETS` in ebay.js); scraper applies a global 6500-item cap on top. Brand names that collide with non-tool content get a `category_ids` filter (e.g. `woodpeckers&category_ids=631` to avoid Woody Woodpecker VHS tapes; `powermatic&category_ids=631` to avoid Tissot watches; `wood river&category_ids=631` to avoid serving trays and postcards) or a disambiguating suffix (e.g. `minimax woodworking`, `norris plane`, `two cherries chisel`). Query tuning is documented inline in ebay.js.
- **PII hygiene — Marketplace Account Deletion exemption commitment**: the `seller` object (username, feedbackScore, feedbackPercentage) is stripped from the raw payload before write. No seller / buyer identifiers land in `tags` or anywhere else on the document. Approved listing fields only: id, title, price, image URLs, category, listing URL, posted_at, condition.
- `description_raw` is always null — the Browse API item_summary endpoint doesn't expose descriptions, and per-item detail fetches would multiply API-call volume by orders of magnitude per run with limited quality gain. The LLM normalizer works from the title alone for this source.
- `tags` carry `ebay_leaf:<id>` (e.g. `ebay_leaf:13874`), `ebay_leaf_name:<name>` (e.g. `ebay_leaf_name:planes`), and `ebay_condition:<cond>` (e.g. `ebay_condition:used`). No seller tags. (Source bucket label is deliberately NOT carried on the listing — items surfaced from multiple buckets would need a list, and the bucket is an implementation detail of discovery, not a characteristic of the listing.)
- Scrape: default global cap 6500 items/run (2000 from category 13870 + ~3085 across 18 power-tool brand buckets + ~980 across 8 hand-tool brand buckets, with dedup). Full-scrape duration ~1.5 minutes, ~50 API calls. Unlike forum/dealer sources, this adapter does NOT run `markExpired` — an item missing from today's sample hasn't sold, it's just rotated off the newlyListed frontier of its bucket. A TTL-based expiry sweep (expire items unseen for >30 days) is a follow-up concern, intentionally deferred.

### Hyperkitten notes
- `source_id` = Hyperkitten's item number (e.g. `C8270`, `P1234`, `MP42`). The prefix mirrors the `data-tool_type` category code.
- `source_url` is `https://www.hyperkitten.com/store/index.php#{item_number}`. Hyperkitten has no per-item detail pages — the fragment is a best-effort anchor; users land on the full store with the item number visible in the URL.
- `posted_at` is always `null` (Hyperkitten doesn't expose per-item timestamps). `first_seen_at` is the recency signal.
- `tags` include `hk_type:<code>` (the dealer's pre-classification) and `hk_new` (items carrying the visible NEW badge). The normalizer reads these as hints.
- Books (`data-tool_type="B"`) are skipped at ingestion — Benchlot surfaces tools, not reference literature.

### Michael Rouillard notes
- `source_id` = WooCommerce product `slug` (e.g. `minty-hard-to-find-pair-of-left-right-leon-robbins-panel-raising-planes...`). Firestore docId: `rouillard__{slug}`.
- `source_url` = WC `permalink` (`https://michaelrouillardtools.com/product/{slug}/`). Direct deep link.
- `posted_at` is `null` — the WC Store API does not expose `date_created`. `first_seen_at` is the recency signal.
- Data source: WooCommerce Store API at `/wp-json/wc/store/v1/products?per_page=100&page=N&orderby=date&order=desc`. Public, no auth, returns rich JSON (name, slug, permalink, description HTML, prices in minor units, images, categories, stock flags). Catalog is small (~130 active items).
- Title decoding: the Store API emits HTML entities (`&#038;`, `&#8243;`, etc.) in `name` — `decodeEntities()` runs before heuristic matching and storage so `Brown & Sharpe` matches the brand list.
- Sold/unavailable filter: skip when `is_in_stock === false` or `is_purchasable === false`. Defensive title/tag scan for `sold`/`reserved` markers in case a product is left flagged in-stock manually.
- `tags` include the WooCommerce category slugs (`planes`, `wood-planes`, `modern-makers`, etc.) — the strongest categorization signal here, since native `tags` are typically empty. The M2 normalizer reads these as hints.
- `condition_raw` is left null — Rouillard describes condition in prose ("Minty", "Fine", etc.) and the normalizer reads it from `description_raw`.
- Standard `markExpired` sweep handles products that disappear (fully removed listings or stock flips not caught at fetch time).

### Vintage Vials notes
- Same WooCommerce Store API integration as Rouillard — see that section for shared mechanics (`is_in_stock`/`is_purchasable` filter, entity decoding, category-slugs-as-tags, null `posted_at`, `markExpired` sweep).
- `source_id` = WooCommerce product `slug`. Firestore docId: `vintagevials__{slug}`.
- `source_url` = WC `permalink` (`https://shop.vintagevials.com/product/{slug}/`).
- Catalog skews premium antique — strong specialty in measuring tools (rules, levels, inclinometers) plus planes / plow planes / marking gauges. ~170 active at first ingest. WC `x-wp-total` reports ~1,468 across the whole feed because Vintage Vials retains sold listings with `is_in_stock: false` rather than removing them; our `isAvailable` filter drops those at ingest, so the index only carries buyable inventory.
- Cron slot: `5 4 * * *` UTC nightly, between Jim Bode (04:00) and the alert matcher (04:15).

### OldTools.com notes
- `source_id` = item URL slug (e.g. `Keen-Kutter-Corner-Chisel-1-inch-2422`). Firestore docId: `oldtools__{slug}`. The trailing numeric id is stable but baked into the slug, so the slug alone is unique.
- `source_url` = `https://www.oldtools.com/item/{slug}`.
- `posted_at` is `null` — oldtools doesn't expose a per-item posted-at. Sitemap `lastmod` exists but reflects the page's last edit, not when the item was listed; `first_seen_at` remains the recency signal.
- Data source: a single sitemap (`/shop/sitemap/sitemap-items-1.xml`, ~200 URLs) walked once per run; each item page is fetched and parsed with cheerio, pulling Schema.org Product microdata (`itemprop="name"`, `itemprop="price"`, `itemprop="description"`, etc.).
- Two `itemprop="price"` values per page: the first is a hard-coded `0.00` placeholder, the second is the canonical Offer price. We take the max non-zero value.
- `itemprop="brand"` is the seller's storefront brand ("Falcon-Wood"), NOT the tool brand — ignored at ingest. The heuristic brand matcher works the title.
- Hero image preference: `og:image` (full-size) over `itemprop="image"` (thumbnail with `_th` suffix), since the latter is significantly worse on the card.
- `tags` left empty for now — the categories sitemap exists but mapping requires per-category page scraping (deferred).
- Cron slot: `45 2 * * *` UTC. Deliberately off-band from the 03:00–04:05 cluster — small, slow-moving catalog tolerates the staleness window, and the wider margin absorbs the ~5-minute per-item fetch loop comfortably.
