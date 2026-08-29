# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
Benchlot — An aggregator / search engine for used woodworking tools (hand tools and power tools). Indexes public listings from dealers, forum classifieds, and auction houses; clicks through to the source to transact. The pre-pivot marketplace code is preserved in-tree (legacy routes gated behind `MarketplaceRoute`) but anonymous visitors always land on the aggregator.

## Build/Test Commands
- `npm start` - Start the React development server
- `npm test` - Run tests (Jest with React Testing Library)
- `npm run build` - Build production version
- `npm run build:staging` - Build for staging environment
- `npm test -- --testNamePattern="specific test name"` - Run a single test
- `cd functions && npm run serve` - Start Firebase functions emulator

## Code Style Guidelines
- **Imports**: Group imports by type (React, third-party, local) with line breaks between groups
- **Components**: Use functional components with hooks
- **Naming**: PascalCase for components, camelCase for variables/functions
- **File Structure**: Keep components, hooks, and utilities in their respective folders
- **Error Handling**: Use try/catch with detailed console.error for debugging
- **Documentation**: Use JSDoc for functions, especially in model files
- **Firebase**: Abstract Firebase operations into model files and custom hooks
- **Styling**: Use Tailwind CSS with Benchlot design system (see tailwind.config.js)
- **Context**: Use React Context for app-wide state management

## Brand
**One brand: Benchlot.** The Benchfind split was unwound on 2026-08-29 — its
components, pages, assets, design handoff and host-branching are deleted, and
benchfind.com 301s to benchlot.com via `vercel.json`. There is no
`getHostBrand()` any more; do not reintroduce host-conditional branding.

## Design System
- **Fonts**: Petrona (display/headings), Outfit (body/UI)
- **Colors**: Spruce (#1a3030), Bone (#f2f0eb), Honey (#d4aa60), Dark Teal (#0c1c1e)
- **Rules**: Never pure white backgrounds (use Bone). Never pure black text (use Dark Teal). Prices always in Honey. Button text on Honey is always Dark Teal.
- **Firebase project ID**: `benchlot-6d64e` (do not rename — this is the Google Cloud project identifier)

## Architecture — current state (updated 2026-08-29)

The aggregator has moved off Firestore. A session that assumes otherwise will
be wrong about where the data is, what writes it, and why things cost money.

**Data lives in Neon Postgres.** `migration/` holds the tooling (`export.js` →
`load.js` → `validate.js`, `schema/00*.sql`) and its README is the runbook.
Ingest is fully cut over as of 2026-08-29 — **nothing writes listings to
Firestore any more**, so treat the `externalListings` collection as a frozen
archive, not a second source of truth. Use the **unpooled** connection for
loads, DDL and long jobs; the app uses the pooled one.

**`functions/ingest/SCHEMA.md` is stale.** Live documents also carry
`plane_type_number`, `normalizer_model`, `normalized_at` and `excluded_reason`,
and two of the four composite indexes it documents were never deployed. Trust
the database over that file.

**`web/` is a Next.js app serving https://benchlot.com/guide** — ~465
prerendered price-guide pages — via a rewrite from the `benchlot-marketplace`
project (see the root `vercel.json`). `/_next/*` MUST stay proxied or the pages
render unstyled. The CRA app still serves everything else on benchlot.com, and
still returns "You need to enable JavaScript" to crawlers on every other route.

**Ingest runs on GitHub Actions, not Cloud Functions.**
`.github/workflows/ingest.yml` runs daily at 03:00 UTC and picks sources from a
weekday map (Mon ebay+jimbode+valueguide, Tue hyperkitten+thebestthings, Wed
ebay+rouillard, Thu oldtools+woodnet, Fri ebay, Sat vintagevials+sawmillcreek+
reddit). It calls `functions/worker/run.js`, then the normalizer, then
`rebuild_price_stats()`. `fbmarketplace` is the one source still parked — on
Bright Data cost, not on brand rationale.

Writes go through a backend-switchable store (`functions/ingest/store/`,
selected by `BENCHLOT_STORE`, **default `postgres`** since the cutover). All 12
scrapers import `ingest/externalListings.js`, a one-line re-export.

The workflow needs four repo secrets: `DATABASE_URL_UNPOOLED`, `EBAY_APP_ID`,
`EBAY_CERT_ID`, `ANTHROPIC_API_KEY`. Reddit needs none — `REDDIT_AUTH_MODE` is
pinned to `public` in the workflow, and public mode reads www.reddit.com
unauthenticated. Leaving it unset would fall back to `oauth`, which hard-fails
without credentials.

**The normalizer owns `canonical_*`, `era_estimate` and `plane_type_number`.**
Scrapers emit them as null on every run; a store must never let that reach an
existing row. Doing so re-fired the Firestore trigger and re-billed every
listing on every scrape — the actual cause of both the Anthropic spend and
~31k rows with a null `canonical_type`. Guard normalization on `normalized_at`,
never on `canonical_brand` (an unbranded tool legitimately has none).

**Price stats are computed in SQL** — `SELECT * FROM rebuild_price_stats()`,
~5s over ~168k rows. The ingest workflow runs it after each scrape. It replaces
`functions/pricestats/build.js`, whose statistics were sound but which tested
the parts filter against `condition_raw` only (dead on eBay), never excluded
multi-item lots, and never pruned stale clusters.

Note the Firestore `priceStats` collection is now **frozen**: its nightly
builder was removed with the other Cloud Functions. Nothing user-facing reads
it (the CRA chip is behind `PRICE_GUIDE_ENABLED`, off), but the scan-results
email's "Benchlot index" line still does — point that at Postgres before
turning any of it back on.

**Alerts require no account** — email + double opt-in + signed links. See the
`project_alerts_no_auth` memory before changing any of it; several properties
that look like over-engineering are load-bearing.

### Costs worth knowing
- Normalization is **~$0.002/title**, not the $0.0002 an old code comment
  claims: the system prompt is ~8,800 cached tokens.
- Do **not** backfill `canonical_*` from `heuristic_*`. It was tried and
  reverted: ~20–40% precision (it maps Lie-Nielsen tools to Stanley and calls
  chip breakers bench planes). Audit precision before believing a coverage win.
