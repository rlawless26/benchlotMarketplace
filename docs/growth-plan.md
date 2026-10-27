# Benchlot growth plan — 2026-10-20

Phase 2 of the growth work. Built on `docs/site-audit.md` (read that first; this
file does not repeat the evidence). Goals, in order: organic traffic, sharing by
woodworkers, email capture. Revenue is not a goal.

Correction to the audit: `email_prompt_dismissed`, `category_gate_email_captured`
and `toolscan_save_alert_clicked` **are** wired; they are at zero because nobody
has dismissed a prompt, captured through the category gate, or clicked that
link. They are not dead code. The one real drop is `alert_submitted` (1) against
`alert_requested` (3).

---

## 0. Decisions that are yours (with the default I will build unless you say otherwise)

| # | Decision | Default I will take | Why |
|---|---|---|---|
| D1 | **Second email offer** | A weekly *"Sold this week"* digest: ~10 notable recorded sales site-wide plus the biggest median moves, sent Sunday morning, double opt-in, one-click unsubscribe. Not per-type (too little volume per type to fill an email). | The visible query intent is "what is it worth", not "sell me one". A digest answers that every week and gives a reason to return. Resend and the alerts email code already exist. |
| D2 | **What goes behind email capture** | Nothing. Every number and listing stays public. Email is only ever offered as a convenience (alert, digest, copy of a scan). | The scan gate was removed because it cut the funnel; ChatGPT and Google cite what they can read. Gating would trade the growth goal for the secondary one. |
| D3 | **Which tool categories to prioritise** | Content and hub work: hand planes (bench, block, combination), hand saws, chisels, vises/axes — in that order. Machines (Delta, Festool, Craftsman, Powermatic, Grizzly) get title/description work only. | Hand-tool pages take almost all clicks and the "value" queries; machine pages earn impressions for shopping intent Benchlot cannot satisfy with 0–3 listings. |
| D4 | **HubSpot embed on CRA pages** | Leave it until you confirm it is unused. It costs ~100 KB and a third-party connection on `/search`, `/faq`, `/privacy`, `/terms`. | Removing a CRM script is not mine to decide; it may feed something I cannot see. |
| D5 | **Tone of share text and any new copy** | Match the existing voice: plain, specific, numbers first, no marketing adjectives, no internal feature names ("ToolScan", "deal check") in user-facing copy. | Existing site copy and `feedback_external_positioning` memory. |
| D6 | **Rockwell / Delta** | Do **not** merge the brands. Instead make the Delta pages mention "Delta-Rockwell" in the About text and add `rockwell` as a redirecting alias slug only where a Rockwell page has no sales of its own. | Rockwell is a real, distinct maker for part of the period; a blanket alias would mislabel sales. |

If any default is wrong, say which; everything else proceeds.

---

## 1. Prioritised backlog

Effort: S = under half a day, M = one to three days, L = a week or more / needs content.
"Measure" names the event or query that decides whether it worked. Traffic is
too small for significance tests; every item is judged by direction over 3–4
weeks plus replays, as the instrumentation memory already says.

### Tier 1 — quick wins (Milestone 1)

**B1. Per-page Open Graph images** — S/M
- Hypothesis: a link that unfurls with the median, range, sales count and the price distribution gets posted and clicked in forums, Reddit, iMessage and Slack; a text-only unfurl does not. All 890 guide pages and 52 hubs unfurl as text today.
- Pages: every `/guide/**` page and brand hub; `/scan` and `/` already have a generic image and keep it.
- Build: one route handler under the already-rewritten `/guide/` prefix (`web/app/guide/og-image/[...slug]/route.tsx`) rendering with `ImageResponse` from `next/og`; brand fonts bundled; cached with the same 1 h revalidation; `openGraph.images` + `twitter.card = summary_large_image` set from `guideMetadata` and the hub's `generateMetadata`. Include the honest state: "too few sales" pages render the sales list count, not a fake median.
- Measure: `share_clicked` (B2) and, in PostHog, sessions by `$entry_referring_domain` for reddit/forum/social hosts (baseline 26 per 90 days). Verify unfurls with the Facebook, Slack and iMessage debuggers after deploy.
- Risk: Vercel's bot challenge must not block `facebookexternalhit`, `Slackbot`, `Twitterbot`, `Discordbot`; check with curl using those user agents after deploy.

