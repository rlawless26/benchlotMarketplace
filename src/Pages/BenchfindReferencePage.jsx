import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

import {
  parseBrandSlug,
  parseModelSlug,
  parseTypeSlug,
  getStanleyTypeStudy,
  getStanleyModel,
} from '../data/stanleyBenchPlanes';
import { getAggregatedListings } from '../firebase/adapters/externalListingAdapter';
import usePriceStats from '../firebase/hooks/usePriceStats';
import { pickReference } from '../utils/priceStats';
import { CategoryBadge } from '../components/benchfind/badges';

/**
 * Benchfind plane reference page.
 *
 * Routes (under host=benchfind):
 *   /planes/:brandSlug/:modelSlug
 *   /planes/:brandSlug/:modelSlug/:typeSlug
 *
 * Long-form editorial layout — breadcrumb, category badge + era, Petrona
 * title, italic lede, "How to identify" bullets, "Common misidentifications"
 * prose, right rail with "At a glance" + "For sale now" sidebars.
 *
 * Type-specific prose lives on STANLEY_BENCH_PLANE_TYPES[N].lead/identify/
 * misidentifications. Per-model info pulls from STANLEY_BENCH_PLANE_MODELS.
 */

// Inline markdown-lite renderer: converts `**bold**` and `` `code` `` runs
// to React fragments. Keeps the per-type identify-bullet markup simple.
function renderInline(text) {
  if (!text) return null;
  const parts = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    const boldStart = text.indexOf('**', i);
    const codeStart = text.indexOf('`', i);
    const next = (boldStart === -1 ? Infinity : boldStart) <= (codeStart === -1 ? Infinity : codeStart)
      ? boldStart : codeStart;
    if (next === -1 || next === Infinity) {
      parts.push(text.slice(i));
      break;
    }
    if (next > i) parts.push(text.slice(i, next));
    if (next === boldStart) {
      const close = text.indexOf('**', boldStart + 2);
      if (close === -1) { parts.push(text.slice(boldStart)); break; }
      parts.push(<strong key={`b${key++}`} className="text-ink-900 font-semibold">{text.slice(boldStart + 2, close)}</strong>);
      i = close + 2;
    } else {
      const close = text.indexOf('`', codeStart + 1);
      if (close === -1) { parts.push(text.slice(codeStart)); break; }
      parts.push(<code key={`c${key++}`} className="font-mono text-[13px] text-ink-800 bg-paper-100 px-1 py-[1px] rounded-xs">{text.slice(codeStart + 1, close)}</code>);
      i = close + 1;
    }
  }
  return parts;
}

