import React from 'react';
import Wordmark from './Wordmark';

/**
 * Benchfind site footer.
 *
 * Three-column link grid + wordmark + tagline on the left. Hairline bottom
 * row with copyright + benchfind.com URL. Honest disclaimer about
 * non-affiliation included by design — trust-building.
 *
 * Footer links are visible placeholders (no underlying routes for most
 * yet). Wire targets as those surfaces ship.
 */
const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'How it works',  href: '#' },
      { label: 'Methodology',   href: '#' },
      { label: 'Sources',       href: '#' },
      { label: 'Pricing',       href: '#' },
    ],
  },
  {
    title: 'Reference',
    links: [
      { label: 'Stanley type studies', href: '#' },
      { label: 'Bench planes',         href: '#' },
      { label: 'Block planes',         href: '#' },
      { label: 'All planes',           href: '#' },
    ],
  },
  {
    title: 'About',
    links: [
      { label: 'Voice & values', href: '#' },
      { label: 'Press',          href: '#' },
      { label: 'Contact',        href: '#' },
      { label: 'Privacy',        href: '/privacy' },
    ],
  },
];

const BenchfindFooter = () => (
  <footer className="border-t border-paper-200 px-8 pt-9 pb-12 bg-paper-50 mt-16">
    <div className="flex flex-wrap items-start justify-between gap-6">
      <div className="max-w-[320px]">
        <Wordmark size={22} />
        <p className="font-sans text-[13px] text-ink-600 mt-3 leading-[1.55]">
          Confidence for used hand tools. Plane-first today. Chisels &amp; saws next.
        </p>
      </div>
      <div className="flex gap-12">
        {COLUMNS.map((col) => (
          <div key={col.title} className="flex flex-col gap-2">
            <span className="font-sans text-[11px] font-semibold text-ink-500 uppercase tracking-[0.06em]">
              {col.title}
            </span>
            {col.links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="font-sans text-[13px] text-ink-700 no-underline hover:text-ink-900"
              >
                {l.label}
              </a>
            ))}
          </div>
        ))}
      </div>
    </div>
    <div className="mt-9 pt-[18px] border-t border-paper-200 flex justify-between font-sans text-[11px] text-ink-500 tracking-[0.02em]">
      <span>© 2026 Benchfind. Independent — not affiliated with Stanley, Lie-Nielsen, or Veritas.</span>
      <span>benchfind.com</span>
    </div>
  </footer>
);

export default BenchfindFooter;
