/**
 * CheckPage — unified check surface (URL paste + photo upload).
 *
 * Routes:
 *   /check          — input form (paste URL or upload photo)
 *   /check/:hash    — load persisted snapshot from `dealChecks/{hash}` and render result
 *
 * Flows:
 *   URL  → POST /url-check → server normalizes + comp lookup + persists → redirect to /check/{hash}
 *   Photo → POST /toolscan → POST /check-from-canonical → redirect to /check/{hash}
 *
 * External-naming rule: no internal feature names ("deal check", "URL-check",
 * "ToolScan") leak into JSX text. Hero copy is verb-y; the page is just Benchlot.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getDoc, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

import { db } from '../../firebase/config';
import { getConfig } from '../../utils/environment';
import { track } from '../../utils/analytics';

const API_URL = process.env.REACT_APP_API_URL
  || process.env.REACT_APP_FIREBASE_API_URL
  || getConfig(
    'https://api-sed2e4p6ua-uc.a.run.app',
    'https://api-sed2e4p6ua-uc.a.run.app',
    'https://api-sed2e4p6ua-uc.a.run.app',
  );

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// ─── Style tokens ────────────────────────────────────────────────────────────
const COLORS = {
  spruce: '#1a3030',
  bone: '#fffefb',
  honey: '#d4aa60',
  darkTeal: '#0c1c1e',
  fgSecondary: '#4a5a54',
  border: '#e4e2dc',
  borderLight: '#eceae4',
  bgPage: '#f7f5f0',
};

const VERDICT_COLORS = {
  'below-market': { bg: '#e6f4ea', fg: '#1f5132', label: 'Below market' },
  'fair':        { bg: '#fff8e6', fg: '#7a5a14', label: 'Fair price' },
  'market':      { bg: '#f0eee8', fg: '#1a3030', label: 'Market price' },
  'above-market':{ bg: '#fdebd0', fg: '#8a4b00', label: 'Above market' },
  'overpriced':  { bg: '#fbe1e1', fg: '#8a1c1c', label: 'Overpriced' },
};

function formatPrice(d) {
  if (d == null || !Number.isFinite(d)) return '—';
  return `$${Math.round(d)}`;
}

function planeTypePagePath(canonical) {
  if (!canonical || canonical.canonical_type !== 'Bench Plane') return null;
  if (!canonical.canonical_model) return null;
  const slug = (s) => String(s)
    .trim().toLowerCase().replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  // Brand-slug normalization mirrors src/data/stanleyBenchPlanes.js
  const brand = canonical.canonical_brand;
  let brandSlug = slug(brand);
  if (brand === 'Stanley-Bailey') brandSlug = 'stanley'; // collapse for the page URL
  const modelSlug = slug(canonical.canonical_model);
  if (Number.isInteger(canonical.plane_type_number)) {
    return `/planes/${brandSlug}/${modelSlug}/type-${canonical.plane_type_number}`;
  }
  return `/planes/${brandSlug}/${modelSlug}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const VerdictBadge = ({ verdict }) => {
  if (!verdict) return null;
  const style = VERDICT_COLORS[verdict.band] || VERDICT_COLORS.market;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 12,
        padding: '14px 18px',
        borderRadius: 10,
        background: style.bg,
        color: style.fg,
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
        {style.label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 500 }}>{verdict.copy}</div>
    </div>
  );
};

const StatCard = ({ kind, count, p25, p50, p75, footnote }) => (
  <div
    style={{
      flex: 1,
      minWidth: 240,
      padding: '14px 16px',
      background: kind === 'sold' ? COLORS.spruce : COLORS.bone,
      color: kind === 'sold' ? '#f2f0eb' : COLORS.spruce,
      border: kind === 'sold' ? 'none' : `1px solid ${COLORS.border}`,
      borderRadius: 8,
      fontFamily: "'Outfit', sans-serif",
    }}
  >
    <div style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em', opacity: 0.75, marginBottom: 6 }}>
      {kind === 'sold' ? 'Recent sold prices' : 'Currently asking'}
    </div>
    <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.1 }}>{formatPrice(p50)}</div>
    <div style={{ fontSize: 13, marginTop: 4, opacity: 0.85 }}>
      Range {formatPrice(p25)}–{formatPrice(p75)} · {count} comp{count === 1 ? '' : 's'}
    </div>
    {footnote && <div style={{ fontSize: 11, marginTop: 8, opacity: 0.7 }}>{footnote}</div>}
  </div>
);

const ListingSummaryCard = ({ listing }) => {
  if (!listing) return null;
  const heroImg = (listing.images && listing.images[0]) || null;
  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        padding: 16,
        background: COLORS.bone,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
      }}
    >
      {heroImg && (
        <img
          src={heroImg}
          alt=""
          style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: COLORS.fgSecondary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          The listing you're checking
        </div>
        <div style={{ fontSize: 15, fontWeight: 500, color: COLORS.spruce, marginBottom: 6, lineHeight: 1.3 }}>
          {listing.title}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.honey }}>{formatPrice(listing.price)}</div>
          {listing.condition && (
            <div style={{ fontSize: 12, color: COLORS.fgSecondary }}>{listing.condition}</div>
          )}
        </div>
        {listing.source_url && (
          <a
            href={listing.source_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-block', marginTop: 10, fontSize: 12, color: COLORS.honey, fontWeight: 600, textDecoration: 'none' }}
          >
            View on source ↗
          </a>
        )}
      </div>
    </div>
  );
};

const TypologyHeader = ({ canonical }) => {
  if (!canonical) return null;
  const planePath = planeTypePagePath(canonical);
  const parts = [canonical.canonical_brand, canonical.canonical_model].filter(Boolean);
  if (Number.isInteger(canonical.plane_type_number)) {
    parts.push(`Type ${canonical.plane_type_number}`);
  }
  const heading = parts.join(' ');
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: COLORS.fgSecondary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
        What you're looking at
      </div>
      <h2 style={{ fontFamily: "'Petrona', serif", fontSize: 24, fontWeight: 600, margin: 0, color: COLORS.spruce }}>
        {heading || 'Identification pending'}
      </h2>
      {canonical.canonical_type && (
        <div style={{ fontSize: 13, color: COLORS.fgSecondary, marginTop: 4 }}>
          {canonical.canonical_type}
        </div>
      )}
      {planePath && (
        <Link
          to={planePath}
          style={{ display: 'inline-block', marginTop: 8, fontSize: 12, color: COLORS.honey, fontWeight: 600, textDecoration: 'none' }}
        >
          See full reference page for this variant ↗
        </Link>
      )}
    </div>
  );
};

const AlternativesList = ({ alternatives, currentPrice }) => {
  if (!alternatives || alternatives.length === 0) return null;
  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontFamily: "'Petrona', serif", fontSize: 18, fontWeight: 600, margin: '0 0 12px', color: COLORS.spruce }}>
        {Number.isFinite(currentPrice) ? 'Want a better deal? Cheaper listings:' : 'Currently for sale:'}
      </h3>
      <div style={{ background: COLORS.bone, border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: 'hidden' }}>
        {alternatives.map((alt, i) => (
          <a
            key={alt.id}
            href={alt.source_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('check_alternative_clicked', { position: i, price: alt.price })}
            style={{
              display: 'flex',
              gap: 12,
              padding: '10px 14px',
              borderBottom: i < alternatives.length - 1 ? `1px solid ${COLORS.borderLight}` : 'none',
              textDecoration: 'none',
              color: COLORS.spruce,
              alignItems: 'center',
            }}
          >
            {alt.image_url && (
              <img src={alt.image_url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {alt.title}
            </div>
            <div style={{ color: COLORS.honey, fontWeight: 600, fontSize: 14 }}>{formatPrice(alt.price)}</div>
          </a>
        ))}
      </div>
    </div>
  );
};

const ShareStrip = ({ hash }) => {
  const [copied, setCopied] = useState(false);
  if (!hash) return null;
  const url = `${window.location.origin}/check/${hash}`;
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      track('check_share_copied', { hash });
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Fallback — select the text
      const sel = window.getSelection();
      sel.selectAllChildren(document.getElementById(`share-url-${hash}`));
    }
  };
  return (
    <div style={{ marginTop: 24, padding: '12px 14px', background: COLORS.bone, border: `1px solid ${COLORS.border}`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 11, color: COLORS.fgSecondary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Share</div>
      <div id={`share-url-${hash}`} style={{ flex: 1, fontSize: 13, color: COLORS.spruce, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {url}
      </div>
      <button
        onClick={onCopy}
        style={{
          padding: '6px 12px',
          background: COLORS.honey,
          color: COLORS.darkTeal,
          border: 'none',
          borderRadius: 6,
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 600,
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  );
};

// ─── Main page ───────────────────────────────────────────────────────────────

const CheckPage = () => {
  const { hash } = useParams();
  const navigate = useNavigate();

  const [urlInput, setUrlInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // human-readable transient status
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [loadingHash, setLoadingHash] = useState(!!hash);

  // Load persisted snapshot when /check/:hash
  useEffect(() => {
    if (!hash) {
      setResult(null);
      setLoadingHash(false);
      return undefined;
    }
    let cancelled = false;
    setLoadingHash(true);
    setError(null);
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'dealChecks', hash));
        if (cancelled) return;
        if (!snap.exists()) {
          setError('That check link no longer exists.');
          setResult(null);
        } else {
          setResult({ ...snap.data(), hash });
          track('check_snapshot_viewed', { hash, input_type: snap.data().input_type });
        }
      } catch (e) {
        if (!cancelled) setError('Could not load that check.');
      } finally {
        if (!cancelled) setLoadingHash(false);
      }
    })();
    return () => { cancelled = true; };
  }, [hash]);

  // Document title
  useEffect(() => {
    document.title = 'Benchlot';
  }, [hash, result]);

  const submitUrl = useCallback(async (e) => {
    if (e) e.preventDefault();
    if (!urlInput || submitting) return;
    setSubmitting(true);
    setSubmitStatus('Reading the listing…');
    setError(null);
    try {
      const auth = getAuth();
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const headers = { 'Content-Type': 'application/json' };
      if (idToken) headers.Authorization = `Bearer ${idToken}`;
      const resp = await fetch(`${API_URL}/url-check`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Something went wrong.');
      track('check_url_submitted', { hash: data.hash, has_verdict: !!data.verdict, cluster_grain: data.cluster_grain });
      navigate(`/check/${data.hash}`);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setSubmitting(false);
      setSubmitStatus(null);
    }
  }, [urlInput, submitting, navigate]);

  const submitPhoto = useCallback(async (file) => {
    if (!file || submitting) return;
    if (file.size > MAX_FILE_SIZE) {
      setError('Photo is too large (max 5 MB). Try a smaller image.');
      return;
    }
    setSubmitting(true);
    setSubmitStatus('Identifying the tool…');
    setError(null);
    try {
      // 1) Read file → base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          // Strip the "data:image/jpeg;base64," prefix
          resolve(String(result).split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const auth = getAuth();
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const headers = { 'Content-Type': 'application/json' };
      if (idToken) headers.Authorization = `Bearer ${idToken}`;

      // 2) POST /toolscan to identify
      const scanResp = await fetch(`${API_URL}/toolscan`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          images: [{ data: base64, media_type: file.type || 'image/jpeg' }],
        }),
      });
      const scanData = await scanResp.json();
      if (!scanResp.ok) throw new Error(scanData.error || 'Identification failed.');
      const tool = scanData.results && scanData.results.tool;
      if (!tool || !tool.canonical_brand || !tool.canonical_type) {
        throw new Error("We couldn't identify a tool in that photo. Try another angle.");
      }

      setSubmitStatus('Checking comparable sales…');

      // 3) POST /check-from-canonical to do the comp lookup + persist
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
      });

      const checkResp = await fetch(`${API_URL}/check-from-canonical`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          canonical_brand: tool.canonical_brand,
          canonical_type: tool.canonical_type,
          canonical_model: tool.canonical_model || null,
          plane_type_number: Number.isInteger(tool.plane_type_number) ? tool.plane_type_number : null,
          source_label: 'photo',
          listing_summary: {
            title: [tool.canonical_brand, tool.canonical_model, tool.plane_type_number ? `Type ${tool.plane_type_number}` : null]
              .filter(Boolean).join(' '),
            condition: tool.condition || null,
            // Store the user's photo as data URL for the share permalink view
            images: [dataUrl],
          },
        }),
      });
      const checkData = await checkResp.json();
      if (!checkResp.ok) throw new Error(checkData.error || 'Comp lookup failed.');
      track('check_photo_submitted', { hash: checkData.hash, has_verdict: !!checkData.verdict });
      navigate(`/check/${checkData.hash}`);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setSubmitting(false);
      setSubmitStatus(null);
    }
  }, [submitting, navigate]);

  // ─── Render: loading hash snapshot ────────────────────────────────────────
  if (loadingHash) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: COLORS.fgSecondary, fontFamily: "'Outfit', sans-serif" }}>
        Loading…
      </div>
    );
  }

  // ─── Render: result (either freshly submitted via redirect, or snapshot) ──
  if (result) {
    const { listing, verdict, reference, alternatives, hash: resultHash } = result;
    return (
      <div
        style={{
          maxWidth: 880,
          margin: '0 auto',
          padding: '24px 20px 64px',
          fontFamily: "'Outfit', sans-serif",
          color: COLORS.spruce,
        }}
      >
        <Link to="/check" style={{ color: COLORS.fgSecondary, fontSize: 12, textDecoration: 'none' }}>
          ← Check another tool
        </Link>

        <h1 style={{ fontFamily: "'Petrona', serif", fontSize: 28, fontWeight: 600, margin: '8px 0 24px' }}>
          Benchlot
        </h1>

        {listing && listing.canonical && <TypologyHeader canonical={listing.canonical} />}

        {verdict && (
          <div style={{ marginBottom: 20 }}>
            <VerdictBadge verdict={verdict} />
          </div>
        )}

        {result.input_type === 'url' && listing && (
          <div style={{ marginBottom: 20 }}>
            <ListingSummaryCard listing={listing} />
          </div>
        )}

        {reference ? (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <StatCard
              kind={reference.source}
              count={reference.count}
              p25={reference.p25}
              p50={reference.p50}
              p75={reference.p75}
              footnote={reference.source === 'sold' ? 'Recent sold comps from indexed sources' : 'Currently active asking prices'}
            />
          </div>
        ) : (
          <div
            style={{
              padding: '14px 16px',
              background: COLORS.bone,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              color: COLORS.fgSecondary,
              fontSize: 13,
            }}
          >
            We don't have enough comparable sales for this exact tool yet to give a confident price reference. Identification is shown above; check back as more listings get indexed.
          </div>
        )}

        <AlternativesList
          alternatives={alternatives}
          currentPrice={listing && listing.price}
        />

        <ShareStrip hash={resultHash} />

        <p style={{ marginTop: 32, fontSize: 11, color: COLORS.fgSecondary, maxWidth: 720 }}>
          Comparable sales sourced from indexed listings across eBay, dealer sites, forum classifieds, and Reddit. Not an appraisal.
        </p>
      </div>
    );
  }

  // ─── Render: empty input form ─────────────────────────────────────────────
  return (
    <div
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '40px 20px 64px',
        fontFamily: "'Outfit', sans-serif",
        color: COLORS.spruce,
      }}
    >
      <h1 style={{ fontFamily: "'Petrona', serif", fontSize: 36, fontWeight: 600, margin: '0 0 12px', lineHeight: 1.15 }}>
        Snap a photo or paste a listing URL.
      </h1>
      <p style={{ fontSize: 15, color: COLORS.fgSecondary, marginBottom: 32, lineHeight: 1.5 }}>
        We'll tell you what it is and how the price compares to recent sold and current asking prices for the same tool.
      </p>

      {/* URL input */}
      <form onSubmit={submitUrl} style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: COLORS.fgSecondary, marginBottom: 8 }}>
          Paste a listing URL
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://www.ebay.com/itm/123456789012"
            disabled={submitting}
            style={{
              flex: 1,
              padding: '12px 14px',
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              fontSize: 14,
              fontFamily: "'Outfit', sans-serif",
              background: COLORS.bone,
              color: COLORS.spruce,
            }}
          />
          <button
            type="submit"
            disabled={submitting || !urlInput.trim()}
            style={{
              padding: '12px 22px',
              background: COLORS.honey,
              color: COLORS.darkTeal,
              border: 'none',
              borderRadius: 8,
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 600,
              fontSize: 14,
              cursor: submitting || !urlInput.trim() ? 'not-allowed' : 'pointer',
              opacity: submitting || !urlInput.trim() ? 0.6 : 1,
            }}
          >
            Check
          </button>
        </div>
        <div style={{ fontSize: 11, color: COLORS.fgSecondary, marginTop: 6 }}>
          Currently supports eBay listings.
        </div>
      </form>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 24px', color: COLORS.fgSecondary, fontSize: 12 }}>
        <div style={{ flex: 1, height: 1, background: COLORS.border }} />
        <div>or</div>
        <div style={{ flex: 1, height: 1, background: COLORS.border }} />
      </div>

      {/* Photo upload */}
      <div>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: COLORS.fgSecondary, marginBottom: 8 }}>
          Upload a photo
        </div>
        <label
          style={{
            display: 'block',
            padding: '32px 16px',
            border: `2px dashed ${COLORS.border}`,
            borderRadius: 8,
            background: COLORS.bone,
            textAlign: 'center',
            cursor: submitting ? 'not-allowed' : 'pointer',
            color: COLORS.fgSecondary,
            opacity: submitting ? 0.6 : 1,
          }}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            disabled={submitting}
            onChange={(e) => {
              const f = e.target.files && e.target.files[0];
              if (f) submitPhoto(f);
            }}
            style={{ display: 'none' }}
          />
          <div style={{ fontSize: 14, fontWeight: 500, color: COLORS.spruce, marginBottom: 4 }}>
            Drop a photo or tap to choose
          </div>
          <div style={{ fontSize: 12 }}>JPEG, PNG, WebP, or HEIC · up to 5 MB</div>
        </label>
        <div style={{ fontSize: 11, color: COLORS.fgSecondary, marginTop: 6 }}>
          Best results: hand planes, photographed clearly with the frog visible.
        </div>
      </div>

      {/* Transient status */}
      {submitting && (
        <div
          style={{
            marginTop: 24,
            padding: '14px 16px',
            background: COLORS.bone,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            color: COLORS.fgSecondary,
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          {submitStatus || 'Working…'}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            marginTop: 16,
            padding: '12px 14px',
            background: '#fbe1e1',
            border: '1px solid #f5b7b7',
            borderRadius: 8,
            color: '#8a1c1c',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default CheckPage;
