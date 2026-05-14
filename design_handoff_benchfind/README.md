# Handoff — Benchfind Web (Marketing + Scan Result Product)

## Overview

**Benchfind** is a confidence-check product for people buying used woodworking hand tools. Snap a photo or paste a listing URL → get identification (Stanley typology / Lie-Nielsen / Veritas / etc.), condition, comp prices, and a verdict on whether it's a fair deal. Plane-first today; chisels and saws next.

This bundle contains the full visual identity, design tokens, brand-voice rules, and a React reference implementation for the marketing site (`benchfind.com`) and the scan-result product surface.

---

## About the design files

Everything in `react_reference/` is a **design reference**, not production code. The JSX components were written to demonstrate intended look, layout, structure, and interaction — they hard-code state, fake the scan flow, and use inline styles instead of a Tailwind runtime. **Do not copy them directly into production.** Instead, recreate each surface in the target codebase's environment (React + Tailwind, Next.js, etc.), using its established component patterns and matching the visuals pixel-for-pixel.

If the target codebase doesn't have a frontend stack yet, **React + Tailwind 3.x + Lucide icons** is the recommended starting point — every token, component, and pattern in this handoff is designed to map cleanly to it.

## Fidelity

**High-fidelity.** Final colors, typography, spacing, motion, and component anatomy are locked. Specifically:

- Color tokens are final (paper, ink, spruce, brass, semantic ramps)
- Type system is final (Petrona + Inter + JetBrains Mono via Google Fonts)
- Wordmark display is final: **BENCH** + bold **FIND** in Petrona uppercase with spruce photo-frame corner registration marks
- Spacing, radii, shadow, and motion scales are final
- All component anatomies are pinned in `react_reference/`

What is **not yet** in this bundle: real photography (the kit uses warm SVG placeholders that simulate studio / amateur / dim-phone capture conditions), a designed mobile breakpoint for every screen (foundations & components are mobile-ready; full mobile compositions for landing and result are flagged below), and the email-template surface.

---

## What's in this bundle

```
design_handoff_benchfind/
├─ README.md                          ← you are here
├─ SKILL.md                           ← Claude Code skill manifest (drop into ~/.claude/skills/)
├─ foundations/
│  ├─ DESIGN_SYSTEM.md                ← brand principles, voice, visual foundations, iconography
│  ├─ colors_and_type.css             ← all CSS custom properties + utility classes
│  └─ tailwind.config.js              ← paste-ready theme.extend block
├─ assets/                            ← all brand SVGs
│  ├─ logo-wordmark.svg               ← BENCHFIND wordmark on paper
│  ├─ logo-wordmark-onlight-inverse.svg
│  ├─ logo-mark.svg                   ← B-stamp mark with spruce corners
│  ├─ logo-lockup.svg                 ← mark + wordmark side by side
│  ├─ app-icon.svg                    ← 512×512 ink plate, serif B, spruce corners
│  ├─ favicon.svg                     ← 32×32 mark
│  ├─ og-preview.svg                  ← 1200×630 social card
│  ├─ motif-rule.svg                  ← signature graduated rule (tileable)
│  ├─ motif-paper-grain.svg           ← warm paper grain (subtle bg)
│  ├─ illustration-plane-silhouette.svg
│  ├─ diagram-plane-annotated.svg     ← /planes reference figure with callouts
│  ├─ photo-studio.svg                ← photo placeholder, studio quality
│  ├─ photo-amateur.svg               ← photo placeholder, workbench/amateur
│  └─ photo-dim-phone.svg             ← photo placeholder, dim flea-market phone snap
└─ react_reference/
   ├─ README.md                       ← component anatomy notes
   ├─ index.html                      ← run this in a browser to see the click-thru kit
   ├─ Primitives.jsx                  ← Wordmark, Button, badges, TextInput, Card, ToolPhoto, I (Lucide)
   ├─ Chrome.jsx                      ← NavBar, Footer
   ├─ Landing.jsx                     ← Hero, DropZone
   ├─ ScanResult.jsx                  ← ScanResultHeader, ResultSection, CompPriceRange, ListingTile, NextPhotoHint, VerdictBanner, CorrectionFlow
   └─ Screens.jsx                     ← LandingScreen, ScanResultScreen, ReferenceScreen, CategoryGateScreen
```

