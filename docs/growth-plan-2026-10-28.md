# Benchlot growth plan — 2026-10-28

Supersedes `docs/growth-plan.md` (2026-10-20). That plan's Tier 1 (OG cards,
share row, machine titles, FAQ, measurement, Dataset markup), B7 (type hubs)
and B11 (IndexNow) have shipped; everything else is re-scored here against
what the last four weeks showed. Item numbers restart at G1 so the two plans
cannot be confused.

Figures are from PostHog (28 days to 2026-10-28 vs the 28 before), Search
Console (daily export to 2026-10-17) and the database on 2026-10-28.

## 1. Where the site is

| Measure | Last 28 days | Prior 28 days | Note |
|---|---|---|---|
| Sessions | 355 | 175 | doubled |
| Organic search sessions | 136 | 52 | Google 108, DuckDuckGo 12, Bing 10 |
| Direct sessions | 130 | 58 | includes app-less AI referrals and pasted links |
| AI-channel sessions (ChatGPT, Claude, Perplexity) | 61 | 51 | 17% of traffic; flat while search grew |
| Referral + social sessions | 27 | 14 | Facebook 4, Reddit 1; no forum traffic |
| Sessions with a second page | 75 (21%) | 26 (15%) | up since the homepage and index work |
| Sessions that click out to a seller | 21.7% | 12.6% | 190 click-outs in 80 sessions |
| Email prompt shown → alert requested → confirmed | 195 → 8 → 3 | | 1.5% of prompts; the offer is wrong, not the placement |
| Share clicks | 1 | 0 | OG cards and share row exist; nobody is prompted to share |
| Scans | 21 in 9 sessions | 9 per 90 days before | still tiny |
| API requests (REST + MCP) | 98, one caller | 0 | the Claude directory key; listing still in review |
| GSC, daily (Oct 13–17) | 150–230 impressions, 1–5 clicks, position 7.6–8.8 | | CTR 1–2.5% |
| Recorded sales / listings for sale | 38,844 / 35,977 | | |
| Guide pages: publishable / indexable / ask-rich but noindex | 2,102 / 842 / 126 | | 61 type hubs added 2026-10-28 |
| Listings typed "Other" | 83,174 (9,097 sold) | | the normalizer's catch-all; 36% of the corpus |

Pageviews by page kind, last 28 days: maker+type pages 174, home 128,
model/size pages 119, guide search 50, brand hubs 38, scan 35, guide index
35, listings grid 32, type hubs 3 (live for one day).

## 2. What changed in the thinking since Oct 20

1. **Search is working and compounding.** Organic sessions 2.6× in four
   weeks with the same pages; the title work, Dataset markup and IndexNow are
   the likely causes, and the type hubs have not been crawled yet. The plan
   should protect and feed that engine before anything else: nothing that
   churns titles, nothing that adds thin pages.
2. **People now browse.** Second-page sessions rose from 15% to 21% after the
   homepage became the guide's front door and the index got a hierarchy.
   Internal navigation is worth more than it was: every hub, table and
   cross-link reaches a fifth of visitors instead of an eighth.
3. **Buying intent is real and under-served.** Click-out rose to 22%; the
   guide pages send 190 visitors a month to sellers, but a guide page has no
   way to the listings grid except the header, and a listing card has no way
   to the guide.
4. **The email offer is the wrong offer.** The prompt is seen by a third of
   sessions and converts 1.5%, because it asks "tell me when one is listed"
   of people who came to ask "what is it worth". The decision D1 from the old
   plan (a weekly sold roundup) is still the right one and still unbuilt.
5. **Sharing is a distribution problem, not a UI problem.** One share click
   in a month with cards, copy buttons and a Reddit link in place. The cards
   will matter when someone posts a Benchlot link in a thread; nobody on the
   site is that someone. Forum and Reddit referrals: one session.
6. **The AI channel is steady, not growing.** 61 sessions, 40% click-out,
   the best buyers on the site, but flat while Google grew. ChatGPT reads the
   HTML (the API log shows no ChatGPT calls); the Claude directory listing is
   still pending. The lever is being cited, which means the same pages and
   markup as Google, plus the type hubs as a clean "what are used X worth"
   answer.
7. **"Other" is bigger than the old plan thought**: 83k listings, 9k of them
   sold, versus the 26k it cited. Sharpening stones, hardware, bits, turning
   tools and measuring instruments with no vocabulary entry are invisible to
   the guide and to search.
8. **Mobile is most of the audience and the new tables hide the price
   column on phones.** The guide-pages spec's 380px rule still stands; the
   header fix shipped today, the tables need the same pass.

