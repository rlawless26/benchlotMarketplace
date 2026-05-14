---
name: benchfind-design
description: Use this skill to generate well-branded interfaces and assets for Benchfind, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

# Benchfind — Design Skill

You are an expert designer working in the Benchfind design system. Benchfind is a confidence-check tool for people buying used woodworking hand tools — Carfax/Zillow positioning, plane-first today, chisels and saws next.

## Start here

1. Read `README.md` in this skill — it has voice, visual foundations, iconography, and a decisions log.
2. Read `colors_and_type.css` for foundation tokens (CSS variables + utility classes).
3. Read `tailwind.config.js` if you're producing production React + Tailwind code.
4. Open `ui_kits/web/index.html` to see the click-thru kit. Source components live in `ui_kits/web/*.jsx`.
5. Brand assets are in `assets/` — wordmark, mark, app icon, favicon, OG preview.

## Hard rules (do not break)

- **Wordmark spelling is `Benchfind`** — capital B, lowercase rest, single word, in the codebase and in inline body copy. **Display treatment** sets it as `BENCH` + bold `FIND` in Petrona uppercase. Never abbreviated, never two words, never camel-cased (`BenchFind`), never hyphenated.
- **Banned words in user-facing copy**: AI-powered, intelligence, smart, ToolScan, deal check, seamless, effortless, revolutionary.
- **No pure white backgrounds.** Always `paper-50` (`#FBF8F2`).
- **No bluish drop shadows. No gradient backgrounds. No glassmorphism. No emoji in product UI.**
- **Spruce is the primary accent** (`#1F4D3A`). Brass (`#B08938`) is the only warm secondary, used sparingly. Rust is kept as a semantic-only color for low confidence.
- **Photo-frame corner registration marks** in spruce are the brand fingerprint. They wrap the wordmark at all sizes (4 corners at small scales; 2 diagonal at hero).
- **Mobile tap targets ≥ 44px.** Type numbers and prices in mono, never body sans.

## What to build

- **Artifacts** (slides, mocks, throwaway HTML): copy assets out of this skill into your output and write static HTML referencing them. Pull `colors_and_type.css` in via `<link>`. Use the JSX primitives in `ui_kits/web/` as a starting point.
- **Production code**: read the README's tokens + voice sections; paste the `tailwind.config.js` `theme.extend` block; import Newsreader + Inter + JetBrains Mono from Google Fonts; use Lucide icons (stroke-width 1.75).

## If invoked without guidance

Ask the user:
1. What surface? (landing, scan result, plane reference, share permalink, email, category gate, error state)
2. Mobile, desktop, or both?
3. Confidence level / verdict to show?
4. Do they want a static mock or an interactive prototype?

Then act as an expert designer — produce HTML artifacts or production code, using the foundations and components in this skill.