**To preview the kit**, run a static server in `react_reference/` (e.g. `npx serve .`) and open `index.html`. Source-of-truth implementations live in the JSX files; React + Babel are loaded from CDN — no install needed.

---

## Design tokens

### Colors

All semantic colors map to a raw family + numeric stop. Use semantic aliases (`bg`, `fg-body`, `accent`) in component code; drop to raw stops only when no semantic role fits.

```js
// Paste into tailwind.config.js — full block in foundations/tailwind.config.js
paper:  { 50: '#FBF8F2', 100: '#F6F1E7', 200: '#ECE4D2', 300: '#DDD2B9', 400: '#C2B393' }
ink:    { 900: '#1B1714', 800: '#2A2420', 700: '#3D3631', 600: '#5A514A', 500: '#7A6F66', 400: '#9B9189' }
spruce: { 50: '#EEF4F0', 100: '#E0EBE4', 300: '#94B3A2', 500: '#2F6B52', 700: '#1F4D3A', 900: '#143527' } // 700 = primary
brass:  { 100: '#F0E3C3', 500: '#B08938', 700: '#8C6B22' }                                                // sparing highlight
rust:   { 50: '#FBF0E4', 100: '#F5E3D2', 300: '#E2B895', 500: '#B86631', 600: '#A85427', 700: '#8A4419' } // semantic-only
iron:   { 300: '#B4B8BB', 500: '#6B7178', 700: '#3C4348' }
conf:   { high: '#2F6B3D', 'high-bg': '#E4EFE2',
          medium: '#8C6B22', 'medium-bg': '#F0E3C3',
          low: '#8A4419', 'low-bg': '#F5E3D2' }
cond:   { excellent: '#2F6B3D', good: '#4F8A7A', fair: '#8C6B22', project: '#8A4419' }
danger: '#B0321F' (bg: '#F7DDD6')
```

**Hard rules:**
- **Never pure white** — always `paper-50` (`#FBF8F2`).
- **Never pure black** — always `ink-900` (`#1B1714`).
- **Spruce is primary.** Use for buttons, focus rings, frame corners, confident links, earned moments.
- **Brass is sparing.** Reserved for fair-price match, verified type, high-end of comp band, medium-confidence.
- **Rust is semantic-only.** Low confidence + project condition. Do not use as a primary color.
- **No bluish drop shadows.** All shadow alphas use warm RGB (`rgba(40,30,20, …)`).

### Type

```js
fontFamily: {
  display: ['Petrona', 'Newsreader', 'Georgia', 'serif'],     // serif — headlines, model names, section titles
  sans:    ['Inter', 'system-ui', 'sans-serif'],              // body
  mono:    ['JetBrains Mono', 'ui-monospace', 'monospace'],   // type numbers, comp prices, structured data
}
```

All three fonts are free from Google Fonts. **Load these subsets in the head** of every page:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Petrona:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

**Scale** (px, with line-height defaults):
- `xs 12px / 1.4` · `sm 13px / 1.5` · `base 15px / 1.55` · `md 17px / 1.55`
- `lg 20px / 1.4` · `xl 24px / 1.3` · `2xl 30px / 1.25` · `3xl 38px / 1.2`
- `4xl 48px / 1.1` · `5xl 60px / 1.05` · `6xl 76px / 1.0` (with `letter-spacing: -0.02em`)

**Body min 13px. Mobile body 15px. Type numbers / prices ≥ 12px in mono.**

### Spacing, radii, shadow, motion

```js
spacing:       4-pt scale (Tailwind defaults + `tap: 44px`, `gutter: 24px`, `gutter-lg: 48px`, `page-x: 24px`, `page-x-lg: 64px`)
borderRadius:  xs 2px · sm 4px · md 6px (default) · lg 10px · xl 14px · pill 999px
boxShadow:
  sm:       0 1px 2px rgba(40,30,20,.06), 0 1px 1px rgba(40,30,20,.04)
  md:       0 2px 6px rgba(40,30,20,.08), 0 1px 2px rgba(40,30,20,.04)
  lg:       0 8px 24px rgba(40,30,20,.10), 0 2px 6px rgba(40,30,20,.06)
  hairline: inset 0 0 0 1px #DDD2B9
  focus:    0 0 0 3px rgba(31,77,58,.20)         // spruce alpha
transitionDuration: fast 120ms / DEFAULT 180ms / slow 320ms
transitionTimingFunction: standard cubic-bezier(0.2, 0, 0.2, 1) / emphasis cubic-bezier(0.2, 0, 0, 1)
```