## 3. Scoring

Three scores per item, each 1–5:

- **UX**: how much better the experience is for someone already on the site.
- **Visits**: how much it can grow sessions (search, AI, referral, return).
- **Effort**: 1 = under half a day, 2 = a day, 3 = two to three days,
  4 = a week, 5 = ongoing or needs content from Rob.

Priority = UX + Visits − Effort, then judgement for dependencies and dates.
"Measure" names the number that says whether it worked; the Growth dashboard
(PostHog 2235844) and the GSC pull are the two readouts.

## 4. The list, in priority order

| # | Item | UX | Visits | Effort | Score | When |
|---|---|---|---|---|---|---|
| G1 | Brand hub pages as a ranked table | 4 | 3 | 1 | 6 | this week |
| G2 | Guide ↔ listings cross-links | 4 | 2 | 1 | 5 | this week |
| G3 | Phone layout for the new tables and cards | 3 | 1 | 1 | 3 | this week |
| G4 | Hand-tool title flip and the page-one zero-click pages | 1 | 4 | 1 | 4 | Nov 3 (dated) |
| G5 | Data-gap sweep: aliases, routing, duplicates | 2 | 2 | 1 | 3 | this week, rolling |
| G6 | Open the index gate for the 126 ask-rich pages | 2 | 3 | 1 | 4 | after Nov 17 |
| G7 | "Sold this week" email in place of the availability prompt | 3 | 4 | 3 | 4 | drafts Nov 4–14, launch after Nov 17 |
| G8 | Monthly sold roundup page (web form of G7) | 2 | 3 | 2 | 3 | with G7 |
| G9 | Reference content on the top five pages | 5 | 5 | 5 | 5 | from mid-Nov, paced by Rob |
| G10 | Type the "Other" bucket | 3 | 3 | 4 | 2 | audit now, normalize in Nov |
| G11 | AI channel: type-page Dataset, directory follow-through, ChatGPT app when the plan allows | 1 | 3 | 2 | 2 | rolling |
| G12 | Distribution: post the pages where woodworkers are | 1 | 4 | Rob | — | weekly, from now |
| G13 | Hygiene: CRA routes, dead events, search no-results event | 1 | 1 | 1 | 1 | when touching nearby code |

Deliberately not on the list: more programmatic page kinds, scan sharing
(21 scans a month cannot teach anything), pop-ups or gates, a native app,
paid acquisition, a brand taxonomy on the index (the A–Z suffices until
`guide_link_clicked kind=brand_hub` says otherwise).

### G1. Brand hub pages as a ranked table — UX 4 · Visits 3 · Effort 1

- Why: hubs draw 38 views a month on site and 246 Google impressions for 2
  clicks; the page is a chip list. The type pages shipped today show the
  shape that works: a sold card with the evidence row, then a table.
- Build: `web/app/guide/brand/[brand]/page.tsx` leads with the stat card
  and evidence row (reuse `EvidenceRow` with a brand-wide `facts` query
  mirroring `typeFacts`), then a table of the maker's types: type, median,
  most sell for, sales, for sale (reuse `MakerTable`'s layout as a
  `TypeRowsTable`), then the models with their own pages as chips, then the
  for-sale rows. Title stays as is (it is in the GSC baseline).
- Measure: hub CTR in GSC (baseline 0.8%); `guide_link_clicked kind=hub_type`
  per hub view (baseline 7 clicks / 38 views).

### G2. Guide ↔ listings cross-links — UX 4 · Visits 2 · Effort 1

- Why: 22% of sessions click out to a seller, and the guide page shows at
  most 24 listings; the full grid at `/search` is reachable only from the
  header. The reverse is also missing: a listing card never says "this
  model's median is $125".
- Build: on every guide page, under the for-sale table, "All {n} {brand}
  {type} listings →" to `/search?q=` (plain `<a>`, CRA route; `n` from
  `activeAggregate`). On the CRA `ResultCard`, a one-line "Price guide:
  median $X from N sales →" when the listing has a canonical type and brand
  with an indexable page (the CRA already calls the search API; add a
  `guide` lookup to the listings response or read `/api/v1/prices` client
  side with a 1 h cache). Fire `guide_link_clicked kind=listings` and a
  CRA `guide_link_clicked kind=result_card`.
- Measure: guide → `/search` transitions (baseline 19 per 90 days);
  `/search` → guide pageviews in paths (baseline ~0).

### G3. Phone layout for the new tables and cards — UX 3 · Visits 1 · Effort 1