**B2. Share affordances + share event** — S
- Hypothesis: nobody shares because nothing on the page suggests it or makes it easy; a one-tap "copy" of a specific, quotable stat is the lowest-friction share a forum poster can make.
- Pages: guide pages (in the sold-price card, and once after the recorded sales), brand hubs (top card).
- Build: a `ShareBar` client component: *Copy stat* ("Used Stanley No. 5 bench plane: median $125 from 229 recorded sales, half between $95 and $165 — benchlot.com/guide/…"), *Copy link*, native share on phones (`navigator.share`), and a *Post to Reddit* link (`reddit.com/submit?url&title`). No social-network icon row. Event `share_clicked` with `method`, `surface`, `cluster_key`, `page_type`.
- Measure: `share_clicked` by method per week (baseline 0); social/forum referral sessions.

**B3. Titles and descriptions for the page-one zero-click pages** — S
- Hypothesis: the ~40 pages with 25–90 impressions at position 5–16 and 0–1 clicks are losing on the snippet, not the rank. Machine pages lose because the searcher wants listings and the title leads with a price; hand-tool pages lose because the searcher typed "value"/"worth" and the title says "prices".
- Pages: `guideMetadata` in `web/lib/guide-route.tsx`, two groups: (a) machine types (`MACHINE_TYPES`) — when ≥3 for sale, lead with supply: "12 used Delta drill presses for sale from $150 · sold median $275"; when fewer, keep the price lead but say "what they sell for" and drop the for-sale count; (b) hand tools with 8+ sales — "What a used Stanley No. 7 is worth: median $X from N sales" on model pages, "Used {brand} {type} values" on coarse pages. Descriptions carry the year range of the sales ("sales from 2024 to 2026") and the price band wording.
- Hold-out: change machines first; leave hand-tool titles for two weeks as the control; then switch hand tools. Do not churn again for a month.
- Measure: GSC CTR at position 4–10 by page group, weekly, from the `gsc-pages` pull (baseline 1.8% overall; machines ~0.5%, model pages 2.1%).

**B4. Move `/faq` to Next with real head tags and `FAQPage` JSON-LD; fix the CRA default description** — S
- Hypothesis: `/faq` is what a curious friend of a sharer opens; today it is a JS shell with a description about saved searches. Six real Q&As already exist in `src/Pages/FAQPage.js`.
- Pages: new `web/app/faq/page.tsx` (+ rewrite in root `vercel.json`), CRA route becomes a redirect; `public/index.html` description updated to match the home page; drop the unused Inter and JetBrains Mono font families from the CRA font link.
- Measure: `/faq` impressions in GSC (baseline 0); nothing else expected.

**B5. Measurement fixes** — S (details in §3)
- Add `share_clicked`, `guide_link_clicked`, `search_no_results`, `page_not_found`, server-side `lead_captured`; add PostHog bot rules; stop firing `price_chip_shown` while the chip is off; add machine-readable `dateModified` to guide pages; investigate the `alert_submitted` drop.
- Measure: the events exist and a weekly dashboard reads them.

**B6. Machine-readable freshness and Dataset markup** — S
- Hypothesis: AI crawlers and Google weigh freshness; the pages say "Updated 2026-10-13" only in prose. A `Dataset` entry on `/guide` can surface in Dataset Search for "used tool price dataset" queries.
- Pages: `guide-route.tsx` (`dateModified` in Product JSON-LD and `article:modified_time`), `/guide` page (`Dataset` + `ItemList` of types).
- Measure: none direct; cheap enough to ship on faith.

### Tier 2 — structural (Milestone 2)