---

## Wordmark (display rule)

The wordmark display is set as **BENCH** (Petrona regular) + **FIND** (Petrona bold), uppercase, with `letter-spacing: 0.06em`. Wrapped by **spruce photo-frame corner registration marks** — four corners at small scales (favicon, nav), two diagonal corners (top-left + bottom-right) at hero scale.

**Spelling in code, alt text, social media, body copy:** `Benchfind` (capital B, lowercase rest, single word, no spaces, no hyphens). The display caps treatment only applies to the *rendered* wordmark — not to references in prose.

**Never:** `BenchFind`, `Bench Find`, `BENCH-FIND`, `B/F`, `Bf`, "Bench".

See `react_reference/Primitives.jsx` → `Wordmark` for the canonical implementation. SVG fallbacks are in `assets/logo-wordmark.svg` etc. for places where Petrona can't be loaded (email, OG previews).

---

## Screens

### 1. Landing — `/`

**Purpose:** Drop-zone hero, marketing copy, conversion to scan.

**Layout (desktop):**
- Navigation bar — `paper-50` background, `paper-200` bottom hairline, 18px top/bottom padding, 32px side padding
  - Wordmark left (24px size with four corners)
  - Nav links: "Check a tool" (active), "Planes", "Reference"
  - Right: "Sign in" link + primary "Scan a tool" button with `camera` icon
- Hero — two-column 1fr/1fr, 56px column gap, 980px max-width
  - **Left column**: eyebrow pill (`Plane-first today` with spruce dot), display `Check it before you buy.` (Petrona 64px, line-height 1.0, italic spruce `buy`), 17px body subtitle, two mono stats (`1,840 Stanley type studies indexed`, `90 days rolling comp window`).
  - **Right column**: `<DropZone>` — white card, 14px radius, 1.5px dashed `rule-strong` border (becomes 1.5px solid spruce on drag-over, with `spruce-50` fill). Contains: 56px ink B-mark, headline `Snap a photo or paste a URL.`, body subtitle `Get identification, condition, comps, and a verdict. Usually in 8 seconds.`, primary `Use camera` + secondary `Upload photo` buttons, divider `OR PASTE A URL`, URL input with `link` icon + `Check it` button, footnote `Works with eBay, Craigslist, Facebook Marketplace, Etsy`.
- "What you get back" — three-up card grid (1fr 1fr 1fr, 16px gap, white cards with 1px paper-200 inset). Each card: mono `01`/`02`/`03` in spruce, Petrona 22px title, 14px Inter body.
- "Lately on Benchfind" — four-up plane preview grid (4/3 photo + maker name + type badge + condition badge).
- Footer — paper background, paper-200 top hairline. 4 columns: wordmark + tagline / Product / Reference / About. Tiny copyright + URL rule below.

**Mobile (target ≥ 360px wide):** drop-zone fills width, hero stacks single-column, `Plane-first today` eyebrow stays full-width, nav collapses to wordmark + hamburger.

### 2. Scan result · High confidence

**Purpose:** The output document. Should look shareable.

**Layout:** centered `880px` max-width column on paper-50.

- Breadcrumb: `← Back · Scanned just now` (mono).
- Result card — white, 14px radius, `shadow-md`.
  - **Header**: 140px / 1fr / auto grid. 140px square photo (rounded 6px), category badge + era, Petrona 36px `Stanley No. 5`, type badge `Type 11` (mono on ink plate) + condition pill `Excellent`, `High confidence` filled pill (green) + share icon.
  - **Verdict section**: `VerdictBanner` filled pill (`Fair price for what it is` with `check-circle-2`), then body paragraph.
  - **What it should cost**: `CompPriceRange` (patina band on paper-200 track, black tick for listing price, range label `$85 – $140` with the high end in brass, verdict tail line "Listed at $110 · fair price for what it is.").
  - **Currently for sale**: 3 × `ListingTile` (60px photo / 1fr title+meta / mono price).
  - **Reference**: link tile to the type-study reference page.
