# Benchlot — Brand Exploration Brief

*Updated 2026-05-07. For Claude Design or any external collaborator helping with brand & visual exploration.*

---

## What Benchlot is right now

Benchlot is the **last-mile confidence check before a tool purchase** for woodworkers buying used hand tools — vintage Stanley planes, Lie-Nielsens, Disston saws, Bedrocks, the whole world of pre-owned woodworking gear.

Functionally: snap a photo or paste a listing URL → instantly know what it is, what it's worth, and whether the seller has it priced fairly. Aggregates listings across dealers, forums, eBay, and Reddit; layers a comp engine and AI identification on top so the user can decide with confidence.

Mental model the brand should evoke — what people *do* with it, not what it *is*:

- **Carfax** before buying a used car
- **Zillow** while house-hunting
- **Wirecutter** before any consumer purchase
- **Glassdoor** before accepting a job
- **Kayak / Google Flights** before booking travel

These aren't destinations people *visit* — they're checks people *run* mid-decision. Benchlot is the same pattern, in woodworking. The reflex we're chasing: *"before I buy a plane, I check Benchlot."*

---

## How we got here (short version)

Benchlot started as a P2P marketplace for used tools. Over the last several months it pivoted twice:

1. **Marketplace → aggregator** (early 2026) — instead of brokering transactions, index listings across the web and click out to source. Reduced operational complexity; freed up the strategic question of *what unique value Benchlot adds.*
2. **Aggregator → confidence layer** (May 2026) — aggregation continues but as plumbing, not the product. The user-visible product is the **intelligence/decision layer** above the listings: identification, comp engine, variant-level pricing, a verdict on any specific listing.

The *internal* framing is "intelligence layer for woodworkers." That phrase **never appears in user-facing copy** — it's investor / architecture language. Externally everything is about confidence and decisions: "Is this a fair price?" / "What is this?" / "Should I buy this one?"

---

## Audience

The bullseye user — who we design for, and who currently isn't well served:

- **Modern hobbyist woodworker**, 25–45, lives in two worlds: laptop on the Roubo workbench, YouTube playing while practicing dovetails, a Festool Domino sitting next to a 1925 Stanley #5.
- Has a tech / knowledge-work day job. Treats software as a tool, not a treat.
- Cares deeply about the craft *and* expects modern software to meet them where they are. Today's options bottom out at long-form reference text (Patrick Leach's *Blood & Gore*, dealer catalogs, forum threads).
- Buys used because it's how serious tool users build collections; comfortable on eBay, Facebook Marketplace, Reddit, dealer sites — but *uncertain* about pricing and identification.

Secondary audience: older traditional woodworker who has come along quietly because the value (faster identification, real comps) is undeniable.

**Anti-audience:** beginner woodworker buying their first new tool from Home Depot. Not for them. We'd actively rather not pretend.

---

## Voice and tone

**Trusted friend who knows tools.** Not encyclopedia. Not guru. Not tech-bro.

| ✓ | ✗ |
|---|---|
| "Looks like a fair price." | "Pricing analysis: median $145" |
| "Type 11 — sweet spot for users." | "Stanley Bench Plane, Type Study 11 (1910–1918, n=23)" |
| "Three cheaper ones currently listed." | "Optimization opportunity detected" |
| "Snap a photo or paste a URL." | "Get AI-powered tool intelligence" |
| Short. Specific. A peer talking. | Hedged, encyclopedic, abstract. |

The community we're serving is *earnest about process* — they value care in how things are made, including software. Anything that feels carelessly thrown together, gamified, or tech-bro'd is corrosive. No badges, streaks, leaderboards. No fake urgency. No "AI-powered" marketing language. Respect the heritage.

---

## Visual brand — what's settled, what's open

### Settled (don't break these)

- **Name:** Benchlot
- **Palette** (from existing `tailwind.config.js` and `src/styles/design-system.css`):
  - **Spruce** `#1a3030` — primary dark, used for headings and dark surfaces
  - **Bone** `#f2f0eb` — primary background (never pure white)
  - **Honey** `#d4aa60` — accent / prices / CTAs
  - **Dark Teal** `#0c1c1e` — text on light surfaces (never pure black)
- **Typography:**
  - **Petrona** (serif) — display / headings
  - **Outfit** (sans) — body / UI
- **Hard rules:** never pure white backgrounds, never pure black text, prices always in Honey, button text on Honey is always Dark Teal.

### Open for exploration

These are the surfaces where Benchlot most needs design help:

1. **The unified Check page (highest priority).** The new `/check` surface is the viral wedge. A user lands, drops a photo or pastes an eBay URL, and gets back: identification + price verdict + comp range + cheaper alternatives + share permalink. Single input, two modalities. Result UI shared across both. Need: input affordance design, verdict badge / color system, alternatives layout, share-link UX. This is the page users will share in Discord and Reddit — "benchlot says this is asking high" — so it needs to feel quotable and visually clean even when screenshotted.

