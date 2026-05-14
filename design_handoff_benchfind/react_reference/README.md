# Benchfind Web UI Kit

Click-thru recreation of benchfind.com — the marketing landing, scan result (High + Medium states), plane reference page, and category gate.

## Files

- `index.html` — entry point. Tabbed click-thru of all five screens.
- `Primitives.jsx` — tokens object (`BF`), `<Wordmark>`, `<Mark>`, `<Button>`, badges (`<ConfidenceBadge>`, `<ConditionBadge>`, `<TypeBadge>`, `<CategoryBadge>`), `<TextInput>`, `<Card>`, `<ToolPhoto>`, `<I>` (Lucide wrapper).
- `Chrome.jsx` — `<NavBar>`, `<Footer>`.
- `Landing.jsx` — `<Hero>`, `<DropZone>`.
- `ScanResult.jsx` — `<ScanResultHeader>`, `<ResultSection>`, `<VerdictBanner>`, `<CompPriceRange>`, `<ListingTile>`, `<NextPhotoHint>`, `<CorrectionFlow>`.
- `Screens.jsx` — `<LandingScreen>`, `<ScanResultScreen>` (confidence prop = high | medium), `<ReferenceScreen>`, `<CategoryGateScreen>`.

## Component anatomy notes

### `<ScanResultHeader>`
**140px photo · title block · confidence/share** in a 3-col grid. Title block: category badge + era, then display-serif `Maker Model`, then `<TypeBadge>` and `<ConditionBadge>` in a row.

### `<CompPriceRange>`
Domain is `low * 0.7 → high * 1.3`. Patina band marks the comp range; a black tick on the track marks the listing price. Verdict line below ("fair price for what it is") is the human-readable judgment — always present when `listingPrice` is passed.

### `<NextPhotoHint>`
Rust-tinted card with a numbered chip (the "2"), an action title, and a "Add photo" button. **Frame this as an upgrade path, not a failure.** Copy lives in the `area` prop.

### `<DropZone>`
Single drop affordance that accepts both photo and URL. Camera and Upload buttons live at the top; URL field below the divider. Drag-and-drop wraps the whole card.

## Conventions

- **Inline styles** mapped 1:1 to `tailwind.config.js`. Swap to Tailwind classes for production.
- **Lucide icons** via global script — `<I name="camera" size={18} />`. Stroke-width is set at 1.75 globally.
- All components are pure (no router, no fetch). State lives in parent screens.

## What's *not* in this kit

- Real auth, real backend, real image upload. The kit fakes them with prop drilling and local state.
- Email templates (covered separately).
- Share permalink view (the High-confidence Scan result is the canonical share view — just hide the nav).
- Empty/error states beyond `verdict='unknown'` — flagged as a todo.