- Why: most visitors are on phones; `TypeTable` and `MakerTable` hide the
  price columns under 640px, which are the columns that matter. Family
  cards at two per row at 380px are fine; the "+8 more" links wrap awkwardly.
- Build: on phones show Type · Sales · Medians (hide Makers and For sale)
  and Maker · Median · Sales; `whitespace-nowrap` on the price cells; the
  sold-card `dl` stays two-up. Check `/guide`, `/guide/bench-plane`,
  `/guide/brand/stanley` and `/` in 380px iframes (headless Chrome refuses
  narrower windows; `tmp/frames.html` has the harness).
- Measure: none direct; part of G1's hub read.

### G4. Hand-tool title flip and the zero-click pages — UX 1 · Visits 4 · Effort 1

- Why: Google is the growth engine right now, and 40 pages sit on page one
  with 25–90 impressions and 0–1 clicks. The machine titles moved first on
  Oct 20; the hand-tool variant ("what a used Stanley No. 7 is worth") is
  written and gated behind `HAND_TOOL_WORTH_TITLES`.
- Build: on 2026-11-03 flip the flag, run `scripts/indexnow-submit.js --all`
  (which also submits the 61 type hubs for the first time), then freeze all
  titles until Dec 3. No other title or H1 changes in that window; the
  type-page titles are new and not part of the experiment.
- Measure: GSC CTR at position 4–10 for hand-tool pages vs machine pages
  (baseline 2.1% model pages, ~0.5% machines), weekly.

### G5. Data-gap sweep — UX 2 · Visits 2 · Effort 1, rolling

- Why: each gap is a searcher sent to the wrong page or none. Today's
  True Temper split (three spellings, now aliased) is typical.
- Build, one PR each as found: Rockwell→Delta per decision D6 (alias slug
  only where Rockwell has no sales); Stanley No. 113 routing (link from
  bench-plane "related" to the moulding-plane page); Record No. 2 check;
  Hults Bruk and Emmert normalizer output; duplicate makers in the A–Z
  (run `functions/normalize/brand-alias-candidates.js` monthly and review).
- Measure: the specific queries' landing page in the GSC date-page-query
  pull.

### G6. Open the index gate for the 126 ask-rich pages — UX 2 · Visits 3 · Effort 1, after Nov 17

- Why: 126 pages have ten or more listings for sale now but fewer than
  eight sales, so they are noindex and absent from the sitemap. Almost all
  are machines, where the searcher wants listings; the machine title
  already leads with supply. The number was 1,259 "under 8 sales" in the
  October analysis; only 126 are ask-rich, so the thin-page risk is small.
- Build: `INDEXABLE` becomes sold ≥ 8 OR active ≥ 10, applied to the robots
  tag, the sitemap and `listTypeHubs`; the sold card keeps the "too few"
  sentence. Ship after the Nov 17 read so it does not confound G4.
- Measure: impressions on those 126 URLs in GSC (baseline 0); whether
  "Discovered, currently not indexed" grows.

### G7. "Sold this week" email — UX 3 · Visits 4 · Effort 3

- Why: the availability prompt converts 1.5% of 195 showings a month. A
  weekly roundup of what sold, with the biggest median moves, matches the
  intent people arrive with and is the only return-visit mechanism on the
  list. Resend and the alerts token flow already exist.
- Build: `digest_subscribers` (or a `topic` on the alerts table), the
  prompt copy changes from "tell me when one is listed" to "what sold this
  week, every Sunday" with the availability alert as a checkbox under it; a
  Vercel cron on Sunday picks the week's sales (top by price, by family,
  biggest moves vs median), renders a Resend template, logs
  `digest_sent`/`digest_subscribed`. First three issues go to Rob by hand.
- Decisions needed first: cadence (Sunday), links (Benchlot pages only:
  sold source listings 404 within weeks), tone (site voice, numbers first).
- Measure: subscribers per week (baseline 0); return sessions with
  `utm_source=digest`; prompt → request rate against the 1.5% baseline.

### G8. Monthly sold roundup page — UX 2 · Visits 3 · Effort 2, with G7

- Why: the digest's content on a URL is the artefact a forum thread links
  to; dated pages with `Article` JSON-LD are the kind of thing Google and
  AI crawlers treat as fresh. One pipeline feeds both.
- Build: `/guide/report/{yyyy-mm}` from the same query as G7, OG card via
  the existing route, share bar, linked from the index and the type pages.
- Measure: referral sessions to report URLs; `share_clicked` on them.

### G9. Reference content on the top five pages — UX 5 · Visits 5 · Effort 5

