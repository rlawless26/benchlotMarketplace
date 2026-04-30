/**
 * FilterRail — left column in results state (also rendered inside the mobile
 * filter sheet).
 *
 * Order is intentional: the SOURCE filter sits high on the rail because the
 * "we aggregate from many places" pitch is the product's core differentiator
 * — it shouldn't read as an afterthought. Category and Brand below are both
 * driven from live facets (count desc, top N + Show more) so users see what
 * the catalog actually contains, not a static list.
 *
 * Filter groups, top to bottom:
 *   Only with photos  (single toggle, no header)
 *   Source            (inline checkboxes, default open)
 *   Category          (top 12 by count, Show more expands the rest)
 *   Brand             (top 12 by count, excludes Unknown, Show more)
 *   Price             (min/max numeric)
 *   Listing age       (default collapsed)
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';

import { SOURCES } from '../../firebase/adapters/sources';

const EYEBROW = {
  fontFamily: "'Outfit', sans-serif",
  fontWeight: 700,
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  color: '#4a5a54',
};

const LABEL = {
  fontFamily: "'Outfit', sans-serif",
  fontWeight: 400,
  fontSize: 13,
  color: '#0c1c1e',
};

const COUNT = {
  fontFamily: "'Outfit', sans-serif",
  fontWeight: 400,
  fontSize: 11,
  color: '#8a8a80',
};

const SHOW_MORE_LINK = {
  fontFamily: "'Outfit', sans-serif",
  fontWeight: 500,
  fontSize: 11,
  color: '#4a5a54',
  textDecoration: 'underline',
  textUnderlineOffset: 2,
  background: 'transparent',
  border: 'none',
  padding: '4px 0 0',
  cursor: 'pointer',
};

// Curated list of canonical_type values mirrored from
// functions/normalize/vocabulary.js. Used as a fallback ordering and as the
// total set inside "Show more" when facets haven't loaded yet.
const CATEGORY_OPTIONS = [
  'Bench Plane', 'Block Plane', 'Shoulder Plane', 'Router Plane', 'Plow Plane',
  'Rabbet Plane', 'Moulding Plane', 'Infill Plane', 'Scrub Plane',
  'Combination Plane', 'Chisel Plane', 'Hawk Plane', 'Spokeshave',
  'Chisel', 'Gouge', 'Drawknife', 'Cabinet Scraper', 'Card Scraper', 'Knife',
  'Hand Saw', 'Back Saw', 'Japanese Saw', 'Coping Saw', 'Frame Saw',
  'Brace', 'Eggbeater Drill', 'Drill Bit', 'Auger Bit',
  'Hammer', 'Mallet', 'Axe', 'Adze', 'Hatchet',
  'Square', 'Bevel Gauge', 'Marking Gauge', 'Mortise Gauge', 'Rule', 'Caliper', 'Level',
  'Vise', 'Clamp', 'Holdfast', 'Pliers',
  'Table Saw', 'Band Saw', 'Miter Saw', 'Jointer', 'Thickness Planer', 'Lathe',
  'Drill Press', 'Router', 'Shaper', 'Mortiser', 'Drum Sander', 'Scroll Saw',
  'Dust Collector', 'Air Compressor',
  'Circular Saw', 'Track Saw', 'Jigsaw', 'Reciprocating Saw', 'Sander',
  'Impact Driver', 'Drill', 'Angle Grinder', 'Biscuit Joiner', 'Domino', 'Multi-Tool',
  'CNC',
  'Boring Machine',
  'Workbench', 'Router Table',
  'Other',
];

// Fallback brand list shown before facets arrive. Reflects the actual top
// brands by listing count across the live catalog (mix of vintage hand-tool
// and modern power-tool — was previously hand-tool-only). "Unknown" is
// intentionally excluded; it leaks ~30% of the catalog and is not a useful
// filter target.
const FALLBACK_BRANDS = [
  'Stanley', 'Festool', 'Delta', 'Craftsman', 'Powermatic', 'Veritas',
  'Shopsmith', 'WoodRiver', 'Woodpeckers', 'Lie-Nielsen', 'Record',
  'Bridge City',
];

const AGE_OPTIONS = [
  { key: '24h', label: 'Last 24 hours' },
  { key: '3d', label: 'Last 3 days' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
];

const TOP_N = 12;

function CollapsibleGroup({ label, defaultOpen = true, children, suffix }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        paddingBottom: 16,
        marginBottom: 16,
        borderBottom: '1px solid #eceae4',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between cursor-pointer"
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          marginBottom: open ? 10 : 0,
        }}
      >
        <span className="inline-flex items-center" style={{ ...EYEBROW, gap: 6 }}>
          {label}
          {suffix != null && (
            <span
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 500,
                fontSize: 10,
                letterSpacing: '0.04em',
                color: '#8a8a80',
                textTransform: 'none',
              }}
            >
              {suffix}
            </span>
          )}
        </span>
        <ChevronDown
          size={12}
          style={{
            color: '#8a8a80',
            transform: open ? 'rotate(0)' : 'rotate(-90deg)',
            transition: 'transform 200ms',
          }}
        />
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

function CheckboxRow({ label, checked, count, onChange }) {
  return (
    <label
      className="flex items-center gap-2 cursor-pointer"
      style={{ padding: '4px 0' }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ accentColor: '#1a3030', cursor: 'pointer' }}
      />
      <span style={{ ...LABEL, flex: 1 }}>{label}</span>
      {count != null && <span style={COUNT}>{count.toLocaleString()}</span>}
    </label>
  );
}

/**
 * Render a list of options with checkboxes. If `expandable` and there are
 * more than TOP_N options, hide the tail behind a Show more / Show less
 * toggle. Options pre-sorted by the caller (count desc with selected always
 * pinned to the top).
 */
