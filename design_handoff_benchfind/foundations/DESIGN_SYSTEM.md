# Benchfind Design System

> **Benchfind** — confidence checks for used woodworking hand tools.
> Snap a photo or paste a URL. Get identification, condition, comps, and a verdict on whether it's a fair deal.

Carfax for used vehicles, Zillow for houses, **Benchfind** for used hand tools. A surface you *run* mid-decision at a flea market or sale, not a destination you visit.

This repo holds the complete visual identity, design tokens, copy guidelines, component primitives, and a click-thru UI kit for the marketing site + scan-result product.

---

## Provided sources

The user provided written context only — **no codebase, Figma file, or sample screens were attached**. Everything in this design system is created from scratch against the brief. If you have an existing codebase, design file, or visual reference, please attach it and we'll re-derive the foundations from it.

---

## Index

| File / folder | What it is |
|---|---|
| `colors_and_type.css` | Foundation CSS variables. Import this in any HTML to get tokens + utility classes. |
| `tailwind.config.js` | `theme.extend` block — paste straight into a Tailwind project. |
| `assets/` | Wordmark, mark, app icon, favicon, OG preview, plane silhouette. SVG. |
| `preview/*.html` | Small standalone cards that populate the Design System tab. |
| `ui_kits/web/` | React UI kit for benchfind.com — primitives + screens + click-thru `index.html`. |
| `SKILL.md` | Agent Skill manifest — drop into Claude Code as a reusable skill. |

---

## Brand principles

### Voice — *Trusted friend who knows tools.*
Specific, decision-led, occasionally dry. Verb-y. **"Snap a photo or paste a URL."** **"Is this a fair price?"** **"Looks like a Type 13 No. 4 in good shape — fair price for what it is."** Not encyclopedia. Not AI-magic. Confidence and speed, not "intelligence."

### Visual language — *Shop world meets decision world.*
Warm paper neutrals, deep spruce as primary accent with sparing warm brass for earned moments, Petrona serif display set in caps with a bold **FIND**, neutral sans body, mono numerals for type-study numbers and prices. Quiet radii (2–10px, no pills except badges), low warm shadows, hairline rules, photo-frame corner registration marks as the recurring brand motif. Should look like a document, not a SaaS dashboard. Should flatter dim-shop phone photography.

### What it isn't.
Not an AI-startup gradient. Not a chrome trade-show. Not a Pinterest mood board. Not Wirecutter editorial mass. Not a museum encyclopedia. **No bluish-purple gradients. No emoji. No "smart" / "intelligence" / "AI-powered" anywhere in user-facing copy.**

---

## CONTENT FUNDAMENTALS

### Tone
- **Specific over abstract.** "Type 13 No. 4 in good shape" beats "a great find."
- **Decision-led.** Every screen leads with what the user can do next. The page should help them buy or pass.
- **Occasionally dry.** Not jokey. Closer to a senior dealer's deadpan than a friendly chatbot. *"Above comp band."* Not *"Uh oh, looks pricey! 😬"*

### Person & casing
- **Second person, lowercase ambient copy.** "Check it before you buy." "What is this?"
- **Sentence case for titles**, *not* Title Case. Reserved title case for proper nouns (Stanley, Lie-Nielsen, Type 11).
- **The wordmark spelling is `Benchfind`** — capital B, lowercase rest, single word. Never abbreviated, never two words. **Display treatment** sets it in Petrona uppercase with a bold `FIND`: <strong>BENCH<strong>FIND</strong></strong>. Inline body copy keeps the mixed-case spelling. **Never**: `Bench Find`, `BenchFind`, `BENCH-FIND`, `B/F`, or `Bf`.
- **Numerals get respect.** Type numbers and prices are set in mono, never in body sans. `Type 11`, `$85–$140`.

### Voice samples (say this, not that)

| Say | Don't say |
|---|---|
| Snap a photo or paste a URL. | Get started with our AI tool scanner. |
| Is this a fair price? | Run a smart deal check. |
| Type 13 No. 4 in good shape — fair price. | Our intelligence has identified this item. |
| Take a frog area shot. | Image quality insufficient. Please retry. |
| Check it before you buy. | AI-powered tool intelligence. |
| Chisels & saws next. | Stay tuned for more categories! |

### Banned words & phrases
**AI-powered · intelligence · smart · ToolScan · deal check · seamless · effortless · revolutionary** — and any abstract or branded internal framing.

### Emoji
**No emoji in product UI.** Use Lucide icons for affordance, the spruce dot for confidence, and the "B" mark when a brand presence is needed. The only acceptable unicode glyph in body copy is the em-dash (—) and the multiplication sign (×) for dimensions ("14 × 2 in").

---

