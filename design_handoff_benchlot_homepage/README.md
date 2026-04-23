# Handoff: Benchlot Aggregator Homepage

## Overview

This bundle contains the design for the **Benchlot aggregator homepage** — the single-page entry to a search engine that indexes hand tool listings from dealers, forums, subreddits, marketplaces, and auction houses, and gives woodworkers one place to find them.

Benchlot does **not** broker transactions under this model. Every listing links back to its original source. The homepage IS the product — 90%+ of user actions happen here.

> **Important context — product pivot:** Benchlot previously ran as a peer-to-peer marketplace. Much of that code (cart, checkout, Stripe Connect, seller onboarding) may still exist in the codebase and should be **ignored** for this work. The design tokens, type system, filter-rail pattern, and result-card aesthetic should carry forward. If the `/marketplace` surface is still in the tree, it's fine to reuse its filter rail structure; do not reuse its cart/checkout code paths.

## About the Design Files

The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior. They are **not production code to copy directly.**

Your task: **recreate these HTML designs in the target codebase's existing environment** (the Benchlot production stack is React + Tailwind + Firebase) using its established patterns and libraries. If starting fresh, React + Tailwind is the expected framework.

## Fidelity

**High-fidelity.** Final colors, typography, spacing, copy, and interactions. Recreate pixel-perfectly using the existing Benchlot design system (`tailwind.config.js`, `src/styles/design-system.css`) — every token used here comes from that system; nothing has been invented.

---

## Two states, one page

The homepage has two visual modes, switched based on **query/filter state** (not scroll position):

| State | Trigger | What shows |
|---|---|---|
| **Empty** | No query entered, no filters applied | Editorial hero, big search, live-index chip, sources strip, "Latest listings" preview grid, footer |
| **Results** | Query entered OR any filter applied | Sticky compact top bar, breadcrumb strip with Save-Alert button, filter rail + results grid + source-distribution bar, footer |

Transition is instant — no animation between states. The sticky compact bar stays pinned as the user scrolls results.

---

## Screens / Views

### 1. Empty State

**Purpose:** Orient a first-time or logged-out visitor. Communicate that Benchlot is an aggregator (not a store), show breadth of sources at a glance, and make search the obvious next action.

**Layout (top to bottom):**