function CheckboxList({ options, selected, facets, onToggle, expandable = true }) {
  const [expanded, setExpanded] = useState(false);
  const overflow = expandable && options.length > TOP_N;
  const visible = !overflow || expanded ? options : options.slice(0, TOP_N);
  return (
    <>
      {visible.map((opt) => (
        <CheckboxRow
          key={opt}
          label={opt}
          count={facets?.[opt]}
          checked={Boolean(selected?.[opt])}
          onChange={() => onToggle(opt)}
        />
      ))}
      {overflow && (
        <button
          type="button"
          style={SHOW_MORE_LINK}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show less' : `Show more (${options.length - TOP_N})`}
        </button>
      )}
    </>
  );
}

const FilterRail = ({
  filters,
  toggleFilter,
  setPriceRange,
  clearAllFilters,
  facets,
  sourceCounts,
  priceRangeHelper,
}) => {
  // Indexed source list — only show what's actually live in the catalog.
  const sourceOptions = useMemo(
    () => SOURCES.filter((s) => s.indexed).map((s) => ({ key: s.id, label: s.name })),
    []
  );

  // Category options ordered for display: any selected option pinned to top,
  // then options that have facet counts in count-desc order, then any
  // canonical types with no current matches in their original (semantic)
  // order. The "Show more" expander reveals the long tail.
  const categoryOptions = useMemo(() => {
    const facetMap = facets?.category || {};
    const selected = filters?.cat || {};
    const result = [];
    const seen = new Set();
    // 1) Selected first so a user's narrowing choices never disappear into
    //    "Show more" when results redistribute.
    for (const k of Object.keys(selected)) {
      if (!seen.has(k)) { result.push(k); seen.add(k); }
    }
    // 2) Everything with a current facet count, sorted by count desc.
    for (const [k] of Object.entries(facetMap).sort((a, b) => b[1] - a[1])) {
      if (!seen.has(k)) { result.push(k); seen.add(k); }
    }
    // 3) Curated canonical types not in the result set yet, in the original
    //    semantic order so the "Show more" tail stays predictable when
    //    facets are sparse.
    for (const k of CATEGORY_OPTIONS) {
      if (!seen.has(k)) { result.push(k); seen.add(k); }
    }
    return result;
  }, [facets, filters]);

  // Brand options: same pattern as Category. "Unknown" is filtered out
  // intentionally — it represents ~30% of listings (no brand identifiable)
  // and isn't a useful filter target.
  const brandOptions = useMemo(() => {
    const facetMap = facets?.maker || {};
    const selected = filters?.maker || {};
    const result = [];
    const seen = new Set();
    for (const k of Object.keys(selected)) {
      if (k === 'Unknown') continue;
      if (!seen.has(k)) { result.push(k); seen.add(k); }
    }
    for (const [k] of Object.entries(facetMap).sort((a, b) => b[1] - a[1])) {
      if (k === 'Unknown') continue;
      if (!seen.has(k)) { result.push(k); seen.add(k); }
    }
    // Fallback list only kicks in pre-facets; once any facet data arrives
    // we let the live counts drive ordering.
    if (Object.keys(facetMap).length === 0) {
      for (const k of FALLBACK_BRANDS) {
        if (!seen.has(k)) { result.push(k); seen.add(k); }
      }
    }
    return result;
  }, [facets, filters]);

  const priceMin = filters?.price?.min ?? '';
  const priceMax = filters?.price?.max ?? '';

  // Only show "Clear all" when at least one filter is actually applied.
  const hasAnyFilter = useMemo(() => {
    if (!filters) return false;
    if (filters.price && (filters.price.min != null || filters.price.max != null)) return true;
    for (const group of ['cat', 'maker', 'cond', 'src', 'age', 'pics']) {
      if (filters[group] && Object.keys(filters[group]).length > 0) return true;
    }
    return false;
  }, [filters]);

  const indexedCount = sourceOptions.length;

  return (
    <aside style={{ width: '100%', maxWidth: 240, alignSelf: 'flex-start' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{
          paddingBottom: 16,
          marginBottom: 16,
          borderBottom: '1px solid #e4e2dc',
        }}
      >
        <span
          className="inline-flex items-center gap-2"
          style={{
            fontFamily: "'Petrona', Georgia, serif",
            fontWeight: 700,
            fontSize: 14,
            color: '#0c1c1e',
          }}
        >
          <SlidersHorizontal size={14} />
          Filters
        </span>
        {hasAnyFilter && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="cursor-pointer"
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 500,
              fontSize: 11,
              color: '#4a5a54',
              textDecoration: 'underline',
              textUnderlineOffset: 2,
            }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Single-toggle quality filter — sits at the very top because it's the
         most-asked browsing affordance ("just show me the ones with photos").
         Forum sources skew text-only so this is high-signal. */}
      <div style={{ paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid #e4e2dc' }}>
        <CheckboxRow
          label="Only with photos"
          checked={Boolean(filters?.pics?.yes)}
          onChange={() => toggleFilter('pics', 'yes')}
        />
      </div>

      {/* Source — promoted near the top of the rail because the
         multi-source aggregator is the product's core differentiator and
         shouldn't read as an afterthought. Inline checkboxes (one per
         indexed source) instead of the previous dropdown. The
         "{n} indexed" eyebrow suffix anchors the value prop.
         Counts come from `sourceCounts` (true catalog count via Firestore
         count() aggregate) when available, falling back to `facets.source`
         (which only reflects the per-source 2,500 fetch cap and so
         understates eBay / FB Marketplace). */}
      <CollapsibleGroup label="Source" suffix={`${indexedCount} indexed`} defaultOpen>
        {sourceOptions.map((opt) => {
          const count = sourceCounts?.[opt.key] != null
            ? sourceCounts[opt.key]
            : facets?.source?.[opt.key];
          return (
            <CheckboxRow
              key={opt.key}
              label={opt.label}
              count={count}
              checked={Boolean(filters?.src?.[opt.key])}
              onChange={() => toggleFilter('src', opt.key)}
            />
          );
        })}
      </CollapsibleGroup>

      {/* Category — driven from live facets, count desc, top 12 + Show more.
         Previously was a hardcoded slice(0,10) of the curated CATEGORY_OPTIONS
         list, which happened to be all planes — users never saw Chisel /
         Hammer / Table Saw / etc. */}
      <CollapsibleGroup label="Category" defaultOpen>
        <CheckboxList
          options={categoryOptions}
          selected={filters?.cat}
          facets={facets?.category}
          onToggle={(k) => toggleFilter('cat', k)}
        />
      </CollapsibleGroup>

      {/* Brand (was "Maker") — universal term covering both modern power-tool
         brands (Festool, DeWalt) and vintage hand-tool brands (Stanley,
         Lie-Nielsen). "Unknown" is filtered out of the option list. */}
      <CollapsibleGroup label="Brand" defaultOpen>
        <CheckboxList
          options={brandOptions}
          selected={filters?.maker}
          facets={facets?.maker}
          onToggle={(k) => toggleFilter('maker', k)}
        />
      </CollapsibleGroup>

      {/* Condition filter intentionally removed 2026-04-29 — the FilterRail
         options ("New / NOS", "Like New", "Excellent", "Good", "Project /
         Parts") didn't match the actual condition_raw values in the catalog
         (mostly raw eBay strings: "Used", "New", "Open box", "Brand New",
         "For parts or not working", plus international variants like
         "Nuovo"/"Neu"). The mismatch made every option except "Like New"
         and "Good" return 0 results. Re-add when condition normalization
         lands in the LLM normalizer. */}

      {/* Price */}
      <CollapsibleGroup label="Price" defaultOpen>
        <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
          <input
            type="number"
            min="0"
            value={priceMin}
            onChange={(e) => setPriceRange(e.target.value || null, priceMax || null)}
            placeholder="$ min"
            style={{
              flex: 1,
              padding: '7px 10px',
              borderRadius: 6,
              border: '1px solid #e4e2dc',
              background: '#f2f0eb',
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 400,
              fontSize: 12,
              outline: 'none',
            }}
          />
          <input
            type="number"
            min="0"
            value={priceMax}
            onChange={(e) => setPriceRange(priceMin || null, e.target.value || null)}
            placeholder="$ max"
            style={{
              flex: 1,
              padding: '7px 10px',
              borderRadius: 6,
              border: '1px solid #e4e2dc',
              background: '#f2f0eb',
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 400,
              fontSize: 12,
              outline: 'none',
            }}
          />
        </div>
        {priceRangeHelper && (
          <div style={COUNT}>Range in current results: {priceRangeHelper}</div>
        )}
      </CollapsibleGroup>

      {/* Listing age — default collapsed; freshness is implicit in the
         newest-first sort, this filter is for users actively narrowing. */}
      <CollapsibleGroup label="Listing age" defaultOpen={false}>
        {AGE_OPTIONS.map(({ key, label }) => (
          <CheckboxRow
            key={key}
            label={label}
            checked={Boolean(filters?.age?.[key])}
            onChange={() => toggleFilter('age', key)}
          />
        ))}
      </CollapsibleGroup>
    </aside>
  );
};

export default FilterRail;