2. **Canonical type pages (`/planes/stanley/no-5/type-11`).** Already shipped functionally — see live behind `PLANE_PAGES_ENABLED` flag. Currently uses inline-style scaffolding from the legacy price-guide page. Needs a real visual treatment: hero, type-study facts block, comp distribution, currently-for-sale grid, recent-sold list. Pattern to design once and apply across hundreds of variant pages (each Stanley bench plane × each type number).

3. **Homepage (`/`) hero.** Currently the aggregator listings grid. Long-term we want the unified check input to live here too — but that's a separate UX shift. For now the homepage is functional but unbranded; it needs a hero treatment that signals what Benchlot is *for*, not just what it shows.

4. **Verdict badges / color system.** When the page tells you a listing is a good deal, fair price, or overpriced — what does that look like? Color (green / neutral / red) is the obvious move but it should feel like a friend's opinion, not a Yelp star rating.

5. **Result-card composability.** The check page result shares a lot with the type page (comp distribution, alternatives grid, listing summary). Want a design system that lets these compose cleanly without each page reinventing.

---

## What to specifically AVOID

- **Tech-bro / "AI" branding.** No glowing gradients, no "powered by AI" badges, no chat-style interfaces. The intelligence is invisible plumbing; the surface is plain.
- **Gamification.** No badges, levels, streaks, leaderboards, "expert" tiers. The community will recoil.
- **Marketplace UI patterns.** Benchlot doesn't sell things. Don't borrow Etsy / Amazon / eBay shopping-cart aesthetics. We click users *out* to source.
- **Encyclopedia density.** Existing references (Blood & Gore, dealer catalogs) are wall-of-text. The whole reason Benchlot exists is they're hard to scan. Lean toward scannable / quotable / glanceable.
- **Pure white backgrounds, pure black text.** Bone and Dark Teal, always.
- **Borrowed type studies.** No Inter, no SF Pro, no Helvetica. Petrona + Outfit are part of the brand.
- **Stock photography / generic woodworking imagery.** Real tool photos when we use photos at all.

---

## Reference points for visual exploration

Comp brands worth looking at for *aesthetic direction* (not feature copying):

- **Carfax** — utility-first, no nonsense, builds trust through clarity
- **Wirecutter** — opinionated voice, scannable layout, pure utility
- **Are.na** — quiet, considered, design-aware
- **Linear** — modern software craft, no tech-bro sheen
- **Rog Mahal / Crucible Tool Works / Lost Art Press** — woodworking-adjacent brands that earn trust by *not* trying too hard

Anti-comps (avoid these vibes):

- Big-box e-commerce (Home Depot, Amazon)
- "AI for X" startups (the glowing-gradient class)
- Marketplace UIs (eBay, Etsy, OfferUp)
- Hobbyist forum software (vBulletin, MyBB — the frame Benchlot is replacing)

---

## What's been shipped (so you know the surface area)

Live or behind feature flags as of 2026-05-07:

- 11 listing sources continuously aggregated (Jim Bode, Hyperkitten, Sawmill Creek, Woodnet, eBay, Reddit, others)
- LLM normalizer that tags every listing with canonical brand / type / model / Stanley plane type number
- Comp engine producing per-variant price clusters (sold + asking, by source kind: Dealer / Marketplace / Forum)
- 348 type-fine clusters for Stanley bench planes (e.g., *No. 5 Type 11 sold n=13, p50=$115*)
- ToolScan: photo → identification (live at `/scan`)
- Canonical type pages: live at `/planes/{brand}/{model}/{type}` (behind flag — currently using legacy price-guide visual scaffold)

Up next:

- Unified Check page (`/check`) — URL-paste + photo upload, shared result UI
- Visual treatment refresh for type pages
- Eventual homepage hero integration

---

## Open questions for design exploration

The questions where we'd love a fresh visual perspective:

1. What does a **verdict badge** look like that says "this is a great deal" without feeling like a sticker on a used-car windshield?
2. How does the **unified input** (photo OR URL) feel like one affordance rather than two competing options?
3. Can the **comp distribution** be visceral and quotable in a single glance — something a user would screenshot and share?
4. What's the **page architecture** for canonical type pages that scales to hundreds of variant URLs without feeling generic?
5. Is there a **wordmark / logotype** moment? Current treatment is type-only Petrona. Does Benchlot need a mark — and if so, how does it sit alongside the existing palette?
6. **Photography vs. illustration vs. neither** — how does Benchlot show tools? eBay-style listing photos look like e-commerce. Studio shots feel pretentious. Is there a third path?

---

## Quick technical context (in case it helps)

Stack: React / Tailwind on the front end, Firebase Functions + Firestore on the back. All pages render via React Router. New visual work can land as either inline-style components (matching the current pattern) or new Tailwind utility classes — designer's call. The site is live at `benchlot.com` but the new surfaces (`/planes/...`, eventually `/check`) are gated behind feature flags during exploration.

If a visual idea is more ambitious than React/Tailwind can quickly express, mock it; we'll figure out implementation later. Brand exploration first; engineering catches up.
