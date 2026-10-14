/**
 * StickyTopBar — the /search header, pinned while scrolling results.
 *
 * Mirrors the Next.js app's header (web/app/layout.tsx) so the hop from the
 * homepage or a guide page to the grid does not look like a change of site:
 * same bone-light bar, same wordmark, the same Price guide / Scan a tool /
 * Listings links, with the listings search field in the middle.
 *   Wordmark · [search input] · Price guide · Scan a tool · Listings
 *
 * No auth entry point: alerts need only an email address (SaveAlertButton posts
 * to /api/alerts), so a Sign in link advertised an account system the product
 * does not use. /login still resolves for the gated marketplace routes.
 *
 * Sort control used to live here but was moved to the breadcrumb row so the
 * top bar is just search + global nav (parallel to the homepage hero header).
 */

import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';


const StickyTopBar = ({ query, onQueryChange }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  // Responsive placeholder. Two examples fit comfortably on desktop; on
  // mobile a single example avoids ellipsizing mid-quote.
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  ));
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const placeholder = isMobile
    ? 'Try "Stanley No. 4"'
    : 'Try "Stanley No. 4" or "moulding plane"';

  // X-clear is a tactical "forget this query" action. Drop `q`, keep every
  // other search param, stay on /search (a bare `/` is the Next.js homepage).
  const handleClear = () => {
    const params = new URLSearchParams(location.search);
    params.delete('q');
    const remaining = params.toString();
    navigate(remaining ? `/search?${remaining}` : '/search', { replace: true });
    // Focus the input so users who cleared to type a new query can just go.
    window.requestAnimationFrame(() => {
      if (inputRef.current) inputRef.current.focus();
    });
  };
  // Wrapper is rendered by the parent (ResultsState owns the unified sticky
  // region so the distribution strip can pin alongside this bar).
  return (
    <div>
      <div
        className="flex items-center flex-wrap gap-y-2 gap-x-3 md:gap-x-5 px-4 md:px-10 aggregator-topbar"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
        }}
      >
        {/* Wordmark */}
        <Link
          to="/"
          reloadDocument
          style={{
            flexShrink: 0,
            fontFamily: "'Petrona', Georgia, serif",
            fontWeight: 600,
            fontSize: 20,
            color: '#1a3030',
            textDecoration: 'none',
          }}
        >
          Benchlot
        </Link>

        {/* Search. On mobile, wraps to its own full-width row below the
            wordmark + nav (Reverb's mobile pattern — the search bar gets
            maximum room for placeholder text instead of being squeezed into
            an inline slot between logo and nav). On md+ it sits inline,
            flex-1 to grow with the available space, capped at 640px. The
            order-* classes drive the wrap behavior: wordmark (1) → nav (2)
            on row 1, search (3) wraps to row 2 on mobile; on md+ all three
            sit inline in their natural visual order (wordmark → search → nav). */}
        <div
          className="relative w-full order-3 md:order-2 md:w-auto md:flex-1"
          style={{ maxWidth: 640 }}
        >
          <Search
            size={18}
            aria-hidden
            style={{
              position: 'absolute',
              left: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--fg-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={placeholder}
            aria-label="Search listings"
            className="aggregator-search-input"
            style={{
              width: '100%',
              background: '#f2f0eb',
              border: '1px solid #e8e6e0',
              borderRadius: 6,
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 500,
              // 16px (not 15) to prevent iOS Safari auto-zooming the page
              // when the input gets focus on mobile.
              fontSize: 16,
              color: '#0c1c1e',
              outline: 'none',
            }}
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              className="cursor-pointer"
              style={{
                position: 'absolute',
                right: 6,
                top: '50%',
                transform: 'translateY(-50%)',
                // 32x32 hit target — bumped from 26 so the clear button is
                // comfortably tappable on mobile without growing the icon.
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                color: '#4a5a54',
                padding: 0,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Global nav. order-2 on mobile (sits next to wordmark on row 1,
            search wraps to row 2 below); order-3 on md+ (last in line, after
            the inline search). The Filters chip used to live here on mobile
            but moved to the breadcrumb row alongside Sort, where it pairs
            naturally with the other 'refine current results' control. */}
        <nav
          className="flex items-center gap-4 md:gap-6 order-2 md:order-3"
          style={{
            flexShrink: 0,
            marginLeft: 'auto',
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 400,
            fontSize: 14,
          }}
        >
          {/* /guide and /scan are served by the Next.js app: plain anchors,
              not router links, so the navigation leaves this bundle. */}
          <a href="/guide" className="hover:text-honey-dark" style={{ color: '#1a3030', textDecoration: 'none' }}>
            Price guide
          </a>
          <a href="/scan" className="hover:text-honey-dark" style={{ color: '#1a3030', textDecoration: 'none' }}>
            Scan a tool
          </a>
          <span aria-current="page" className="hidden sm:inline" style={{ color: '#b08a40' }}>
            Listings
          </span>
        </nav>
      </div>
    </div>
  );
};

export default StickyTopBar;
