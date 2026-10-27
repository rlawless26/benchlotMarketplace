/**
 * Empty-state fallback for the listings search: the price-guide pages whose
 * maker / type / model best match the query, from the public API
 * (`/api/v1/prices/search`, same data as /guide/search). A zero-result
 * listings search usually means the tool is not for sale right now, not that
 * the guide knows nothing about it; the sold figures are still an answer.
 */
import React, { useEffect, useState } from 'react';
import { track } from '../../utils/analytics';

const API_BASE = process.env.REACT_APP_SEARCH_API_BASE || '';

export default function NearestGuidePages({ query }) {
  const [pages, setPages] = useState(null);

  useEffect(() => {
    const q = (query || '').trim();
    if (q.length < 2) { setPages(null); return undefined; }
    let cancelled = false;
    fetch(`${API_BASE}/api/v1/prices/search?q=${encodeURIComponent(q)}&limit=6`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled) setPages(j?.data ?? []); })
      .catch(() => { if (!cancelled) setPages([]); });
    return () => { cancelled = true; };
  }, [query]);

  if (!pages || pages.length === 0) return null;

  return (
    <div style={{ marginTop: 28, textAlign: 'left', maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
      <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: '#4a5a54', marginBottom: 10 }}>
        Nothing for sale right now, but the price guide has these:
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
        {pages.map((p) => (
          <li key={p.cluster_key}>
            <a
              href={p.guide_url}
              onClick={() => track('guide_link_clicked', { surface: 'search_empty', cluster_key: p.cluster_key, query })}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12,
                padding: '10px 14px', border: '1px solid #e8e6e0', borderRadius: 6, background: '#f8f6f2',
                color: '#1a3030', textDecoration: 'none', fontFamily: "'Outfit', sans-serif", fontSize: 14,
              }}
            >
              <span>{[p.brand, p.model || p.size, p.type].filter(Boolean).join(' ')}</span>
              <span style={{ fontSize: 12, color: '#4a5a54', whiteSpace: 'nowrap' }}>
                {p.sold_count > 0 ? `${p.sold_count} sold` : `${p.for_sale_now} listed`}
                {p.sold_median ? ` · median $${Math.round(p.sold_median)}` : ''}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
