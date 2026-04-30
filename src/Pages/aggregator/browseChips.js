/**
 * Browse chips — the 8-chip on-ramp that appears in HomeIntroBanner (first
 * visit) and as the persistent quick-picks row in the breadcrumb area
 * (returning visitors with no query and no active filters). Each chip sets a
 * filter param (cat= or maker=) and lands the user in ResultsState with the
 * filter rail already visible.
 *
 * Values must match CANONICAL_TYPES / CANONICAL_BRANDS in
 * functions/normalize/vocabulary.js.
 */
export const BROWSE_CHIPS = [
  { label: 'Bench Planes', param: 'cat', value: 'Bench Plane' },
  { label: 'Chisels', param: 'cat', value: 'Chisel' },
  { label: 'Hand Saws', param: 'cat', value: 'Hand Saw' },
  { label: 'Moulding Planes', param: 'cat', value: 'Moulding Plane' },
  { label: 'Stanley', param: 'maker', value: 'Stanley' },
  { label: 'Lie-Nielsen', param: 'maker', value: 'Lie-Nielsen' },
  { label: 'Veritas', param: 'maker', value: 'Veritas' },
  { label: 'Disston', param: 'maker', value: 'Disston' },
];
