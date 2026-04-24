/**
 * Aggregator footer — dark-teal 3-column footer used on both empty and
 * results states. Per `design_handoff_benchlot_homepage/README.md` §Footer.
 *
 * Weekly Digest signup writes to a new `digest_subscribers` Firestore
 * collection (separate from the legacy `waitlist` collection so digest
 * subscribers aren't accidentally rolled into other outreach flows).
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { db } from '../../firebase/config';

const TEXT_BONE = '#f2f0eb';
const TEXT_MUTED = 'rgba(242,240,235,0.65)';
const TEXT_DIM = 'rgba(242,240,235,0.5)';
const TEXT_SOFT = 'rgba(242,240,235,0.75)';
const EYEBROW = '#d4aa60';

const EYEBROW_STYLE = {
  fontFamily: "'Outfit', sans-serif",
  fontWeight: 700,
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.22em',
  color: EYEBROW,
  marginBottom: 20,
};

const LINK_STYLE = {
  fontFamily: "'Outfit', sans-serif",
  fontWeight: 400,
  fontSize: 13,
  color: TEXT_SOFT,
  textDecoration: 'none',
};

const INDEXED_LINKS = [
  'Jim Bode Tools',
  'Patrick Leach',
  'Hyperkitten',
  'Josh Clark Tools',
  'The Best Things',
  'Tools for Working Wood',
  'Sawmill Creek Classifieds',
  'Lumberjocks For Sale',
  'r/handtools',
  'r/woodworking',
  'WoodCentral',
  'eBay (curated)',
  'Skinner Auctions',
  'Bonhams',
  'Brown Auctions',
  'Martin J. Donnelly',
];

const BENCHLOT_LINKS = [
  { label: 'RAQ', to: '/faq' },
  { label: 'Alerts', to: '/alerts' },
  { label: 'Important Notes', to: '/important-notes' },
];

const AggregatorFooter = ({ stats }) => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const activeCount = stats?.activeCount;
  const countLine = activeCount != null ? `${activeCount.toLocaleString()} listings live` : 'Live index';

  async function onDigestSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await addDoc(collection(db, 'digest_subscribers'), {
        email: email.trim().toLowerCase(),
        signed_up_at: serverTimestamp(),
        source: 'aggregator_footer',
      });
      setSubmitted(true);
      setEmail('');
    } catch (err) {
      console.error('Digest signup failed:', err);
      setError('Could not sign you up. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <footer
      style={{
        background: '#0c1c1e', // dark-teal
        color: TEXT_BONE,
        padding: '72px 40px 32px',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {/* Top row: wordmark + tagline · stats */}
        <div
          className="flex items-end justify-between flex-wrap gap-6"
          style={{ paddingBottom: 48, borderBottom: '1px solid rgba(242,240,235,0.1)' }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Petrona', Georgia, serif",
                fontWeight: 900,
                fontSize: 40,
                letterSpacing: '-2px',
                color: TEXT_BONE,
                lineHeight: 1,
              }}
            >
              Benchlot
            </div>
          </div>
          <div
            className="text-right"
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 400,
              fontSize: 13,
              color: TEXT_MUTED,
            }}
          >
            <div>Updated hourly · {countLine}</div>
          </div>
        </div>

        {/* Three columns */}
        <div
          className="grid gap-14"
          style={{
            gridTemplateColumns: '1.6fr 1fr 1.4fr',
            padding: '56px 0 48px',
            borderBottom: '1px solid rgba(242,240,235,0.1)',
          }}
        >
          {/* Column 1: Sources we index */}
          <div>
            <div style={EYEBROW_STYLE}>SOURCES WE INDEX</div>
            <div
              className="grid"
              style={{
                gridTemplateColumns: '1fr 1fr',
                gap: '8px 24px',
              }}
            >
              {INDEXED_LINKS.map((label) => (
                <span key={label} style={LINK_STYLE}>
                  {label}
                </span>
              ))}
            </div>
            <p
              style={{
                marginTop: 18,
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 400,
                fontSize: 12,
                fontStyle: 'italic',
                color: TEXT_DIM,
                maxWidth: 420,
                lineHeight: 1.55,
              }}
            >
              Benchlot does not broker transactions. Every listing links back to its original source.
            </p>
          </div>

          {/* Column 2: Benchlot */}
          <div>
            <div style={EYEBROW_STYLE}>BENCHLOT</div>
            <div className="flex flex-col" style={{ gap: 10 }}>
              {BENCHLOT_LINKS.map((link) => (
                <Link key={link.label} to={link.to} style={LINK_STYLE}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Column 3: Weekly Digest */}
          <div>
            <div style={EYEBROW_STYLE}>THE WEEKLY DIGEST</div>
            <div
              style={{
                fontFamily: "'Petrona', Georgia, serif",
                fontWeight: 700,
                fontSize: 20,
                lineHeight: 1.25,
                color: TEXT_BONE,
                letterSpacing: '-0.3px',
                marginBottom: 10,
              }}
            >
              The week's best new listings, in one email.
            </div>
            <p
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 400,
                fontSize: 13,
                lineHeight: 1.55,
                color: TEXT_MUTED,
                marginBottom: 18,
              }}
            >
              Hand-picked from every source we index. Sent Sunday mornings. Unsubscribe anytime.
            </p>
            {submitted ? (
              <div
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 500,
                  fontSize: 13,
                  color: '#d6ece4',
                }}
              >
                You're in. Look for the first digest Sunday morning.
              </div>
            ) : (
              <form
                onSubmit={onDigestSubmit}
                className="flex overflow-hidden"
                style={{
                  border: '1px solid rgba(242,240,235,0.2)',
                  borderRadius: 8,
                }}
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  placeholder="you@shop.com"
                  style={{
                    flex: 1,
                    padding: '11px 14px',
                    background: 'rgba(242,240,235,0.06)',
                    border: 'none',
                    outline: 'none',
                    color: TEXT_BONE,
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 500,
                    fontSize: 13,
                  }}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0 18px',
                    background: '#d4aa60',
                    color: '#0c1c1e',
                    border: 'none',
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: submitting ? 'default' : 'pointer',
                  }}
                >
                  {submitting ? '...' : 'Subscribe'}
                </button>
              </form>
            )}
            {error && (
              <div
                style={{
                  marginTop: 10,
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 12,
                  color: '#f0c4be',
                }}
              >
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Colophon */}
        <div
          className="flex items-center justify-between flex-wrap"
          style={{
            paddingTop: 24,
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 400,
            fontSize: 12,
            color: TEXT_DIM,
          }}
        >
          <div>© {new Date().getFullYear()} Benchlot, Inc. · An aggregator of public listings.</div>
          <div className="flex gap-6">
            <Link to="/privacy" style={{ color: TEXT_DIM, textDecoration: 'none' }}>
              Privacy
            </Link>
            <Link to="/terms" style={{ color: TEXT_DIM, textDecoration: 'none' }}>
              Terms
            </Link>
            <Link to="/important-notes" style={{ color: TEXT_DIM, textDecoration: 'none' }}>
              DMCA
            </Link>
            <Link to="/faq" style={{ color: TEXT_DIM, textDecoration: 'none' }}>
              Accessibility
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default AggregatorFooter;