**B7. Tool-type hub pages `/guide/{type}`** — M
- Hypothesis: type-level queries ("used bench plane prices", "hand saw price guide", "disston saw price guide" split across six model pages) have no target page. ~75 types have two or more publishable brands; each hub is backed by hundreds to thousands of sales, so it is not thin.
- Pages: new route; breadcrumbs on every guide page point here instead of `/guide#anchor`; sitemap and llms.txt include them; the guide index becomes a short list of types rather than a wall of 790 chips.
- Content per hub: a brand table (brand, sales, median, for sale), models with their own pages, for-sale rows across brands, the evidence sentence, `ItemList` JSON-LD, the alert form, the share bar. **No cross-brand median** — a median of Lie-Nielsen and Stanley No. 4 sales together is a number about nothing. State ranges per brand instead.
- Gate: ≥2 indexable brands and ≥50 sales, or the page is noindex and absent from the sitemap.
- Measure: GSC impressions/clicks on `/guide/{type}` (baseline 0); whether "disston saw price guide" consolidates on `/guide/hand-saw` or the Disston hub.

**B8. Brand hubs that read as a guide** — S/M
- Hypothesis: hubs earn impressions (246) and almost no clicks (2) because the page is a list of chips; a per-type table with medians is what "millers falls tools price guide" wants.
- Pages: `web/app/guide/brand/[brand]/page.tsx`: lead with a table (type, median, sales, for sale), then models, then for-sale rows; title "Millers Falls tool price guide: N tools, M sales".
- Measure: hub CTR in GSC (baseline 0.8%).

**B9. Guide ↔ listings cross-links** — S
- Hypothesis: guide visitors who want to buy leave; `/search` visitors who want a price never find the guide. Guide→`/search` transitions are 19 per 90 days and all via the header.
- Pages: guide pages get "All N {brand} listings →" to `/search?maker=…`; CRA `ResultCard` links to the guide page when the listing has canonical type+brand.
- Measure: `guide_link_clicked` with `kind=listings`; CRA `result_clicked` → guide pageviews in paths.

**B10. The weekly "Sold this week" digest (D1)** — M/L
- Hypothesis: a weekly, data-generated email about what actually sold is the first offer on the site that matches the dominant intent, so it converts visitors who will never set an availability alert.
- Pages: an inline ask on `/`, `/guide`, every type and brand hub, and a one-line "also send me the weekly sold roundup" under every alert form (one checkbox, same address). Confirmation and unsubscribe reuse the alerts token flow.
- Build: `digest_subscribers` (or a `leads` source + topic), a Vercel cron that picks the week's sales (top by price, by brand, by surprise vs median), a Resend template, server-side `digest_sent`/`digest_subscribed` events. First send by hand to you before it is automated.
- Measure: subscribers per week (baseline 0); open/click via Resend; return sessions with `utm_source=digest`.
- Needs from you: approval of the first three drafts, and a decision on whether the digest links to source listings (sold ones often 404 after a month) or to Benchlot pages only (recommended: Benchlot pages).

**B11. Bing / IndexNow** — S
- Hypothesis: ChatGPT search reads Bing; Bing Webmaster Tools is registered but nothing pings it. Submitting changed URLs nightly after the stats rebuild gets new hub pages and title changes into ChatGPT faster.
- Build: a step in `.github/workflows/ingest.yml` that posts the sitemap's URLs with today's `lastmod` to the IndexNow endpoint with a key file served from `web/public`.
- Measure: Bing/DuckDuckGo sessions (baseline 26 per 90 days); AI-channel sessions.
- **Shipped 2026-10-27**: `scripts/indexnow-submit.js` runs after the coverage snapshot in `ingest.yml`; it reads the live sitemap, hashes each cluster's figures (schema/015 `indexnow_submissions`) and submits only changed URLs. Key file lives in the CRA `public/` (served at the domain root), not `web/public`, which the rewrites do not expose. `--all` resubmits everything: run it after the 2026-11-03 title flip.