const BenchfindReferencePage = () => {
  const { brandSlug, modelSlug, typeSlug } = useParams();

  const brand = useMemo(() => parseBrandSlug(brandSlug), [brandSlug]);
  const canonicalModel = useMemo(() => parseModelSlug(modelSlug), [modelSlug]);
  const planeTypeNumber = useMemo(() => parseTypeSlug(typeSlug), [typeSlug]);
  const modelInfo = useMemo(() => getStanleyModel(canonicalModel), [canonicalModel]);
  const typeStudy = useMemo(() => getStanleyTypeStudy(planeTypeNumber), [planeTypeNumber]);

  const priceStats = usePriceStats({
    canonical_type: 'Bench Plane',
    canonical_brand: brand?.canonical || null,
    canonical_size: canonicalModel || null,
  });

  const [activeListings, setActiveListings] = useState([]);
  const [activeLoaded, setActiveLoaded] = useState(false);
  useEffect(() => {
    if (!canonicalModel || !brand) return;
    let cancelled = false;
    setActiveLoaded(false);
    getAggregatedListings({
      canonicalType: 'Bench Plane',
      canonicalBrand: brand.canonical,
      limit: 6,
    })
      .then(({ tools }) => {
        if (cancelled) return;
        const filtered = tools.filter((t) => {
          if (canonicalModel && t.canonical_model && t.canonical_model !== canonicalModel) {
            return false;
          }
          return true;
        }).slice(0, 4);
        setActiveListings(filtered);
        setActiveLoaded(true);
      })
      .catch(() => { if (!cancelled) { setActiveListings([]); setActiveLoaded(true); } });
    return () => { cancelled = true; };
  }, [brand, canonicalModel]);

  useEffect(() => {
    const parts = ['Benchfind'];
    if (brand) parts.unshift(brand.canonical);
    if (canonicalModel) parts.unshift(canonicalModel);
    if (typeStudy) parts.unshift(typeStudy.label);
    document.title = parts.reverse().join(' · ');
  }, [brand, canonicalModel, typeStudy]);

  if (!brand || !canonicalModel) {
    return (
      <div className="bg-paper-50 min-h-screen px-6 py-12">
        <div className="max-w-[720px] mx-auto font-sans text-ink-700">
          <p>That reference page isn’t indexed yet.</p>
          <Link to="/" className="text-forest-700 hover:text-forest-900 font-medium">Back to Benchfind →</Link>
        </div>
      </div>
    );
  }

  const ref = pickReference(priceStats.stats);
  const compBand = ref
    ? { low: Math.round(ref.p25), high: Math.round(ref.p75), count: ref.count }
    : null;

  const headerTitle = `${brand.canonical} ${canonicalModel}${typeStudy ? ` · ${typeStudy.label}` : ''}`;

  return (
    <div className="bg-paper-50 min-h-screen px-6 lg:px-8 py-8">
      <div className="max-w-[1080px] mx-auto">
        {/* Breadcrumb */}
        <nav className="font-sans text-[13px] text-ink-500 mb-3 flex items-center gap-1 flex-wrap">
          <Link to="/" className="text-ink-600 hover:text-ink-900 no-underline">Planes</Link>
          <ChevronRight size={13} strokeWidth={1.75} className="text-ink-400" />
          <Link to={`/planes/${brandSlug}`} className="text-ink-600 hover:text-ink-900 no-underline">{brand.canonical}</Link>
          <ChevronRight size={13} strokeWidth={1.75} className="text-ink-400" />
          <span className="text-ink-900 font-medium">
            {canonicalModel}{typeStudy ? ` · ${typeStudy.label}` : ''}
          </span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 lg:gap-12">
          {/* Main column */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CategoryBadge>Bench Plane{modelInfo?.name?.toLowerCase().includes('jack') ? ' · Jack' : ''}</CategoryBadge>
              {typeStudy && (
                <span className="font-sans text-xs text-ink-500">{typeStudy.years}</span>
              )}
            </div>
            <h1 className="m-0 font-display font-medium text-ink-900 leading-[1.05] tracking-tight"
              style={{ fontSize: 'clamp(36px, 5vw, 48px)' }}>
              {headerTitle}
            </h1>
            {typeStudy?.lead && (
              <p className="mt-5 font-display italic text-ink-700 leading-[1.55]"
                style={{ fontSize: 21 }}>
                {typeStudy.lead}
              </p>
            )}
            {!typeStudy?.lead && modelInfo && (
              <p className="mt-5 font-display italic text-ink-700 leading-[1.55]"
                style={{ fontSize: 21 }}>
                {modelInfo.name}. {modelInfo.commonality}.
              </p>
            )}

            {/* How to identify */}
            {typeStudy?.identify && (
              <section className="mt-10">
                <h2 className="font-display font-medium text-ink-900 text-[24px] tracking-tight m-0">How to identify</h2>
                <ul className="mt-4 list-disc pl-5 marker:text-ink-400 space-y-2">
                  {typeStudy.identify.map((line, i) => (
                    <li key={i} className="font-sans text-[15px] text-ink-700 leading-[1.55]">
                      {renderInline(line)}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Common misidentifications */}
            {typeStudy?.misidentifications && (
              <section className="mt-8">
                <h2 className="font-display font-medium text-ink-900 text-[24px] tracking-tight m-0">Common misidentifications</h2>
                <p className="mt-4 font-sans text-[15px] text-ink-700 leading-[1.6]">
                  {typeStudy.misidentifications}
                </p>
              </section>
            )}

            {/* No type prose yet — fall back to features summary */}
            {!typeStudy?.identify && typeStudy?.features && (
              <section className="mt-10">
                <h2 className="font-display font-medium text-ink-900 text-[24px] tracking-tight m-0">Type features</h2>
                <p className="mt-4 font-sans text-[15px] text-ink-700 leading-[1.6]">
                  {typeStudy.features}
                </p>
              </section>
            )}
          </div>

          {/* Right rail */}
          <aside className="flex flex-col gap-4">
            <div className="bg-white rounded-lg p-5" style={{ boxShadow: 'inset 0 0 0 1px #DDD2B9' }}>
              <span className="font-sans text-[11px] font-semibold text-ink-500 uppercase tracking-[0.06em]">At a glance</span>
              <dl className="mt-3 flex flex-col gap-2">
                {typeStudy && (
                  <div className="flex justify-between">
                    <dt className="font-sans text-xs text-ink-500">Era</dt>
                    <dd className="font-mono text-xs text-ink-800">{typeStudy.years}</dd>
                  </div>
                )}
                {modelInfo?.length && (
                  <div className="flex justify-between">
                    <dt className="font-sans text-xs text-ink-500">Length</dt>
                    <dd className="font-mono text-xs text-ink-800">{modelInfo.length}</dd>
                  </div>
                )}
                {modelInfo?.iron_width && (
                  <div className="flex justify-between">
                    <dt className="font-sans text-xs text-ink-500">Iron</dt>
                    <dd className="font-mono text-xs text-ink-800">{modelInfo.iron_width}</dd>
                  </div>
                )}
                {compBand && (
                  <div className="flex justify-between">
                    <dt className="font-sans text-xs text-ink-500">Comp band</dt>
                    <dd className="font-mono text-xs text-ink-800">
                      ${compBand.low}–<span className="text-brass-700">${compBand.high}</span>
                    </dd>
                  </div>
                )}
                {modelInfo?.commonality && (
                  <div className="flex justify-between">
                    <dt className="font-sans text-xs text-ink-500">Commonality</dt>
                    <dd className="font-sans text-xs text-ink-700">{modelInfo.commonality}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* For sale now */}
            <div className="bg-white rounded-lg p-5" style={{ boxShadow: 'inset 0 0 0 1px #DDD2B9' }}>
              <span className="font-sans text-[11px] font-semibold text-ink-500 uppercase tracking-[0.06em]">
                For sale now {activeLoaded && activeListings.length > 0 ? `· ${activeListings.length}` : ''}
              </span>
              {!activeLoaded && (
                <p className="mt-3 font-sans text-xs text-ink-500">Searching…</p>
              )}
              {activeLoaded && activeListings.length === 0 && (
                <p className="mt-3 font-sans text-xs text-ink-500">No matching listings right now.</p>
              )}
              {activeLoaded && activeListings.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {activeListings.map((listing) => (
                    <a
                      key={listing.id}
                      href={listing.source_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="grid items-center gap-[10px] no-underline hover:opacity-90"
                      style={{ gridTemplateColumns: '48px 1fr auto' }}
                    >
                      <div
                        className="w-12 h-12 rounded-sm overflow-hidden bg-ink-900"
                        style={{
                          backgroundImage: listing.imageUrl ? `url(${listing.imageUrl})` : 'url(/benchfind/photo-amateur.svg)',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                      <div className="min-w-0">
                        <div className="font-sans text-xs text-ink-900 truncate leading-tight">{listing.name}</div>
                        <div className="font-sans text-[10px] text-ink-500 mt-[2px]">
                          {listing.sourceName || listing.source}
                        </div>
                      </div>
                      <span className="font-mono text-[13px] font-semibold text-ink-900">
                        {Number.isFinite(listing.price) ? `$${Math.round(listing.price)}` : '—'}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default BenchfindReferencePage;
