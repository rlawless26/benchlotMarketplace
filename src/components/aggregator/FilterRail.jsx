/**
 * FilterRail — left column in results state.
 *
 * 6 collapsible groups per design spec: Category, Maker, Condition, Price,
 * Source, Listing Age. Option counts derived from the current result set
 * (WatchRecon pattern — see aggregatorFacets.computeFacets).
 *
 * Groups default-open except Listing Age. Header click toggles the group.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronDown, SlidersHorizontal, Check } from 'lucide-react';

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

// Canonical types to expose in the Category filter — mirrors
// functions/normalize/vocabulary.js CANONICAL_TYPES but kept client-side to
// avoid importing Cloud Functions code into the React bundle. Match labels.
const CATEGORY_OPTIONS = [
  // Planes (hand)
  'Bench Plane',
  'Block Plane',
  'Shoulder Plane',
  'Router Plane',
  'Plow Plane',
  'Rabbet Plane',
  'Moulding Plane',
  'Infill Plane',
  'Scrub Plane',
  'Combination Plane',
  'Chisel Plane',
  'Hawk Plane',
  'Spokeshave',
  // Cutting / shaping (hand)
  'Chisel',
  'Gouge',
  'Drawknife',
  'Cabinet Scraper',
  'Card Scraper',
  'Knife',
  // Saws (hand)
  'Hand Saw',
  'Back Saw',
  'Japanese Saw',
  'Coping Saw',
  'Frame Saw',
  // Boring (hand)
  'Brace',
  'Eggbeater Drill',
  'Drill Bit',
  'Auger Bit',
  // Striking (hand)
  'Hammer',
  'Mallet',
  'Axe',
  'Adze',
  'Hatchet',
  // Measuring / marking
  'Square',
  'Bevel Gauge',
  'Marking Gauge',
  'Mortise Gauge',
  'Rule',
  'Caliper',
  'Level',
  // Workholding
  'Vise',
  'Clamp',
  'Holdfast',
  'Pliers',
  // Stationary power (M5)
  'Table Saw',
  'Band Saw',
  'Miter Saw',
  'Jointer',
  'Thickness Planer',
  'Lathe',
  'Drill Press',
  'Router',
  'Shaper',
  'Mortiser',
  'Drum Sander',
  'Scroll Saw',
  'Dust Collector',
  'Air Compressor',
  // Portable power (M5)
  'Circular Saw',
  'Track Saw',
  'Jigsaw',
  'Reciprocating Saw',
  'Sander',
  'Impact Driver',
  'Drill',
  'Angle Grinder',
  'Biscuit Joiner',
  'Domino',
  'Multi-Tool',
  // CNC (M5)
  'CNC',
  // Heavy / legacy
  'Boring Machine',
  // Shop fixtures (M5)
  'Workbench',
  'Router Table',
  // Catch-all
  'Other',
];

const CONDITION_OPTIONS = ['New / NOS', 'Like New', 'Excellent', 'Good', 'Project / Parts'];

const AGE_OPTIONS = [
  { key: '24h', label: 'Last 24 hours' },
  { key: '3d', label: 'Last 3 days' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
];

function CollapsibleGroup({ label, defaultOpen = true, children }) {
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
        <span style={EYEBROW}>{label}</span>
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
      {count != null && <span style={COUNT}>{count}</span>}
    </label>
  );
}

/**
 * Multi-select dropdown for the Source filter. Opens a popup of checkable
 * options; selected count is shown on the trigger. Closes on outside click.
 */