**B12. Retire the remaining CRA public routes** — S/M
- `/privacy`, `/terms`, `/help`, `/categories` move to Next (static content, real heads); `/planes/*` and `/check` routes removed (duplicates and unshipped); the CRA keeps `/search` and the marketplace behind its flag. Also the cleanup the findability memory already owes (`ToolScanPage.js` etc.).
- Measure: none; hygiene.

**B13. Data gaps the queries exposed** — S each, with D6
- Record No. 2 (there are Record No. 2 sales? verify; if the page exists it is noindex), Stanley No. 113 (add an internal link from bench-plane pages' "related" to the moulding-plane No. 113 so Google stops picking No. 3), Hults Bruk and Emmert (check normaliser output and alias rows), ECE and Bad Axe hubs (why position 40–50: likely thin; leave), Craftsman vise model numbers.
- Measure: the specific queries' landing page and position in the `gsc-date-page-query` pull.

### Tier 3 — new content and page types (Milestone 3)

**B14. Reference content: "how to tell what you have, and what moves the price"** — L, needs you
- Hypothesis: the pages are tables; tables are cited by AI Mode and skimmed, not shared. A few paragraphs per type and per headline model (what the type-study numbers mean, which features add value, what "restored" does to price, what to check before buying) are what gets quoted in a forum reply with a link. "stanley planes a guide to identification and value" already ranks #2 with nothing behind it.
- Start: Stanley bench planes (type pages exist; the type-study facts are public knowledge, Blood & Gore is the reference — summarise facts, never copy text), then Disston hand saws, then Stanley block planes, chisels.
- Needs from you: either write it, or approve model drafts you edit (the brand-notes pipeline with self-graded confidence already exists for this; extend it to type and model notes with a `published` flag you flip).
- Measure: GSC clicks on the pages that get content vs. matched pages that do not; `share_clicked` on those pages.

**B15. Monthly market report page** — M, data only
- Hypothesis: a dated, shareable round-up ("Used hand plane prices, October 2026: what sold, what moved") is the artefact a forum thread links to and a newsletter forwards. It is also the digest (B10) in web form, so one pipeline feeds both.
- Pages: `/guide/report/{yyyy-mm}`; OG image; `Article` JSON-LD with `datePublished`.
- Measure: referral sessions to report URLs; `share_clicked` on them.

**B16. Shareable scan results** — M
- Hypothesis: "what is this worth" with a photo is the most forwardable thing a hobbyist produces; today a scan result has no URL.
- Build: opt-in "Make this shareable" that publishes a `/scan/r/{id}` page (result + guide numbers, photo only if the user ticks it), OG image, share bar. Private by default.
- Measure: share pages created; sessions entering on `/scan/r/`.
- Deferred until scans exceed ~10 a week; 9 in the last 90 days is not enough to learn from.

**B17. Embeddable badge** — S, after B1
- A static SVG badge per page ("Median sold $125 · 229 sales · Benchlot") with a copyable `<img>`/BBCode snippet, for forum signatures and blog posts. Measure by referrer and by `share_clicked method=embed`. Low expectation; cheap once B1 exists.

**B18. The 26k "Other" listings** — L, data
- Audit what is in `canonical_type = 'Other'` by heuristic keyword before deciding which new types to add to the normaliser vocabulary. Only add a type if ≥50 sold rows would land in it. Needs the normaliser budget decision (≈$0.002/title).

---

## 2. Milestones

**Milestone 1 — quick wins (this week; all code, no content from you)**
B1 OG images → B2 share bar + event → B5 measurement fixes → B3 titles (machines first) → B4 FAQ to Next → B6 freshness + Dataset markup. Each lands as its own commit; the changelog below tracks them.

**Milestone 2 — structural (next 2–3 weeks)**
B7 type hubs → B8 brand hub tables → B9 cross-links → B11 IndexNow → B13 data gaps → B10 digest (needs D1 confirmed and your eyes on drafts) → B12 CRA retirement.

**Milestone 3 — content and new artefacts (from mid-November, paced by your content time)**
B14 reference content (needs you) → B15 monthly report → B17 badge → B16 shareable scans (when scan volume justifies) → B18 "Other" audit.

**What I need from you, by milestone**
- M1: nothing. Confirm D4 (HubSpot) if you want it removed in B4.
- M2: D1 and D6 confirmed; first three digest drafts reviewed before sending.
- M3: the reference content, or approval to run the model-draft pipeline and time to edit its output; the normaliser spend for B18; the GSC Pages export at any point.

---

## 3. Measurement plan

### 3.1 Events to add or fix

| Event | Where | Properties | Status |
|---|---|---|---|
| `share_clicked` | ShareBar (guide, hub, later report/scan) | `method` (copy_link, copy_stat, native, reddit, embed), `surface`, `page_type`, `cluster_key` | new |
| `guide_link_clicked` | GuideView chips, breadcrumbs, hub links, listings link | `kind` (size, model, related_brand, brand_hub, type_hub, breadcrumb, listings, scan), `cluster_key` | new |
| `search_no_results` | `/guide/search` (client, after render) | `query` | new |
| `page_not_found` | Next `not-found.tsx` (client) | `path`, `referrer` | new |
| `lead_captured` | server: `/api/leads`, `/api/toolscan/email`, digest signup | `source`, `scan_id` | new (server-side via `posthog-server.ts`) |
| `digest_subscribed` / `digest_confirmed` / `digest_sent` | server | `topic` | new with B10 |
| `alert_submitted` drop | `AlertSignup.tsx` | compare to `alert_requested` after each deploy | investigate: likely `track()` racing navigation or the one-tap path; add `alert_submit_failed` with the HTTP status |
| `price_chip_shown` | CRA `usePriceStats`/chip | — | stop firing while `PRICE_GUIDE_ENABLED` is off (1,213 noise events) |
| Bot filtering | PostHog project settings | — | add web-analytics bot rules; in queries, require `$pageview_count > 0` |

Existing events stay as they are: `listing_clicked_out` (with `price_band`), `email_prompt_shown/dismissed`, `alert_*`, `toolscan_*`, `search_submitted`, `result_clicked`.

### 3.2 Dashboards and recurring pulls

- **PostHog dashboard "Growth"** (to be created in M1 with the events above): weekly unique visitors by `$channel_type`; weekly guide pageviews; click-out rate for guide-entry sessions; `share_clicked` by method; alert funnel shown → submitted → confirmed by `placement`; digest subscribers; top entry pages; social/forum referrers; `search_no_results` and `page_not_found` lists.
- **Search Console, weekly** (Windsor `searchconsole`, account `sc-domain:benchlot.com`): the four pulls used for the audit — `date` totals; `page` with clicks/impressions/ctr/position; `query`; `date,page,query` — saved under `docs/data/` with the date in the filename. The derived views that matter: CTR at position 4–10 by page group (machine coarse, hand-tool coarse, model, size, hub, type hub); impressions on new page types; the ~40 named zero-click pages.
- **Postgres, weekly**: alerts confirmed, leads by source, digest subscribers, scans, publishable/indexable counts by grain (the `postgres-inventory` query).
- **Manual, after each deploy**: link unfurl check (Slack, iMessage, Reddit preview) on one guide page; `curl -A facebookexternalhit` on an OG image URL.

### 3.3 Baseline (2026-10-20, from the audit)

| Metric | Baseline |
|---|---|
| GSC clicks / impressions, weeks 40–42 | 70 / 3,386 (≈23 clicks/week) |
| GSC CTR at position 4–10 | 1.8% (70 / 3,854 over 55 days) |
| GSC CTR, machine coarse pages | ≈0.5% (8 named pages: 1 click / 590 impressions) |
| GSC CTR, model pages | 2.1% |
| GSC CTR, brand hubs | 0.8% |
| GSC pages with ≥1 impression | 862 |
| PostHog sessions / 90 d by channel | Direct 246 · Google 133 · ChatGPT 119 · other search 28 · Reddit 21 · Facebook 5 |
| Guide pageviews, best week | 110 |
| Multi-page sessions | 12.7% |
| Click-out rate, guide-entry sessions | organic 24% · AI 30% |
| `share_clicked` | 0 (event does not exist) |
| Social/forum referral sessions / 90 d | 26 |
| Alert forms shown → submitted (since Oct 11) | 106 → 1 |
| Confirmed alerts since Sep 1 | 1 |
| Leads all-time | 34 |
| Digest subscribers | 0 (no digest) |
| Scans / 90 d | 9 |

Judge M1 on the 2026-11-17 reads (four weeks): CTR at position 4–10 for machines vs. the hand-tool hold-out, `share_clicked` > 0 with at least one visible forum/Reddit referral, `/faq` indexed. Judge M2 on the 2026-12-15 reads: impressions on `/guide/{type}`, hub CTR, digest subscribers.

---

## 4. Risks and how each is avoided

- **Thin programmatic pages.** Type hubs only where ≥2 indexable brands and ≥50 sales; no per-size hubs; no cross-brand medians; nothing from the "Other" bucket until B18 is done. Everything else stays `noindex, follow` exactly as now. The 513 pages with <5 impressions are the argument: more tables of the same shape will not rank.
- **Aggressive capture.** No modals, no exit intent, no gating (D2), no third ask on a page that already has two; the digest ask is an inline card or a checkbox on an existing form. The return prompt stays once-per-page and dismissible for 30 days. Double opt-in stays.
- **Title churn.** B3 changes one group at a time with a hold-out and then freezes for a month; GSC needs 3–4 weeks per read. Titles never exceed 70 characters and never claim listings that are not there.
- **OG image failures.** On-demand generation with caching; bot-challenge check with the real unfurler user agents; a static fallback image if the route errors so a bad deploy degrades to today's behaviour, not a broken card.
- **Email deliverability.** Resend domain already verified; digest uses the same from-address and unsubscribe as alerts; first sends go to you; volume is small enough that reputation is not at risk.
- **Copyright in reference content.** Facts about Stanley type studies are public; Patrick Leach's prose is not. Summaries only, with a credit line. Nothing scraped from dealer descriptions is reproduced as editorial.
- **Removing CRA code.** Each route removal is its own commit; `/planes/*` and `/check` have no inbound links or impressions; `/faq`, `/privacy`, `/terms` get rewrites before the CRA routes go.
- **Measuring at this volume.** Nothing reaches significance below ~1,000 visitors a week. Every item is judged by direction, replays and the GSC position-bucket CTR, and no two tests touch the same element at once.

Cosmetic, not needle-moving, and therefore last or never: social icon rows, a redesign of the guide index for its own sake, performance work (already green), a blog with no distribution plan, popups of any kind.

---

## 5. Phase 3 changelog

Milestone 1 landed on `main` on 2026-10-20 as seven commits, nothing pushed. Verification for the set: `next build` in `web/` prerendered 909 pages with no errors (`/faq` static, `/guide/og/[...slug]` dynamic); the CRA `npm run build` compiled; `tsc --noEmit` and `eslint` clean on every touched file in both apps; rendered HTML checked on a dev server for a coarse, model, type-fine and hub page, the FAQ, the 404 and an empty search.

| Date | Commit | Item | What changed | Verified by |
|---|---|---|---|---|
| 2026-10-20 | `87215bc9` | B1 OG images | Route `/guide/og/{page path}` renders a 1200×630 card with `next/og` from static Petrona/Outfit TTFs in `web/assets/fonts` (traced into the bundle via `outputFileTracingIncludes`): median in Honey, sales count, middle half, for-sale count, p10–p90 band; machine pages with ≥3 listings lead with supply; maker hubs show sales, types and the top four medians. `guideMetadata` and the hub set `openGraph.images` (with a `?v=YYYYMMDD` stamp from the stats rebuild) and `twitter.card = summary_large_image`. Unknown pages 404. | Rendered four cards and inspected them; `og:image`, `og:image:alt`, `twitter:card` present in page HTML. **After deploy:** `curl -A facebookexternalhit -I https://benchlot.com/guide/og/bench-plane/stanley/no-4`, then paste a guide URL into Slack, iMessage and a Reddit draft. |
| 2026-10-20 | `e5523354` | B2 share row | `ShareBar` under the sold-price card on guide pages and under the hub stats: Copy the figure (median sentence + link), Copy link, native share (client-only, via `useSyncExternalStore`), Post to Reddit (prefilled submit). Fires `share_clicked` {method, surface, page_type, cluster_key, path}. The page path comes from the route, not rebuilt from names. | Row renders on coarse, hub and Disston pages; Reddit link carries the right URL and title. |
| 2026-10-20 | `154f2716` | B5 measurement | New events: `guide_link_clicked` (via `GuideLink`, kinds breadcrumb/size/model/related_brand/brand_hub/hub_type), `search_no_results`, `page_not_found` (new `app/not-found.tsx`), server `lead_captured` from `/api/leads` and `/api/toolscan/email` (CRA and Next forms now send the PostHog id), `alert_submit_failed` {status}. CRA chip stops firing `price_chip_shown`. **Finding:** the `alert_submitted` "drop" is not real: of 3 `alert_requested` in 45 days, one is a real signup that also fired `alert_submitted`, two are the `email-journey-test` id. | 404 page and empty search render; lint clean in both apps. Events will show in PostHog after deploy. |
| 2026-10-20 | `2feaeda3` | B3 titles (machines) | Machine pages: ≥3 for sale → "6 used Delta table saws for sale from $149.95 · sold median $725"; otherwise "What used Delta band saws sell for: median $150 from 11 sales"; descriptions carry the sales' year span. Hand-tool titles unchanged (control) behind `HAND_TOOL_WORTH_TITLES = false` in `web/lib/guide-route.tsx`, with the "what a used Stanley No. 7 is worth" variant written and ready. **Flip on 2026-11-03**, then freeze both for a month. | Titles checked on Delta table saw, Craftsman drill press, Festool dust collector, Delta band saw, Powermatic jointer; Stanley No. 4 and Disston unchanged. |
| 2026-10-20 | `426f78f7` | B4 FAQ + CRA head | `web/app/faq/page.tsx` (title, description, canonical, og, `FAQPage` JSON-LD) behind a new `/faq` rewrite in root `vercel.json`. Sources answer reads the `sources` table (live in 45 days: 7 dealers, Sawmill Creek, Woodnet, eBay; Reddit and Facebook Marketplace dropped); alert answer matches the no-account flow; one added question uses the homepage's "How Benchlot works" paragraph verbatim. CRA links to `/faq` use `reloadDocument`; `/about` and `/contact` hard-redirect; `public/index.html` gets the homepage description and og copy; Inter and JetBrains Mono dropped from the font link and Tailwind config. HubSpot script left in place (D4). | FAQ renders with 7 Q&As and valid JSON-LD; CRA build compiled (-69 B). **After deploy:** `curl -I https://benchlot.com/faq` should show the Next page, not `app.html`. |
| 2026-10-20 | `e1419537`, `c1643b2f` | B6 freshness + Dataset | Every cluster page emits a `WebPage` node with `dateModified` from the stats rebuild (schema.org `Product` has no date; `article:modified_time` is not expressible through Next's metadata API for `og:type=website`, so JSON-LD carries it). `/guide` emits a `Dataset` (coverage 2020 to the last rebuild, read from the data) and an `ItemList` of the 66 tool types. | Both nodes parse from the rendered HTML. |
| 2026-10-20 | — | PostHog | Dashboard **Growth** (id 2235844, pinned): weekly sessions by channel, weekly guide pageviews, share clicks by method, alert funnel by placement, leads by source, forum/social referrers, guide searches with no results, pages not found, internal links by kind. No custom bot rule added: the 30-day homepage traffic is ordinary browser UAs, so there was no pattern to name; the dashboard queries require `$pageview_count > 0` instead. | Insights run against the project. |

Not done in M1, carried forward: GSC Pages (indexing) export still needed from you into `docs/data/`; HubSpot removal awaits D4; the hand-tool title flip is dated above.