- Card footer: `CorrectionFlow` (Looks right / Make corrections) + Save / Scan another buttons.

**Every section heading is followed by the signature `motif-rule.svg`** at 60% opacity.

### 3. Scan result · Medium confidence + next-photo hint

Same shape as the High variant, but:
- Type badge reads `Type 11?` (with the question mark)
- Era widens to `1907–1918`
- Confidence pill is medium-brass
- A new section appears between Verdict and Comp range: **"To get to High"** — contains `<NextPhotoHint area="frog area" />` which is a spruce-tinted card (spruce-100 bg, 1px spruce-300 inset) with a numbered `2` chip, "Take a frog area shot" title, body, and primary "Add photo" button. **This must read as an upgrade path, not a failure.**

### 4. Plane reference — `/planes/stanley/no-5/type-11`

**Purpose:** Long-form type-study editorial. SEO compounding asset.

**Layout:** 880px max-width with a 280px right rail.
- Breadcrumb chain.
- Category badge + era; Petrona 48px title; Petrona italic 21px lede paragraph.
- **Annotated figure** — `figure` with caption `Fig. 1 · Type-defining features` (left) and dimensions `side profile · 14"` (right, mono); the figure body is `assets/diagram-plane-annotated.svg` (the annotated line-art plane with rust callouts pointing at frog, knob, tote, lever cap, etc.).
- **Main column**: H2 "How to identify" with bulleted list; H2 "Common misidentifications" with body prose.
- **Right rail**:
  - "At a glance" card: dl with era, length, iron, comp band (all dt's in `ink-500` 12px, dd's in mono 12px).
  - "For sale now · 14" card: 2 × `ListingTile`s, "View all" link.

### 5. Category gate — `/chisels` (or any not-yet category)

Centered narrow column (580px), paper-50:
- Eyebrow `Not yet — but soon` in spruce.
- Petrona 44px headline `Benchfind is plane-first today.`
- Body subtitle.
- 2×3 grid of category status pills (`Bench planes / Block planes` = `confHigh-bg`+`live`; `Chisels / Saws` = `spruce-100`+`next`; `Spokeshaves / Routers` = white+`queued`).
- Email capture form: text input + `Notify me` button. On submit, the form disappears and a "We'll write you. One email, no marketing." line appears in patina.

### 6. (Shared) Share permalink view

Same as the High-confidence scan-result, but **with the nav hidden** so it looks like a clean document. Use as the canonical view embedded under `/r/<scan-id>`. Social previews use `assets/og-preview.svg` (flatten to PNG for production).

---

## Components

Each component lives in `react_reference/Primitives.jsx`, `Chrome.jsx`, `Landing.jsx`, `ScanResult.jsx`, or `Screens.jsx`. Re-implement using the host codebase's primitives; match anatomy and tokens exactly.