1. **Editorial header** (full-width, `border-bottom: 1px solid var(--border-light)`, `padding: 22px 0`)
   - Container: `max-width: 1280px`, `padding: 0 40px`, flex row, space-between
   - Left: "Benchlot" wordmark — Petrona 900, 24px, `letter-spacing: -1.2px`, color `var(--spruce)` (#1A3030)
   - Right: nav links — Outfit 500, 13px, `var(--fg-secondary)`, gap 28px
     - Links: `ToolScan` · `About` · `FAQ` · `|` (1px vertical divider) · `Sign in` (color `var(--spruce)`)

2. **Hero section** (`padding: 88px 40px 120px`, subtle radial-dot pattern background at 40% opacity)
   - Background: `linear-gradient(180deg, #F2F0EB 0%, #F2F0EB 60%, #ECE9E1 100%)`
   - Overlay: `radial-gradient(circle at 1px 1px, rgba(26,48,48,0.08) 1px, transparent 0)` at 22px × 22px tile
   - Max-width `820px`, centered, text-align center
   - **Live index chip** (top, pill): `padding: 6px 14px`, `border-radius: 999px`, `background: rgba(26,48,48,0.05)`, `border: 1px solid rgba(26,48,48,0.1)`. Contains:
     - Animated green dot (`#2a6a4a`) — 8×8px solid circle with an expanding-fading ring (`bl-pulse` keyframes, 2s infinite: `opacity 0.25 → 0`, `scale 1 → 1.6`)
     - Text: `Live Index · 4,892 listings · updated 14 min ago` — Outfit 500, 11px, uppercase, `letter-spacing: 0.08em`, color `var(--spruce)`
   - **Headline** (margin-top 36px from chip): 68px / line-height 1.04, Petrona 800, `letter-spacing: -2px`, color `var(--dark-teal)`. Two lines:
     - Line 1: "Every hand tool listing,"
     - Line 2: "in one place." — Petrona **500 italic**, color `var(--spruce)`
   - **Subhead** (margin-top 22px): Outfit 400, 19px / 1.55, `var(--fg-secondary)`, max-width 620px. Copy:
     > The search engine for premium used hand tools. Updated hourly from dealers, forums, auction houses, and marketplaces. We don't sell tools — we help you find them.
   - **Search input** (margin-top 44px):
     - Container: `max-width: 640px`, centered
     - Input: full width, `padding: 22px 150px 22px 58px`, `background: var(--bone-light)` (#F8F6F2), `border: 1.5px solid var(--spruce)`, `border-radius: 10px`, `box-shadow: 0 4px 20px rgba(12,28,30,0.08)`
     - Placeholder: `Try "Stanley No. 4 Type 11"` — Outfit 500, 17px, color `var(--fg-muted)`
     - Left icon: Lucide `Search`, 20px, color `var(--fg-secondary)`, absolute left 22px, vertically centered
     - Right button: Honey (`#D4AA60`) pill-ish rectangle — `padding: 0 22px`, `border-radius: 6px`, inset 8px from input edges top/right/bottom; contains "Search" + Lucide `ArrowRight` (14px); Outfit 600, 14px, color `var(--dark-teal)` (#0C1C1E)
   - **Suggestion chips** (margin-top 18px): centered flex row, gap 8px, wraps
     - Leading label: `POPULAR:` — Outfit 500, 11px, uppercase, `letter-spacing: 0.12em`, `var(--fg-muted)`
     - Chips: `padding: 5px 12px`, `border-radius: 4px`, `border: 1px solid var(--border)`, transparent background, Outfit 400 12px `var(--fg-primary)`
     - Copy: `Stanley No. 4`, `Lie-Nielsen 62`, `Veritas plow`, `Narex chisels`, `Disston D-8`, `Japanese kanna`

3. **Sources strip** (margin-top 88px from search, max-width 1100px, centered)
   - Eyebrow row: centered, flex, gap 12px. Outfit 700, 10px, uppercase, `letter-spacing: 0.22em`, `var(--fg-muted)`.
     - Pattern: `[1px-hairline, max-width 140px] — INDEXED FROM 24 SOURCES, INCLUDING — [1px-hairline]`
   - 7-column grid, divided by vertical 1px `var(--border)` rules, top + bottom 1px borders
     - Each cell: `padding: 22px 16px`, text-align center
     - Primary: Petrona 700, 14px, `letter-spacing: -0.3px`, `var(--dark-teal)`
     - Secondary (margin-top 4px): Outfit 400, 11px, `var(--fg-muted)`
   - Cells (left → right):
     | Primary | Secondary |
     |---|---|
     | Jim Bode Tools | Dealer · Katonah NY |
     | Patrick Leach | Monthly list · Since 1998 |
     | Hyperkitten | Josh Clark · Dealer |
     | Sawmill Creek | Forum classifieds |
     | Lumberjocks | Community listings |
     | r/handtools | Reddit · 148k members |
     | eBay | Curated searches |

4. **"Latest listings" section** (`padding: 72px 40px 100px`, max-width 1280px, centered)
   - Header row: flex, space-between, align-items flex-end, `padding-bottom: 20px`, `border-bottom: 1px solid var(--border)`
     - Left stack:
       - Eyebrow: `FRESH FROM THE INDEX` — Outfit 700, 10px, uppercase, `letter-spacing: 0.2em`, `var(--fg-muted)`, margin-bottom 8px
       - Title: "Latest listings" — Petrona 700, 36px, `letter-spacing: -1.2px`, `var(--dark-teal)`
     - Right: `Live — 18 new in the last hour` — Outfit 500, 12px, `var(--fg-secondary)`, with Lucide `Rss` icon (13px) in `var(--honey)` before the text
   - Grid: `grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))`, gap 20px — 6 **Result Cards** (see component spec below)

5. **Footer** — see footer spec.

---

### 2. Results State

**Purpose:** Deliver results. Keep search + filters always reachable. Make "Save alert" unmissable.

**Layout:**

1. **Sticky compact top bar** (replaces editorial header):
   - `position: sticky; top: 0; z-index: 50`
   - `background: rgba(242,240,235,0.92)` with `backdrop-filter: blur(10px)`
   - `border-bottom: 1px solid var(--border)`
   - Inner: max-width 1280px, `padding: 12px 40px`, flex row, gap 20px, align-items center
   - **Wordmark** (left, shrink-0): "Benchlot" — Petrona 900, 20px, `letter-spacing: -1px`, `var(--spruce)`
   - **Search input** (flex: 1, max-width 640px):
     - `padding: 10px 40px 10px 40px`, `background: var(--bone-light)`, `border: 1px solid var(--border)`, `border-radius: 8px`
     - Left: Lucide `Search` 16px, `var(--fg-secondary)`, absolute left 14px
     - Right: clear button (when query present) — 26×26px, `var(--fg-secondary)`, Lucide `X` 14px
     - Placeholder: `Search 4,892 listings across every source…` — Outfit 500, 14px
   - **Right group** (flex, gap 10px, shrink-0):
     - **Filters button**: `padding: 7px 12px`, `background: var(--bone-light)`, `border: 1px solid var(--border)`, `border-radius: 6px`, Outfit 500 12px `var(--dark-teal)`. Contains Lucide `Sliders` 14px + "Filters" + (if filter count > 0) Honey pill counter — `min-width: 18px`, `height: 18px`, `border-radius: 999px`, `background: var(--honey)`, `color: var(--dark-teal)`, Outfit 700 10px
     - **Sort select**: custom-styled native `<select>`, `padding: 7px 32px 7px 12px`, same bg/border/radius as Filters button, chevron icon on right. Options: `Newest first`, `Price: low to high`, `Price: high to low`, `Relevance`
     - 1px vertical divider (22px tall, `var(--border)`)
     - `Sign in` link — Outfit 500, 13px, `var(--spruce)`

2. **Breadcrumb / active-search bar** (below sticky header, not sticky itself):
   - `background: var(--bone)`, `border-bottom: 1px solid var(--border)`
   - Inner: max-width 1280px, `padding: 16px 40px`, flex row, gap 16px, align-items center, flex-wrap wrap
   - **Left stack** (flex 1, flex baseline, gap 10px, wraps):
     - Query echo: Petrona 700, 22px, `letter-spacing: -0.6px`, `var(--dark-teal)` — e.g., "Stanley No. 4"
     - Result count: `47 results` — Outfit 400, 13px, `var(--fg-secondary)`; number bolded to `var(--dark-teal)` weight 600
     - Divider dot `·` in `var(--fg-muted)`
     - Active filter chips (see chip spec below), gap 6px, wraps
   - **Right button** — "Save this search as an alert →":
     - `padding: 10px 18px`, `border-radius: 6px`
     - Default: `background: var(--honey)`, `color: var(--dark-teal)`, `border: 1px solid var(--honey-dark)`, `box-shadow: 0 1px 2px rgba(12,28,30,0.08)`, Outfit 600 13px
     - Contents: Lucide `Bell` 14px + "Save this search as an alert" + Lucide `ArrowRight` 14px
     - Saved state: `background: var(--success-bg)` (#D6ECE4), `color: var(--success)` (#2A6A4A), `border: 1px solid var(--success)`, shadow removed. Contents: Lucide `Check` 14px + "Alert saved"
     - Transition: `all 150ms`

3. **Main content** (max-width 1280px, `padding: 28px 40px 80px`, flex 1)
   - Two-column grid: `240px 1fr`, gap 40px, `align-items: flex-start`
   - **Left — Filter Rail** (width 240px, see component spec)
   - **Right — Results column**:
     - **Source-distribution strip** (see component spec) — margin-bottom 20px
     - **Results grid**: `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`, gap 20px, fills with Result Cards
     - **Load more** (margin-top 48px, text-align center):
       - Button: `padding: 12px 28px`, `background: var(--bone-light)`, `border: 1px solid var(--border-dark)`, `border-radius: 6px`, Outfit 600 13px `var(--spruce)`
       - Beneath (margin-top 14px): `Showing 12 of 47 results` — Outfit 400 12px `var(--fg-muted)`

4. **Footer** — same as empty state (see footer spec).

---

## Components

### Result Card

The workhorse component. One card per listing. Width stretches to grid cell (min 260px empty state, 280px results).

**Structure:**
```
<a>  (link, target=_blank, rel=noopener — opens source URL)
  <image-area>            aspect-ratio 4/3, cover background
    <source-badge/>       absolute top-left
    <posted-chip/>        absolute top-right
    <hover-action/>       absolute bottom-right (only on hover)
  <body>
    <row>  maker-label · condition-label
    <title/>
    <row>  price · location
    <divider/>
    <row>  "Listed at {source.name}" · "View source ↗"
```

**Styling:**
- Container: `background: var(--bone-light)`, `border: 1px solid var(--border)`, `border-radius: 10px`, `box-shadow: var(--shadow-card)` (0 2px 8px rgba(12,28,30,0.08)), overflow hidden
- Hover: `border-color: var(--border-dark)`, `box-shadow: var(--shadow-card-hover)` (0 4px 16px rgba(12,28,30,0.10)), `transform: translateY(-2px)`. Transition 200ms `cubic-bezier(0.2, 0.6, 0.2, 1)`
- Image area: `aspect-ratio: 4/3`, `background-size: cover`, `background-color: var(--bone-dark)` fallback
- Source badge (top-left, 10px inset): inline-flex, gap 6px, `padding: 4px 10px`, `border-radius: 4px`, `background: rgba(26,48,48,0.06)`, `border: 1px solid rgba(26,48,48,0.12)`, `color: var(--spruce)`, Outfit 500 11px, `letter-spacing: 0.02em`. Icon 12px (kind-dependent: `Store` for Dealer, `MessageSquare` for Forum, custom reddit glyph for Reddit, `Globe` for Marketplace, `Auction`/gavel for Auction). Followed by source `shortName`.
- Posted chip (top-right, 10px inset): `padding: 3px 8px`, `border-radius: 4px`, `background: rgba(12,28,30,0.78)`, `color: var(--bone)`, Outfit 500 10px, `letter-spacing: 0.02em`. Lucide `Clock` 10px + posted time (e.g. "2h ago").
- Hover action button (bottom-right, 10px inset, only visible on hover — fade + 4px translateY): `padding: 6px 10px`, `background: var(--bone)`, `border: 1px solid var(--border)`, `border-radius: 6px`, Outfit 500 11px `var(--spruce)`. Lucide `Bell` 11px + "Alert for similar". On click: `e.preventDefault(); e.stopPropagation(); onSaveAlert(listing)` so the card's outer link doesn't fire.
- Body padding: `14px 16px 16px`
- Top meta row: flex baseline, space-between
  - Maker label (left): Outfit 700, 10px, uppercase, `letter-spacing: 0.14em`, `var(--fg-muted)` — e.g., "STANLEY"
  - Condition label (right): Outfit 500, 10px, `letter-spacing: 0.02em`, `var(--fg-muted)` — e.g., "Good+"
- Title: Outfit 600, 16px / 1.3, `var(--dark-teal)`, `letter-spacing: -0.005em`, margin 0 0 10px — e.g., "Stanley No. 4 Type 11 Smoothing Plane"
- Price + location row: flex baseline, space-between, margin-bottom 10px
  - Price: Outfit 700, 20px, `var(--honey)`, `letter-spacing: -0.01em` — e.g., `$185`. Currency prefix can vary ($ or £).
  - Location: Outfit 400, 12px, `var(--fg-secondary)`, inline-flex gap 4, Lucide `Pin` 11px — e.g., "Portland, ME"
- Divider: `border-top: 1px solid var(--border-light)`, `padding-top: 10px`
- Footer row: flex, space-between, align-items center, Outfit 500 11px `var(--fg-secondary)`, `letter-spacing: 0.02em`
  - Left: colored 6px dot (Dealer #D4AA60, Forum #2A6A4A, Reddit #A83A2A, Marketplace #2A5A6A, Auction #6A4A2A) + "Listed at {source.name}"
  - Right: "View source" + Lucide `ExternalLink` 11px — `var(--spruce)` at rest, `var(--honey)` on card hover, transition 200ms

### Filter Rail (left rail)

Width 240px, `align-self: flex-start` (do not stretch to right column height).

- Header row: flex, space-between, align-items center, `padding-bottom: 16px`, `margin-bottom: 16px`, `border-bottom: 1px solid var(--border)`
  - Left: Lucide `Sliders` 14px + "Filters" — Petrona 700, 14px, `var(--dark-teal)`
  - Right: "Clear all" — Outfit 500 11px `var(--fg-secondary)`, text underlined, `text-underline-offset: 2px`, transparent bg/border
- **Filter groups** (each collapsible). Per group: `padding-bottom: 16px`, `margin-bottom: 16px`, `border-bottom: 1px solid var(--border-light)`.
  - Group header (clickable): full-width flex button, space-between. Label: Outfit 700, 10px, uppercase, `letter-spacing: 0.18em`, `var(--fg-secondary)`. Right: Lucide `ChevronDown` 12px — rotates -90deg when closed, transition 200ms. Margin-bottom 10px when open.
  - Rows: checkbox row, `padding: 4px 0`, flex, gap 8px. Native checkbox with `accent-color: var(--spruce)`. Label Outfit 400, 13px, `var(--fg-primary)`. Optional count suffix (right-aligned, flex 1 label, count right): Outfit 400 11px `var(--fg-muted)`.
- **Groups and options:**
  | Group | Options | Default open |
  |---|---|---|
  | Category | Hand Planes (2847), Chisels (1423), Hand Saws (982), Workholding (611), Sharpening (448), Marking & Measuring (392) + "+ 8 more" link | yes |
  | Maker | Stanley (1284), Lie-Nielsen (612), Veritas (488), Record (347), Disston (298), Narex (212), Sorby (148) | yes |
  | Condition | New / NOS, Like New, Excellent, Good, Project / Parts | yes |
  | Price | min + max number inputs side-by-side + "Range in current results: $48 – $385" helper | yes |
  | Source | Jim Bode Tools, Patrick Leach, Hyperkitten, Sawmill Creek, Lumberjocks, r/handtools, eBay, Auctions | yes |
  | Listing age | Last 24 hours, Last 3 days, Last 7 days, Last 30 days | **no** (collapsed) |
- "+ 8 more" link (in Category): Outfit 500 12px `var(--spruce)`, underline, underline-offset 2px, transparent button.
- Price input style: `padding: 7px 10px`, `border-radius: 6px`, `border: 1px solid var(--border)`, `background: var(--bone)`, Outfit 400 12px, placeholder `$ min` / `$ max`.

### Active filter chip (in breadcrumb)

- Inline-flex, `padding: 4px 6px 4px 10px`, `border-radius: 4px`, `background: var(--bone-light)`, `border: 1px solid var(--border)`, Outfit 500 12px `var(--dark-teal)`, `letter-spacing: 0.01em`
- Right: 16×16 remove button with Lucide `X` 10px, `var(--fg-secondary)`
- Example chips in mock: "Stanley" (maker), "Good" (condition)

### Source-distribution strip (above results grid)

Reinforces aggregator identity. 1-row summary of result mix across source kinds.

- `padding: 14px 18px`, `margin-bottom: 20px`, `background: var(--bone-light)`, `border: 1px solid var(--border)`, `border-radius: 10px`, flex row, gap 20px, flex-wrap wrap, align-items center.
- Left label: `ACROSS {N} SOURCE TYPES` — Outfit 700, 10px, uppercase, `letter-spacing: 0.2em`, `var(--fg-muted)`
- Middle: stacked proportional bar — `height: 8px`, `border-radius: 4px`, `background: var(--bone-dark)`. Child flex segments, one per kind present, `flex: count`, filled with kind color (same palette as card dot).
- Right: legend — flex, gap 14px, wraps. Per kind: 8×8 colored square (border-radius 2px) + "Dealer" + bold count in `var(--dark-teal)`. Outfit 500 11px `var(--fg-secondary)`.

### Footer

Three substantial columns. `background: var(--dark-teal)` (#0C1C1E), `color: var(--bone)`, `padding: 72px 40px 32px`.

Inner: max-width 1280px.

**Top row** (flex, space-between, align-flex-end, `padding-bottom: 48px`, `border-bottom: 1px solid rgba(242,240,235,0.1)`):
- Left stack:
  - "Benchlot" — Petrona 900, 40px, `letter-spacing: -2px`, `var(--bone)`, margin-bottom 10px
  - Tagline: "The search engine for premium used hand tools." — Petrona **500 italic**, 18px, color `var(--honey)`, `letter-spacing: -0.2px`
- Right (text-align right): Outfit 400, 13px, `rgba(242,240,235,0.65)`
  - Line 1: "Updated hourly · 4,892 listings live"
  - Line 2 (margin-top 4): "Made with care in Boston."

**Three columns** (grid `1.6fr 1fr 1.4fr`, gap 56px, `padding: 56px 0 48px`, border-bottom same as above):

Each column's eyebrow: Outfit 700, 10px, uppercase, `letter-spacing: 0.22em`, `color: var(--honey)`, margin-bottom 20px.

1. **Sources we index** (eyebrow "SOURCES WE INDEX")
   - 2-column grid, `gap: 8px 24px`, Outfit 400 13px, `rgba(242,240,235,0.75)`
   - Links: Jim Bode Tools, Patrick Leach, Hyperkitten, Josh Clark Tools, The Best Things, Tools for Working Wood, Sawmill Creek Classifieds, Lumberjocks For Sale, r/handtools, r/woodworking, WoodCentral, eBay (curated searches), Skinner Auctions, Bonhams, Brown Auctions, Martin J. Donnelly
   - Disclaimer below (margin-top 18px): "Benchlot does not broker transactions. Every listing links back to its original source." — Outfit 400 12px italic, `rgba(242,240,235,0.5)`, max-width 420px

2. **Benchlot** (eyebrow "BENCHLOT")
   - Vertical list, gap 10px, Outfit 400 13px, `rgba(242,240,235,0.75)`
   - Links: About, ToolScan, FAQ, Important Notes, Contact, Field Notes

3. **The Weekly Digest** (eyebrow "THE WEEKLY DIGEST")
   - Title: "The week's best new listings, in one email." — Petrona 700, 20px / 1.25, `var(--bone)`, `letter-spacing: -0.3px`, margin-bottom 10px
   - Body: Outfit 400 13px / 1.55, `rgba(242,240,235,0.65)`, margin-bottom 18px. Copy: "Hand-picked from every source we index. Sent Sunday mornings. Unsubscribe anytime."
   - Form: flex row, no gap, `border: 1px solid rgba(242,240,235,0.2)`, `border-radius: 8px`, overflow hidden
     - Input: flex 1, `padding: 11px 14px`, `background: rgba(242,240,235,0.06)`, no border, `color: var(--bone)`, Outfit 500 13px. Placeholder "you@shop.com"
     - Submit: `padding: 0 18px`, `background: var(--honey)`, `color: var(--dark-teal)`, Outfit 600 13px, text "Subscribe"
   - Helper (margin-top 12px): "12,400 woodworkers already subscribed." — Outfit 400 11px, `rgba(242,240,235,0.4)`

**Colophon** (flex, space-between, `padding-top: 24px`, Outfit 400 12px `rgba(242,240,235,0.5)`):
- Left: "© 2026 Benchlot, Inc. · An aggregator of public listings."
- Right: gap 24px — Privacy · Terms · DMCA · Accessibility

---

## Interactions & Behavior

**State transitions:**
- Page starts in **empty state** (no query, no filters).
- Any query change **or** any filter applied → **results state** immediately. No animation.
- Clearing the query AND all filters → empty state.
- Scrolling does NOT change state (contract with PM).

**Sticky behavior:**
- Results-state compact top bar: `position: sticky; top: 0`. Stays pinned through scroll. Breadcrumb strip scrolls away normally.

**Card click:**
- Opens `listing.sourceUrl` in a new tab (`target="_blank"`, `rel="noopener"`).
- The inner "Alert for similar" button must call `preventDefault()` + `stopPropagation()` so the outer link doesn't also fire.

**"Save this search as an alert" button:**
- Click → optimistic UI: flips to saved state (green bg `var(--success-bg)`, green text/border `var(--success)`, check icon, "Alert saved"). In production: POST to alerts API with current query + filter params; show toast on success; on failure, revert.
- Any subsequent filter change OR query edit → reset to unsaved state so user can save the new search.

**Filter toggles:**
- Checkbox click → toggle key in `filters[group]`. If true, include; if falsy, remove the key (don't leave `false` values dangling).
- Collapsible groups: click header to toggle. Chevron rotates -90deg when closed. Default-open per spec above.

**Sort:**
- Native `<select>`, options as listed. Default "Newest first".

**Suggestion chips (empty state):**
- Click → set query to chip text. Scroll to top. Enters results state.

**Search submit:**
- Empty-state big search: Enter key or Search button → commit query. If input empty, default to "Stanley No. 4" (demo behavior; production: don't submit empty).
- Sticky search: live-updates as user types (debounced in prod).

**Hover/active states:**
- Cards: see Result Card spec.
- Buttons: do not scale or bounce. Honey buttons go to `var(--honey-light)` on hover, `var(--honey-dark)` on active. Transitions 150ms.
- Nav links on light ground: resting `var(--fg-secondary)`, hover `var(--spruce)`.

**Persistence:**
- Persist `{ query, filters, sort }` to `localStorage['benchlot-agg-state']` on change. Rehydrate on mount. This is so refreshes during design review don't lose position.

**Scroll:**
- On state change (query cleared/entered, filter applied that flips state), `window.scrollTo({top:0})`.

---

## Responsive (brief)

Desktop-first at 1280px. For mobile (≤768px):
- Hero headline shrinks to ~40px.
- Sources strip becomes 2-row scroll or stacks (prefer stacking 7 items into 4 + 3 rows).
- Sticky top bar: wordmark stays, filters and sort collapse into a single "Filters" button that opens a bottom sheet containing the full filter rail.
- Filter rail → off-canvas/sheet on mobile.
- Results grid: `minmax(160px, 1fr)` for 2-up on phones.
- Footer columns stack vertically.

---

## State Management

```ts
type AppState = {
  query: string;               // current search string
  filters: {                   // nested map of toggled filter keys
    cat?:   Record<string, true>;
    maker?: Record<string, true>;
    cond?:  Record<string, true>;
    src?:   Record<string, true>;
    age?:   Record<string, true>;
    // price handled as {min?: number, max?: number} in prod
  };
  sort: 'Newest first' | 'Price: low to high' | 'Price: high to low' | 'Relevance';
  alertSaved: boolean;         // transient — resets when query/filters change
};

// Derived
const activeFilters = flatten(filters);         // {group, key, label}[]
const inResultsMode = query.trim() || activeFilters.length > 0;
```

**Data fetching (prod):**
- Search + filters debounced 250ms → GET `/api/listings?q=&maker[]=&cond[]=&source[]=&age=&sort=&page=`
- Returns `{ results: Listing[], totalCount: number, sourceDistribution: Record<Kind, number>, priceRange: [min, max] }`
- Load more: keyset pagination preferred over offset.

---

## Design Tokens

All tokens exist in the Benchlot design system (`colors_and_type.css` / `tailwind.config.js`). Do NOT invent new values.

**Colors**
| Token | Hex | Usage |
|---|---|---|
| `--spruce` | `#1A3030` | primary UI, wordmark on light, headings |
| `--spruce-light` | `#2A4A48` | — |
| `--spruce-dark` | `#0E2020` | — |
| `--bone` | `#F2F0EB` | page background |
| `--bone-light` | `#F8F6F2` | cards, inner surfaces |
| `--bone-dark` | `#E8E6E0` | hovers, soft fills |
| `--honey` | `#D4AA60` | CTAs, prices, accent |
| `--honey-light` | `#E0C080` | honey hover |
| `--honey-dark` | `#B08A40` | honey active / border |
| `--dark-teal` | `#0C1C1E` | body text, footer bg, text on Honey |
| `--fg-primary` | `#0C1C1E` | body text |
| `--fg-secondary` | `#4A5A54` | supporting copy |
| `--fg-muted` | `#8A8A80` | captions, placeholders |
| `--border` | `#E4E2DC` | default 1px |
| `--border-light` | `#ECEAE4` | soft dividers |
| `--border-dark` | `#D4D2CC` | hover borders, CTA borders |
| `--success` | `#2A6A4A` | "Alert saved" text |
| `--success-bg` | `#D6ECE4` | "Alert saved" fill |

**Source-kind accent palette (for dots + bar segments):**
| Kind | Color |
|---|---|
| Dealer | `#D4AA60` (Honey) |
| Forum | `#2A6A4A` |
| Reddit | `#A83A2A` |
| Marketplace | `#2A5A6A` |
| Auction | `#6A4A2A` |

**Typography**
- Display: **Petrona** (serif, variable 100–900 + italic). Weights used: 500 italic, 700, 800, 900.
- UI/Body: **Outfit** (sans). Weights used: 400, 500, 600, 700.
- Monospace: never needed here.

**Sizes used (px):**
- Hero headline 68 / Footer wordmark 40 / Section title 36 / Results query 22 / Digest title 20 / Card price 20 / Subhead 19 / Search input 17 / Card title 16 / Filter rail header 14 / Sticky search input 14 / Body 13 / Card footer 11 / Meta 10

**Letter-spacing:**
- Hero -2px, large display -1.2px, medium display -0.6px, wordmark (lg) -2px, wordmark (sm) -1px.
- Eyebrows 0.18–0.22em uppercase.
- Body 0.01–0.015em.

**Radii**
- 4px — tight pills (chips, source badges)
- 6px — small buttons, inputs
- 8px — standard buttons/inputs, digest form
- 10px — cards, distribution strip
- 999px — one use only: live-index chip

**Shadows**
- `--shadow-sm` 0 1px 2px rgba(12,28,30,0.05)
- `--shadow-card` 0 2px 8px rgba(12,28,30,0.08)
- `--shadow-card-hover` 0 4px 16px rgba(12,28,30,0.10)
- Search input hero shadow: 0 4px 20px rgba(12,28,30,0.08)
- Mode-toggle (not production): 0 8px 24px rgba(12,28,30,0.25), 0 2px 6px rgba(12,28,30,0.18) — discard

**Motion**
- All color/background transitions: 150ms `ease`
- Layout/transforms: 200ms `cubic-bezier(0.2, 0.6, 0.2, 1)`
- Chevron rotation: 200ms
- Live-dot pulse: `bl-pulse` keyframes, 2s infinite linear. 0% `opacity:0.25; scale:1`; 50% `opacity:0; scale:1.6`; 100% back to start.
- **No** scroll-triggered animations, parallax, bounce, or Lottie.

---

## Assets

- **Wordmark:** Petrona 900 set as text in markup (no SVG file needed for this screen's composition). If using an SVG file: `assets/benchlot-wordmark-spruce.svg` on the light editorial header; `assets/benchlot-wordmark-bone.svg` in the footer.
- **Icons:** `lucide-react` in production. Specific icons used: `Search`, `ArrowRight`, `Bell`, `Check`, `ChevronDown`, `Clock`, `ExternalLink`, `Filter`, `Globe`, `Pin` (MapPin), `Rss`, `Sliders` (SlidersHorizontal), `Store`, `X`. For Forum kind we used `MessageSquare`; for Auction kind there's no stock Lucide gavel — use a custom path or `Gavel` if available in your Lucide version, otherwise `Hammer`. For Reddit kind use a custom glyph (circle with two dots + smile + antenna) or the official Reddit brand mark with permission.
- **Images:** All card thumbnails in the mock use local warm-toned photography from `assets/images/` (category-planes.jpg, category-chisels.jpg, category-saws.jpg, etc.). In production, thumbnails are the first image from each source listing's scrape; fall back to a category placeholder. Use `object-fit: cover`, `aspect-ratio: 4/3`.

**Copy inventory (exact strings):** All copy in the spec above is final. Do not rephrase without PM approval. Specifically:
- "Every hand tool listing, in one place." (hero)
- "The search engine for premium used hand tools. Updated hourly from dealers, forums, auction houses, and marketplaces. We don't sell tools — we help you find them." (subhead)
- "Live Index · 4,892 listings · updated 14 min ago" (live chip; numbers are dynamic)
- "Save this search as an alert" (CTA)
- "Benchlot does not broker transactions. Every listing links back to its original source." (footer disclaimer — legally load-bearing; do not cut)
- "Made with care in Boston." (footer)

---

## Files in this handoff

- `Benchlot Homepage.html` — the main prototype; composes all screens via React state toggle at the bottom of the viewport.
- `Icons.jsx` — base Lucide icon components used by the prototype.
- `ExtraIcons.jsx` — additional Lucide icons (ExternalLink, Bell, Sliders, Clock, Rss, Globe, etc.) not in the base set.
- `Data.jsx` — source registry + sample listings. The source list, its `kind` classifications, and per-source dot colors are part of the spec.
- `ResultCard.jsx` — the Result Card component + SourceBadge helper.
- `FilterRail.jsx` — the left filter rail component.
- `Homepage.jsx` — editorial header, empty-state hero, sources strip, latest-listings section.
- `ResultsState.jsx` — sticky-bar + breadcrumb + results grid + distribution strip + footer.
- `colors_and_type.css` — the design token file (the source of truth for colors + type).
- `assets/` — wordmarks and sample imagery.
- `fonts/` — Petrona variable fonts (Outfit loads from Google Fonts).

---

## Notes for the implementing developer

- Reuse the existing Tailwind token mapping (`theme.extend.colors.spruce`, `bone`, `honey`, `darkTeal`) rather than hardcoding hex. The table above is for cross-checking.
- The `/marketplace` surface may still exist in the codebase — its filter rail structure is a good starting point, but the aggregator version has **Source** and **Listing age** groups that marketplace didn't have, and its cards link out (not to an internal detail page).
- Alerts are the retention mechanism — the Save-Alert button should **never** be demoted visually. Keep it Honey, keep it anchored to the breadcrumb strip.
- When in doubt on aesthetics: workshop journal, not SaaS dashboard. Petrona italic for editorial moments, Outfit 500 at 0.02em for UI, no emoji, no gradients beyond the one `bone → #ECE9E1` hero fade.