## VISUAL FOUNDATIONS

### Color
- **Paper** (warm off-white, `#FBF8F2`) is the page. **Never pure white** for backgrounds — pure white reads as Silicon Valley chrome.
- **Ink** (warm near-black, `#1B1714`) is the text. **Never pure black** — too cold against paper.
- **Spruce** (`#1F4D3A`) is the primary accent. Deep forest, the "shop world" green. Used for primary buttons, focus rings, photo-frame corner registration marks, confident links, and earned highlights. It is **never** decorative.
- **Brass** (`#B08938`) is a warm secondary highlight. Reserved for *earned* moments — a fair-price match, a verified type, the high-end of a comp band. The brass on a Stanley's depth wheel.
- **Iron** (cool slate) is reserved for quiet metadata. Use sparingly.
- **Rust** (`#A85427`) is kept in the system only as a semantic color (low-confidence, project condition). **No longer the primary accent.**
- **Confidence ramps** are semantic, **not** raw colors:
  - High → forest green (sibling to spruce — visually unified)
  - Medium → brass (warm caution)
  - Low → rust
- **Condition ramps** mirror confidence but are rendered as bordered pills, not filled.

### Type
- **Display: Newsreader** (Google Fonts) — editorial serif with optical sizing. Used at 24–76px for headlines, model names, section titles.
- **Body: Inter** — neutral, broadly available, reads at 13–17px. *Inter is on the "overused fonts" list — flagged as a starter; happy to swap to Söhne, Geist, or a licensed pair on request.*
- **Mono: JetBrains Mono** — for type numbers, comp prices, and any structured data. Mono is celebrated structured data — it does not whisper, it labels.
- Body line-height **1.55** (~150%). Display line-height **1.0–1.15**. Tracking **-2%** on display, **0** on body.

### Layout
- 4-pt spacing scale. Hard preference for **24px page gutter** on desktop, **24px content padding** on mobile.
- Content max width on landing: **980px**. On reference pages: **880px** with a **280px** rail.
- Result card max width: **880px**. Result-card *body* uses a **140 / 1fr / auto** header grid.
- Mobile tap targets ≥ **44 × 44 px** — non-negotiable in the scan flow.

### Backgrounds & imagery
- **No gradient backgrounds.** Paper-50 fields, paper-100 insets, paper-200 wells. Photography (tool photos) does the texture work.
- **No hand-drawn SVG illustrations** in product UI — use real photography. The plane silhouette in `assets/` is a brand mark only.
- **Photo placeholders** use a warm radial-light gradient over a dark-iron base — flatters phone snaps as well as studio shots.

### Animation
- **Quick, no bounce.** `120ms` for hover, `180ms` for state changes, `320ms` for big reveals.
- Easing is `cubic-bezier(0.2, 0, 0.2, 1)` — accelerate-in, decelerate-out. Never spring, never overshoot.
- The scan-result "reveal" animation is a soft rise-in, not a flip or a sweep.

### Hover & press
- **Buttons** — primary darkens to `spruce-900` on hover; secondary fills to `paper-100`; ghost fills to `paper-100`.
- **Links** — no underline by default, no color change on hover; darken from `ink-600` to `ink-900`. Underline only inside long-form reference pages.
- **Press** — no scale on press. Background darkens one step. Tool feel.

### Borders & shadows
- Hairline `1px` rule in `paper-300` (`#DDD2B9`) for table rows, section dividers, inset wells.
- **Shadows are warm and low.** `rgba(40, 30, 20, 0.06–0.10)`. **No bluish drop shadows.** No glow.
- Result cards use `shadow-md` (lifted but quiet). Modals use `shadow-lg`.

### Corners
- **2px** for badges and inputs that want a "stamped" feel.
- **6px** is the workhorse — cards, buttons, badges.
- **10px** for surface cards (result card body).
- **14px** only for the drop-zone (slightly softer to invite).
- **Pill** *only* for confidence/condition badges and toast pills.

### Transparency & blur
**Rarely.** A 92% paper-50 overlay on a sticky nav is acceptable when scrolled. **No glassmorphism**, no backdrop-blur for decoration.

### Imagery color vibe
Warm. Slight raked-light bias. We do not de-saturate or grain. Phone snaps in low light are part of the design language — components must look right with them.

---

## ICONOGRAPHY

