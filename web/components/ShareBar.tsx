'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { track, SHARE_EVENT } from '@/lib/analytics';

/**
 * The share row under a guide page's headline number.
 *
 * Woodworkers pass prices around in forum threads, Discord and group chats,
 * and until now the only way to do that from a guide page was the address
 * bar. "Copy the figure" puts the sentence someone would type anyway on the
 * clipboard with the link under it; "Copy link" is the bare URL; the native
 * share sheet appears only where the browser has one (it is decided after
 * hydration so the prerendered HTML is the same everywhere); and the Reddit
 * link opens a prefilled submit form, because r/handtools and r/woodworking
 * are where these pages already get posted.
 *
 * Every tap fires `share_clicked` with the method, so the plan's share
 * hypothesis has a number to read. Nothing here blocks on telemetry.
 */
const noSubscribe = () => () => {};

export default function ShareBar({
  stat, path, title, clusterKey = null, pageType, surface = 'guide_page', className = '',
}: {
  /** The one-sentence figure, without the URL; "Copy the figure" appends it. */
  stat: string;
  /** Site-relative path of the page, e.g. /guide/bench-plane/stanley/no-4. */
  path: string;
  /** Used as the Reddit post title and the native share title. */
  title: string;
  clusterKey?: string | null;
  pageType: 'coarse' | 'fine' | 'model-fine' | 'type-fine' | 'brand_hub' | 'type_hub' | 'report';
  surface?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState<null | 'stat' | 'link'>(null);
  // Server snapshots keep the prerendered HTML identical everywhere; the
  // client re-reads after hydration. Previews and local dev share their own
  // origin, never the canonical one.
  const canShare = useSyncExternalStore(noSubscribe, () => typeof navigator.share === 'function', () => false);
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => 'https://benchlot.com');
  const url = `${origin}${path}`;

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const fire = (method: 'copy_stat' | 'copy_link' | 'native' | 'reddit') =>
    track(SHARE_EVENT, { method, surface, page_type: pageType, cluster_key: clusterKey, path });

  async function copy(text: string, which: 'stat' | 'link') {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
    } catch {
      // Clipboard blocked (insecure context, permissions): fall back to a prompt-free select.
      window.prompt('Copy this:', text);
    }
  }

  const redditHref = `https://www.reddit.com/submit?${new URLSearchParams({ url, title }).toString()}`;
  const btn = 'rounded border border-bone-dark bg-bone px-3 py-1.5 text-sm text-spruce hover:border-honey';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} data-share-bar>
      <span className="mr-1 text-sm text-spruce-light">Share:</span>
      <button type="button" className={btn} onClick={() => { fire('copy_stat'); copy(`${stat}\n${url}`, 'stat'); }}>
        {copied === 'stat' ? 'Copied' : 'Copy the figure'}
      </button>
      <button type="button" className={btn} onClick={() => { fire('copy_link'); copy(url, 'link'); }}>
        {copied === 'link' ? 'Copied' : 'Copy link'}
      </button>
      {canShare && (
        <button
          type="button" className={btn}
          onClick={() => { fire('native'); navigator.share({ title, text: stat, url }).catch(() => { /* dismissed */ }); }}
        >
          Share…
        </button>
      )}
      <a href={redditHref} target="_blank" rel="noopener" className={btn} onClick={() => fire('reddit')}>
        Post to Reddit
      </a>
    </div>
  );
}
