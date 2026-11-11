# Benchlot on Instagram

A content pipeline that turns Benchlot's own data (price guide, listings,
sold prices) into branded Instagram posts and publishes them on a schedule
with almost no input. Plain Node (CommonJS) like `functions/` and
`migration/`; Postgres for state; Playwright for rendering.

```
social/
  cli.js              generate · render · preview · show · list · approve · delete · migrate
  config.js           slots, rotation, thresholds, hashtags, publisher mode
  posts/              one module per post type (see "Adding a post type")
  render/
    render.js         HTML template -> 1080x1350 PNG (Playwright, brand fonts)
    templates/        one HTML file per post type
    preview.js        the contact sheet
  lib/
    db.js state.js    Postgres (social_batches, social_posts; schema/013)
    schedule.js       posting slots in ET
    text.js           money / plural / slug / guide-path helpers ported from web/lib
    images.js         listing photos -> data URIs
    hashtags.js
  content/            evergreen.yaml (pre-written posts; next iteration)
  out/<batch>/        rendered PNGs, their HTML, preview.html   (gitignored)
```

## One-time setup

1. `cd social && npm install && npx playwright install chromium`
2. Environment. Locally the CLI reads `web/.env.local` (then `social/.env.local`
   if present), so `DATABASE_URL` is already there. In CI the same names come
   from repo secrets.

   | variable | used by |
   |---|---|
   | `DATABASE_URL` | everything (pooled Neon URL) |
   | `DATABASE_URL_UNPOOLED` | `migrate` only (optional; falls back to pooled) |
   | `BLOB_READ_WRITE_TOKEN` (public store) | publisher: image upload *(next iteration)* |
   | `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID` | publisher: Graph API *(next iteration)* |
   | `RESEND_API_KEY` | publisher: failure email *(next iteration)* |

3. `node cli.js migrate` once, to create `social_batches` and `social_posts`
   (migration/schema/013_social.sql; idempotent).

## Monthly workflow

```
node cli.js generate                 # tomorrow + 30 days; renders and writes the contact sheet
open out/<batch>/preview.html        # one scroll through the month
node cli.js approve --batch <batch>  # the publisher only touches approved batches
```

`generate` names the batch after its first day (`2026-11-01`). Options:
`--start YYYY-MM-DD`, `--days N`, `--name NAME`, `--force` (replace a
pending batch), `--no-render`. It is deterministic for a given database, so
re-running it reproduces the same batch; `--force` on a pending batch
replaces it, and an approved batch is never touched.

What the generator guarantees:

* **Slots.** Tue, Thu, Sat and every other Sun, rotating 7:30am, 12:15pm and
  6:45pm ET (`config.schedule`). About 15 posts a month.
* **Rotation.** `config.rotation` is walked slot by slot; a type that cannot
  fill a slot is replaced by the next one that can.
* **Repeat guard.** A (tool type, maker) pair is not featured again within 60
  days of any post in any batch, and at most two posts per maker per batch.
  `social_posts` is the log; there is no separate file.
* **Just listed** posts are only scheduled into the first ten days after
  generation, because dealer stock turns in about a week (Hyperkitten's
  median is 7 days). The publisher re-checks the listing is still active
  before posting and skips it otherwise. To get more of them, generate
  shorter batches more often (`--days 14`).
* **Price guide of the week** needs 20+ recorded sales and at least five
  complete quarters with 3+ sales in the last three years, the last one
  recent, so the sparkline is real. Sixty clusters qualify today; the pool
  grows nightly.

Useful while reviewing: `node cli.js show --batch <batch>` prints the
schedule, captions and first comments as text; `node cli.js delete --batch
<batch>` drops a pending batch (and frees its tools for the repeat guard).

## Voice and copy rules

Captions are short and specific with one CTA (the guide page). No emoji,
no hype, nothing the guide page would not say. Numbers on a card are the
guide page's numbers (`price_stats`, built by `rebuild_price_stats()`), so a
post can never disagree with the page it links to. Hashtags live in
`first_comment`, never in the caption, and come from the curated set in
`config.hashtags`. Dealer photos are credited on the card and in the caption;
eBay photos are not used.

## Adding a post type

1. `posts/<name>.js` exporting `{ type, label, candidates(), prepare?(c), build(c) }`:
   * `candidates()` returns an ordered array of things to post about; each
     needs `canonical_type` and `canonical_brand` for the repeat guard.
   * `prepare(c)` (optional, async) returns the candidate or `null` to skip
     it, e.g. when its photo will not load.
   * `build(c)` returns `{ post_type, label, subject_key, subject_type,
     subject_brand, caption, first_comment, guide_path?, source_url?, notes[],
     cards: [{ template, data }] }`. One card is a single image; several
     cards are a carousel.
2. `render/templates/<name>.html` using `{{x}}` (escaped), `{{{x}}}` (raw),
   `{{#x}}…{{/x}}` / `{{^x}}…{{/x}}`. `{{{fontCss}}}`, `{{width}}` and
   `{{height}}` are always available. A `photo` field holding an `https://`
   URL is fetched and inlined as a data URI before rendering.
3. Register it in `posts/index.js` and add it to `config.rotation`.

Brand: Spruce `#1a3030`, Bone `#f2f0eb`, Honey `#d4aa60`, Dark Teal
`#0c1c1e`; Petrona 700 for display, Outfit 400/500 for everything else
(`web/assets/fonts`). Never pure white, never pure black, prices in Honey.

## Publisher

Next iteration, behind `config.publisher.mode`: a CSV export in Hopper HQ's
bulk-upload format (column mapping configurable) and a direct Instagram
Graph API publisher (public Blob upload, media container, carousel, status
poll, publish, 50/24h cap) run hourly from GitHub Actions, with a Resend
email on any failure. The approval toggle it honours already exists
(`approve` / `unapprove`).
