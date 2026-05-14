import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Camera } from 'lucide-react';
import Wordmark from './Wordmark';
import Button from './Button';

/**
 * Benchfind site header (NavBar).
 *
 * Layout: wordmark left + nav links · Sign in + Scan a tool CTA right.
 * Paper background, paper-200 bottom hairline. 18/32px padding.
 *
 * Active link inferred from current route.
 *
 * "Sign in" is a visible placeholder for v1 — accounts deliberately not
 * shipped on Benchfind v1, but the design treats it as future-state. Clicking
 * it doesn't navigate yet (just `href="#"` no-op).
 */
const NAV_LINKS = [
  { to: '/',          label: 'Check a tool', match: (p) => p === '/' || p === '/scan' || p.startsWith('/check') },
  { to: '/planes',    label: 'Planes',       match: (p) => p.startsWith('/planes') || p === '/planes' },
  { to: '/reference', label: 'Reference',    match: (p) => p.startsWith('/reference') },
];

const BenchfindHeader = ({ dense = false }) => {
  const location = useLocation();
  const paddingY = dense ? 'py-3' : 'py-[18px]';

  return (
    <header
      className={`flex items-center justify-between ${paddingY} px-8 bg-paper-50 border-b border-paper-200`}
    >
      <div className="flex items-center gap-8">
        <Link to="/" className="inline-flex no-underline" aria-label="Benchfind home">
          <Wordmark size={dense ? 22 : 24} />
        </Link>
        <nav className="flex gap-6">
          {NAV_LINKS.map((l) => {
            const active = l.match(location.pathname);
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`font-sans text-[13px] no-underline ${
                  active ? 'text-ink-900 font-semibold' : 'text-ink-600 font-normal hover:text-ink-900'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-[14px]">
        {/* Sign-in: visible placeholder per v1 decision (accounts deferred).
            Rendered as a button (no destination yet) so it's accessible. */}
        <button
          type="button"
          onClick={() => { /* placeholder — accounts not yet wired */ }}
          className="font-sans text-[13px] text-ink-600 bg-transparent border-0 cursor-pointer p-0 hover:text-ink-900"
        >
          Sign in
        </button>
        <Link to="/" className="no-underline">
          <Button size="sm">
            <Camera size={15} strokeWidth={1.75} />
            Scan a tool
          </Button>
        </Link>
      </div>
    </header>
  );
};

export default BenchfindHeader;