function MultiSelectDropdown({ options, selected, onToggle, facets }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectedCount = options.filter((o) => selected?.[o.key]).length;
  const triggerLabel = selectedCount === 0
    ? 'Any source'
    : selectedCount === 1
      ? options.find((o) => selected?.[o.key])?.label
      : `${selectedCount} selected`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between cursor-pointer"
        style={{
          padding: '8px 10px',
          borderRadius: 6,
          border: '1px solid #e4e2dc',
          background: '#f2f0eb',
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 400,
          fontSize: 13,
          color: '#0c1c1e',
        }}
      >
        <span>{triggerLabel}</span>
        <ChevronDown
          size={14}
          style={{
            color: '#8a8a80',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 150ms',
          }}
        />
      </button>
      {open && (
        <div
          className="absolute"
          style={{
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#f8f6f2',
            border: '1px solid #e4e2dc',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(12,28,30,0.10)',
            padding: 6,
            zIndex: 10,
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {options.map((opt) => {
            const active = Boolean(selected?.[opt.key]);
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onToggle(opt.key)}
                className="w-full flex items-center justify-between cursor-pointer"
                style={{
                  padding: '7px 8px',
                  borderRadius: 4,
                  background: active ? 'rgba(26,48,48,0.06)' : 'transparent',
                  border: 'none',
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 400,
                  fontSize: 13,
                  color: '#0c1c1e',
                  textAlign: 'left',
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      border: '1px solid #d4d2cc',
                      background: active ? '#1a3030' : '#f8f6f2',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {active && <Check size={10} color="#f2f0eb" />}
                  </span>
                  {opt.label}
                </span>
                {facets?.[opt.key] != null && (
                  <span style={{ color: '#8a8a80', fontSize: 11 }}>{facets[opt.key]}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const FilterRail = ({
  filters,
  toggleFilter,
  setPriceRange,
  clearAllFilters,
  facets,
  priceRangeHelper,
}) => {
  const makerOptions = useMemo(() => {
    const makerFacet = facets?.maker || {};
    const entries = Object.entries(makerFacet).sort((a, b) => b[1] - a[1]);
    // Fall back to a small default list if nothing is in the result set yet.
    if (entries.length === 0) {
      return [
        ['Stanley', null],
        ['Lie-Nielsen', null],
        ['Veritas', null],
        ['Record', null],
        ['Disston', null],
        ['Narex', null],
        ['Sorby', null],
      ];
    }
    return entries.slice(0, 20);
  }, [facets]);

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

  return (
    <aside style={{ width: 240, alignSelf: 'flex-start' }}>
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

      {/* Single-toggle quality filter — sits above the rest of the rail
         because it's the most-asked browsing affordance ("just show me the
         ones with photos"). Forum sources skew text-only so this is high-
         signal when filtering by makers traded on forums (Veritas, etc.). */}
      <div style={{ paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid #e4e2dc' }}>
        <CheckboxRow
          label="Only with photos"
          checked={Boolean(filters?.pics?.yes)}
          onChange={() => toggleFilter('pics', 'yes')}
        />
      </div>

      {/* Category */}
      <CollapsibleGroup label="Category" defaultOpen>
        {CATEGORY_OPTIONS.slice(0, 10).map((opt) => (
          <CheckboxRow
            key={opt}
            label={opt}
            count={facets?.category?.[opt]}
            checked={Boolean(filters?.cat?.[opt])}
            onChange={() => toggleFilter('cat', opt)}
          />
        ))}
      </CollapsibleGroup>

      {/* Maker */}
      <CollapsibleGroup label="Maker" defaultOpen>
        {makerOptions.map(([name, count]) => (
          <CheckboxRow
            key={name}
            label={name}
            count={count}
            checked={Boolean(filters?.maker?.[name])}
            onChange={() => toggleFilter('maker', name)}
          />
        ))}
      </CollapsibleGroup>

      {/* Condition */}
      <CollapsibleGroup label="Condition" defaultOpen>
        {CONDITION_OPTIONS.map((opt) => (
          <CheckboxRow
            key={opt}
            label={opt}
            count={facets?.condition?.[opt]}
            checked={Boolean(filters?.cond?.[opt])}
            onChange={() => toggleFilter('cond', opt)}
          />
        ))}
      </CollapsibleGroup>

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

      {/* Source — multi-select dropdown. Only show sources that are actually
         indexed; aspirational entries in SOURCES (indexed:false) would
         confuse users since they have zero matches. */}
      <CollapsibleGroup label="Source" defaultOpen>
        <MultiSelectDropdown
          options={SOURCES.filter((s) => s.indexed).map((s) => ({ key: s.id, label: s.name }))}
          selected={filters?.src}
          onToggle={(key) => toggleFilter('src', key)}
          facets={facets?.source}
        />
      </CollapsibleGroup>

      {/* Listing age — default collapsed */}
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