- Why: the pages are tables; tables are cited and skimmed, not shared or
  linked. "stanley planes a guide to identification and value" ranks #2
  with nothing behind it. A few paragraphs on what moves the price (type
  study, restoration, what to check) is what a forum reply quotes.
- Start: Stanley bench planes (type-study data exists), Disston hand saws,
  Stanley block planes, chisels, the bench-plane type hub itself.
- Build: extend the brand-notes pipeline (model draft, self-graded
  confidence, `published` flag Rob flips) to type and model notes; Rob
  edits the drafts. Facts summarised, never copied, from the public
  references.
- Measure: GSC clicks on pages with content vs matched pages without;
  `share_clicked` on those pages.

### G10. Type the "Other" bucket — UX 3 · Visits 3 · Effort 4

- Why: 83k listings and 9k sales are invisible to the guide. The types
  that would clear 50 sales each (sharpening stones, turning tools, auger
  bits by maker, hardware, marking knives) are plausible search targets
  and would fill the empty `sharpening.jpg` family.
- Build: audit query first (keyword buckets over `Other` titles, sold
  count per bucket); add only types with ≥ 50 sold rows to the vocabulary;
  re-normalize the affected titles through the Batch API (about $0.0013 a
  title; the whole bucket is ~$60); add the family mapping.
- Measure: typed coverage (97% → ?); new pages' impressions after a month.

### G11. AI channel — UX 1 · Visits 3 · Effort 2, rolling

- Why: 17% of sessions, best click-out, flat. The lever is being the page
  an answer cites.
- Build: Dataset JSON-LD on type pages once `/api/v1/prices` accepts a
  type without a brand (small API change, then reuse
  `clusterDatasetJsonLd`); follow the Claude directory review to a
  decision; resubmit llms.txt to IndexNow after G4; ChatGPT app submission
  only if the account moves to a plan that allows custom connectors
  (pieces are in `chatgpt-plugin/`).
- Measure: AI-channel sessions per week (baseline ~15); `api_request` by
  key once the directory listing is live.

### G12. Distribution — Rob's lever

- Why: one Reddit thread was 160 sessions in September; forum referrals in
  the last month were one session. Every share affordance on the site is
  pointed at a visitor who has no reason to post. The person with a reason
  is the owner of the data.
- Do, weekly: when a question like "what is my Stanley No. 5 worth" appears
  in r/handtools, r/woodworking, Sawmill Creek or Woodnet, answer it with
  the figure and the type or model page link (the OG card does the rest).
  Post the monthly roundup (G8) once it exists. Keep a short log of where
  links went so referrals can be attributed.
- Measure: referral sessions by domain (baseline 1 Reddit, 4 Facebook);
  `share_clicked` is not the number, referrals are.

### G13. Hygiene — Effort 1, opportunistic

- `price_chip_shown` still fires 435 times a month from the CRA chip that
  was meant to be off; `search_no_results` and `page_not_found` never
  appear in the taxonomy (check they fire); `/privacy`, `/terms`, `/help`
  to Next with real heads; `/planes/*` and `/check` removed.

## 5. Sequence

- **Week of Oct 28**: G1, G2, G3 as one or two PRs; G5 as found; G12
  starts.
- **Nov 3**: G4 flip + IndexNow `--all`. Titles frozen to Dec 3.
- **Nov 4–14**: G7 drafts (three issues by hand), G8 page from the same
  query, G10 audit query and the vocabulary proposal, G11 Dataset on type
  pages.
- **Nov 17 read**: homepage bounce and continue-to-guide (baseline 53% /
  ~22%), hub CTR, type-hub impressions, click-out rate, `guide_link_clicked`
  by kind. Then G6, then G7 launch.
- **From mid-Nov**: G9 at Rob's pace; G10 normalization once the budget is
  agreed.

## 6. What this plan needs from Rob

- G7: cadence, link policy and tone confirmed; three drafts reviewed.
- G9: time to edit drafts, or the content itself.
- G10: the normalizer spend (~$60 once, then nightly as today).
- G12: the weekly habit; nothing to build.
- A Search Console Pages export every two weeks, until the API is wired.

## 7. Risks

- Title churn inside the Nov 3–Dec 3 window would wreck the only controlled
  read the site has; G6 and G9 wait for it.
- Thin pages: G6 is capped at the 126 ask-rich pages; G10 adds a type only
  at 50+ sales; G8 pages are dated and finite.
- Email: double opt-in and one-click unsubscribe stay; nothing is gated.
- Content: summarise, never copy; the brand-notes self-grading gate stays
  on type and model notes.