**Library: [Lucide](https://lucide.dev/) (open source, no lock-in).**

- **Size**: 18px default, 22px in hero affordances, 14px in inline metadata.
- **Stroke width**: **1.75**. Heavier than Lucide's 1.5 default — reads as confident, not delicate.
- **Color**: inherits from `currentColor`. Default `ink-700`. Spruce is reserved for *actionable* affordances; never decorate with it.
- **No icon-only buttons** without an aria-label. Always pair with a text label on primary CTAs.

### Icons in use (canonical mapping)
- `camera` — "Use camera" / "Add photo"
- `upload` — "Upload photo"
- `link` — paste-URL field, share permalink
- `check-circle-2` — "Looks right" correction, verdict confirmed
- `circle-help` — unknown verdict, "How'd we do?"
- `trending-up` / `trending-down` — verdict above/below comp band
- `share-2` — share permalink
- `bookmark` — save to history
- `search` — reference search
- `info` — metadata callout
- `chevron-right` — disclosure, breadcrumb separators

### Brand glyphs (not icons)
- The wordmark is set in **Petrona uppercase, regular BENCH + bold FIND**. The bold emphasis on `FIND` is the brand's typographic signature — don't reverse the weight order, don't bold both halves, don't restyle elsewhere.
- **Photo-frame corner registration marks** (in spruce) wrap the wordmark at all sizes. Hero scale uses *two diagonal corners* (top-left + bottom-right) for breathing room; smaller scales use all four.
- The square "B" stamp from `app-icon.svg` is the mark — used in the favicon, app icon, and as a wordless avatar in compact spaces (mobile sticky nav, social previews). The mark carries its own four-corner registration.
- **Recurring motif**: a graduated measurement rule (`assets/motif-rule.svg`) appears under section headings, behind the comp-price-range axis, and in plane diagrams. It is the brand fingerprint that says *precision, measurement, type-study*.

### Substitution notice
- We use **Lucide via CDN**. If you bring an existing icon set (Phosphor, Tabler, custom), swap globally — every icon usage in the UI kit is colocated in the `Primitives.jsx` `<I />` component.
- **Fonts on this design system are Google Fonts substitutions** (Newsreader, Inter, JetBrains Mono) standing in for the brief's blank-slate type request. If you have a licensed display serif you'd rather use (Tiempos, GT Sectra, Source Serif Pro), please attach it and we'll swap.

---

## Decisions log

| # | Decision | Why |
|---|---|---|
| 1 | Paper-50 background, never pure white | "Decision world" surfaces (Carfax/Zillow) are white; the shop world is warm. We pick warm — it's our tiebreaker. |
| 2 | Spruce primary + brass highlight, rust demoted to semantic | Spruce reads tool-shop, not startup. One warm note (brass) for earned moments, never two. |
| 3 | Serif display, sans body, mono numerals | Editorial credibility + technical clarity. Mono for structured data is the "Type 11" hero treatment the brief asks for. |
| 4 | Confidence as filled pill, condition as outlined pill | Visual hierarchy: confidence is the headline judgment, condition is a sub-fact. |
| 5 | No gradient backgrounds, no glassmorphism | Both read as AI-startup. We explicitly avoid them. |
| 6 | Mono ≥ 12px, body ≥ 13px, hit targets ≥ 44px | Mobile-first on the scan flow, in field conditions, on small phones. |
| 7 | Lucide via CDN | Brief says no icon-library lock-in; Lucide is the lowest-friction choice. Swap by editing one component. |

---

## Accessibility minimums

- **Contrast**: ink-900 on paper-50 = 14.5:1 (AAA). Spruce-700 on paper-50 = 8.8:1 (AAA). Brass-700 on paper-50 = 4.9:1 (AA). Confidence-medium brass on its bg = 4.5:1 (AA).
- **Focus rings**: `0 0 0 3px rgba(31, 77, 58, 0.20)` (spruce alpha) on every interactive element. Never `outline: none` without a replacement.
- **Hit targets**: 44px min height on mobile (`min-h-tap` token). Primary buttons default to 44px; ghost links use `padding` to hit it.
- **Reduced motion**: respect `prefers-reduced-motion` — disable the scan-reveal rise-in, swap to a 0ms opacity transition.
- **Color independence**: every confidence and condition badge is `dot + word + color`. The dot or border carries the meaning if color is lost.

---

## Get started in code

```bash
# Use the foundations
<link rel="stylesheet" href="colors_and_type.css">
# Or paste tailwind.config.js theme.extend block
```

```jsx
// Use the UI kit
<script src="https://unpkg.com/lucide@0.453.0/dist/umd/lucide.min.js"></script>
<script type="text/babel" src="ui_kits/web/Primitives.jsx"></script>
<script type="text/babel" src="ui_kits/web/Chrome.jsx"></script>
<script type="text/babel" src="ui_kits/web/Landing.jsx"></script>
<script type="text/babel" src="ui_kits/web/ScanResult.jsx"></script>
<script type="text/babel" src="ui_kits/web/Screens.jsx"></script>
```

Open `ui_kits/web/index.html` for the click-thru kit.