| Component | Props | Notes |
|---|---|---|
| `Wordmark` | `size`, `color`, `accent`, `frame`, `hero` | BENCH + bold FIND in Petrona caps, spruce corner marks. 2 diagonal corners when `hero`, 4 corners otherwise. |
| `Mark` | `size` | The B-stamp from `logo-mark.svg`. |
| `Button` | `variant: 'primary'\|'secondary'\|'ghost'\|'danger'`, `size: 'sm'\|'md'\|'lg'`, `icon` (Lucide name) | Primary = spruce-700 / paper-50. Secondary = transparent / rule-strong border. Ghost = no chrome. Min height 44px (md+), 36px (sm). Hover darkens one step. |
| `ConfidenceBadge` | `level: 'high'\|'medium'\|'low'` | Filled pill (bg + fg from conf ramp). Always has a leading dot. |
| `ConditionBadge` | `level: 'excellent'\|'good'\|'fair'\|'project'` | Outlined pill, `inset 0 0 0 1px currentColor`. |
| `TypeBadge` | (children) | Mono uppercase on `ink-900` plate, 4px radius. |
| `CategoryBadge` | (children) | Tiny uppercase Inter, 11px, 1px `rule` outline. |
| `TextInput` | `value`, `onChange`, `placeholder`, `icon`, `label`, `hint`, `error` | 44px min-height, 1px hairline border, spruce focus ring (alpha 0.20). |
| `Card` | `elev: 'sm'\|'md'\|'lg'\|'hairline'`, `padding` | White (`bg-elev`) with one of the four shadow tokens. |
| `ToolPhoto` | `ratio`, `label`, `variant: 'studio'\|'amateur'\|'dim'` | Renders one of the three SVG photo placeholders. **Swap to real photography in production.** |
| `I` | `name`, `size`, `color`, `stroke` | Wrapper around Lucide. Default stroke-width 1.75. |
| `NavBar` | `active`, `onNav` | Wordmark + nav links + Sign in + Scan a tool primary CTA. |
| `Footer` | – | 4-column with wordmark + columns. |
| `Hero` | `onSubmit` | Two-column landing hero. |
| `DropZone` | `onSubmit`, `dense` | The single drop affordance. Handles drag state + file input + URL paste. |
| `ScanResultHeader` | `maker`, `model`, `type`, `era`, `category`, `condition`, `confidence`, `photoLabel`, `photoVariant` | 140 / 1fr / auto grid. |
| `ResultSection` | `title`, `action`, (children) | Uppercase title + signature rule-tick motif below + section body. |
| `VerdictBanner` | `verdict: 'fair'\|'below'\|'above'\|'unknown'` | Filled pill with icon. |
| `CompPriceRange` | `low`, `high`, `listingPrice`, `count`, `days` | Patina band, black listing tick, verdict line. |
| `ListingTile` | `source`, `title`, `price`, `condition`, `location`, `days` | 60px photo + meta + mono price. |
| `NextPhotoHint` | `area`, `onUpload` | Spruce-100 card with numbered chip. Frame as upgrade path. |
| `CorrectionFlow` | – | "How'd we do?" buttons; collapses to thanks-line on submit. |

---

## Interactions & motion

- **Hover**: buttons darken one step (e.g. primary spruce-700 → spruce-900). Links stay color until visited. No scale-on-hover anywhere.
- **Press**: no scale. Background darkens one more step. Tool feel, not toy feel.
- **Drag-and-drop**: drop-zone border becomes 1.5px solid spruce-700, fill becomes `spruce-50`, shadow rises to md. Transition 180ms standard.
- **Scan reveal**: result card rises in (translateY 6px → 0, opacity 0 → 1, 240ms emphasis ease). Respect `prefers-reduced-motion` — replace with 0ms opacity fade.
- **Next-photo hint**: appears in the result flow when confidence ≠ high. *Do not* animate it like an error — it's an upgrade affordance.
- **Confidence pill**: enters with the result card; no continuous animation.

---

## Iconography

