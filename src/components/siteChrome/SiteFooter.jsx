/**
 * SiteFooter — dark-teal three-column footer for content pages.
 *
 * Left: "What Benchlot does" prose blurb (stands alone — no CTA; visit /faq
 *   via the nav column if you want more).
 * Middle: nav (RAQ only, per post-consolidation spec).
 * Right: weekly-digest signup form (no fake subscriber counts).
 *
 * Pulls live-index count from Firestore stats for the top-row freshness line;
 * falls back to "Updated nightly" if the query fails.
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

import { db } from '../../firebase/config';
import { getAggregatorStats } from '../../firebase/adapters/aggregatorFacets';

function formatIndexLine(stats) {
  if (!stats || typeof stats.activeCount !== 'number' || !stats.activeCount) {
    return 'Updated nightly';
  }
  return `Updated nightly · ${stats.activeCount.toLocaleString()} listings live`;
}

// Scroll to top on any footer link click. React Router's <Link> won't
// re-render or scroll when the destination matches the current path, so
// clicking e.g. "Privacy" while on /privacy is otherwise a no-op.
const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

export default function SiteFooter() {
  const [stats, setStats] = useState(null);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { kind: 'ok'|'err', msg: string }

  useEffect(() => {
    let cancelled = false;
    getAggregatorStats()
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const normalized = email.toLowerCase().trim();
    if (!normalized) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      await addDoc(collection(db, 'waitlist'), {
        email: normalized,
        signed_up_at: serverTimestamp(),
        source: 'digest_footer',
      });
      setFeedback({ kind: 'ok', msg: "You're in. Look for the first digest Sunday morning." });
      setEmail('');
    } catch (err) {
      console.error('[SiteFooter] digest signup failed:', err);
      setFeedback({ kind: 'err', msg: 'Something went wrong. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const labelStyle = {
    fontFamily: 'var(--font-body)',
    fontWeight: 700,
    fontSize: 10,
    color: 'var(--honey)',
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    marginBottom: 20,
  };

  return (
    <footer
      className="px-4 md:px-10"
      style={{
        background: 'var(--dark-teal)',
        color: 'var(--bone)',
        paddingTop: 56,
        paddingBottom: 32,
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {/* Top row — wordmark + tagline + freshness */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            paddingBottom: 48,
            borderBottom: '1px solid rgba(242,240,235,0.1)',
            flexWrap: 'wrap',
            gap: 24,
          }}
        >
          <div>
            <Link
              to="/"
              onClick={scrollTop}
              style={{
                display: 'inline-block',
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: 40,
                letterSpacing: '-2px',
                color: 'var(--bone)',
                textDecoration: 'none',
              }}
            >
              Benchlot
            </Link>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'rgba(242,240,235,0.65)',
              textAlign: 'right',
            }}
          >
            <div>{formatIndexLine(stats)}</div>
          </div>
        </div>

        {/* Two columns — prose blurb + digest signup. Stacks to a single
            column on mobile; side-by-side at md+ where the prose has room
            to breathe and the form doesn't overflow. */}
        <div
          className="grid grid-cols-1 md:grid-cols-[1.6fr_1.4fr] gap-10 md:gap-14"
          style={{
            padding: '40px 0 32px',
            borderBottom: '1px solid rgba(242,240,235,0.1)',
          }}
        >
          {/* Col 1 — What Benchlot does */}
          <div>
            <div style={labelStyle}>What Benchlot does</div>
            <p
              style={{
                margin: '0 0 18px',
                fontFamily: 'var(--font-body)',
                fontWeight: 400,
                fontSize: 14,
                lineHeight: 1.65,
                color: 'rgba(242,240,235,0.78)',
                letterSpacing: '0.01em',
                maxWidth: 440,
              }}
            >
              Benchlot indexes used woodworking tool listings — hand tools and
              power tools alike — from dealers, forum classifieds, auction
              houses, and marketplaces, and makes them searchable from one
              place. Every listing links back to its original source.
            </p>
            <Link
              to="/faq"
              onClick={scrollTop}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: 13,
                color: 'var(--honey)',
                letterSpacing: '0.02em',
                textDecoration: 'none',
              }}
            >
              Learn more <ArrowRight size={14} />
            </Link>
          </div>

          {/* Col 2 — Weekly digest */}
          <div>
            <div style={labelStyle}>The Weekly Digest</div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 20,
                lineHeight: 1.25,
                color: 'var(--bone)',
                marginBottom: 10,
                letterSpacing: '-0.3px',
              }}
            >
              The week&rsquo;s best new listings, in one email.
            </div>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 400,
                fontSize: 13,
                lineHeight: 1.55,
                color: 'rgba(242,240,235,0.65)',
                marginBottom: 18,
                letterSpacing: '0.01em',
              }}
            >
              Hand-picked from every source we index. Sent Sunday mornings.
              Unsubscribe anytime.
            </div>
            <form
              onSubmit={handleSubscribe}
              style={{
                display: 'flex',
                gap: 0,
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid rgba(242,240,235,0.2)',
                maxWidth: '100%',
              }}
            >
              <input
                type="email"
                required
                placeholder="you@shop.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '11px 14px',
                  background: 'rgba(242,240,235,0.06)',
                  border: 0,
                  outline: 0,
                  color: 'var(--bone)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 500,
                  fontSize: 13,
                  letterSpacing: '0.01em',
                }}
              />
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '0 18px',
                  background: 'var(--honey)',
                  color: 'var(--dark-teal)',
                  border: 0,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  fontSize: 13,
                  letterSpacing: '0.02em',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? 'Saving…' : 'Subscribe'}
              </button>
            </form>
            {feedback && (
              <div
                style={{
                  marginTop: 10,
                  fontFamily: 'var(--font-body)',
                  fontWeight: 500,
                  fontSize: 12,
                  color: feedback.kind === 'ok' ? '#d6ece4' : '#f0c4be',
                  letterSpacing: '0.01em',
                }}
              >
                {feedback.msg}
              </div>
            )}
          </div>
        </div>

        {/* Colophon */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: 24,
            fontFamily: 'var(--font-body)',
            fontWeight: 400,
            fontSize: 12,
            color: 'rgba(242,240,235,0.5)',
            letterSpacing: '0.02em',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>© {new Date().getFullYear()} Benchlot, Inc. · An aggregator of public listings.</div>
          <div style={{ display: 'flex', gap: 24 }}>
            <Link to="/privacy" onClick={scrollTop} style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</Link>
            <Link to="/terms" onClick={scrollTop} style={{ color: 'inherit', textDecoration: 'none' }}>Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