**Lucide** (https://lucide.dev) at stroke-width **1.75**, default size 18px (22px in hero affordances, 14px in inline metadata). Default color inherits from `currentColor`, falls back to `ink-700`. Reserve `spruce-700` for icons that signal action.

Canonical usage:
- `camera` — Use camera / Add photo
- `upload` — Upload photo
- `link` — URL field, share permalink
- `check-circle-2` — Looks right, verdict confirmed
- `circle-help` — Unknown verdict
- `trending-up`/`trending-down` — Above/below comp band
- `share-2` — Share
- `bookmark` — Save
- `search` — Reference search
- `info` — Metadata callout
- `chevron-right` — Disclosure / breadcrumb separator

No icon library lock-in. To swap (e.g., Phosphor, Tabler), edit the `<I />` wrapper in `Primitives.jsx` — every icon usage in the kit funnels through it.

---

## Voice & copy

The voice rule is **trusted friend who knows tools** — specific, decision-led, occasionally dry. Verb-y headlines, mono numerals.

**Banned words in user-facing copy:** AI-powered, intelligence, smart, ToolScan, deal check, seamless, effortless, revolutionary.

**Say this, not that:**

| ✓ Say | ✗ Don't say |
|---|---|
| Snap a photo or paste a URL. | Get started with our AI tool scanner. |
| Is this a fair price? | Run a smart deal check. |
| Type 13 No. 4 in good shape — fair price. | Our intelligence has identified this item. |
| Take a frog area shot. | Image quality insufficient. Please retry. |
| Check it before you buy. | AI-powered tool intelligence. |
| Chisels & saws next. | Stay tuned for more categories! |

**Casing:** sentence case for titles (not Title Case). Numerals and Stanley type numbers in mono. No emoji in product UI. Em-dash and × (for dimensions) are the only acceptable unicode glyphs in body copy.

Full voice spec in `foundations/DESIGN_SYSTEM.md`.

---

## Accessibility minimums

- **Contrast**: ink-900 on paper-50 = 14.5:1 (AAA). Spruce-700 on paper-50 = 8.8:1 (AAA). Brass-700 on paper-50 = 4.9:1 (AA). Every conf/cond pair tested AA.
- **Focus ring**: `0 0 0 3px rgba(31,77,58,0.20)` on every interactive element. Never `outline: none` without a replacement.
- **Hit targets**: 44 × 44 px on mobile. Primary buttons default to 44px. The scan flow is field-usable.
- **Color independence**: every confidence/condition badge carries a dot or border in addition to color, so the meaning survives color loss.
- **Reduced motion**: respect `prefers-reduced-motion`. Disable scan-reveal rise-in; swap to 0ms opacity transition.
- **Alt text**: every photo and diagram must have meaningful alt text. The annotated plane diagram in particular should describe what's being labeled.

---

## State management

The reference uses pure prop drilling. In production, lift state up to:

- **Scan flow** — keep last scan result in URL (`/r/<scan-id>`) so the share permalink is canonical. Local cache last 20 scans in `localStorage` under `benchfind.history`.
- **Drop-zone** — controlled file or URL state. On submit, optimistic-redirect to `/r/pending-<temp-id>` with a loading state; replace URL with the real `scan-id` when the server responds.
- **Correction flow** — POST to `/api/corrections` with `scan-id` + delta; UI flips to "Thanks" optimistically.
- **Email capture (category gate)** — POST to `/api/interest` with `category` + `email`; UI flips to confirmation optimistically.

---

## What's not in this bundle (open work)

1. **Real photography** — the kit uses warm SVG placeholders. Source pro studio shots for top model pages and use user-uploaded photos for everything else.
2. **Dedicated mobile compositions for landing & scan result** — foundations support mobile-first; the JSX in `Screens.jsx` reflows but isn't laid out specifically for mobile. Treat as a follow-up screen-by-screen.
3. **Email template** — flagged in the brief; not yet designed.
4. **Empty/error states** — only `verdict='unknown'` exists. Build out: image-too-dark, no-identification-possible, network-failure.
5. **Wordmark SVG paths** — the SVGs in `assets/` rely on Petrona being loadable. Convert to outlined paths for places where the font can't load (some email clients, OG image flatteners).
6. **Mobile sticky nav** — the kit's NavBar doesn't have a sticky/collapsed mobile state.

---

## How to start (suggested order)

1. Wire `foundations/colors_and_type.css` + `foundations/tailwind.config.js` into the codebase.
2. Load the Google Fonts subset in the document `<head>`.
3. Copy `assets/` into the project's `public/` (or equivalent static dir).
4. Reimplement `Wordmark`, then `NavBar`, `Footer`. Verify the wordmark renders identically to `assets/logo-wordmark.svg` at multiple sizes.
5. Reimplement the rest of Primitives (`Button`, badges, `TextInput`, `Card`).
6. Build the Landing screen.
7. Build Scan Result (start with High; Medium is a small delta).
8. Build the Reference page using `assets/diagram-plane-annotated.svg`.
9. Wire the scan flow / share-permalink routing.
10. Mobile-specific compositions for landing + scan result.

---

## Questions / clarifications

Drop them in `SKILL.md` — the agent skill manifest also serves as a quick-reference for an LLM helping with implementation. If you're using Claude Code, drop `SKILL.md` into `~/.claude/skills/benchfind-design/SKILL.md` and the assistant can read the full design system on demand.
