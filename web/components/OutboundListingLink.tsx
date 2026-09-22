'use client';

import { track, GOAL_EVENTS } from '@/lib/analytics';

/**
 * The anchor a guide page uses to send someone to a source listing.
 *
 * Until now these links fired nothing: autocapture is unreliable for
 * `target="_blank"` anchors and carries no listing context, so the guide
 * pages — the acquisition surface — could not report the product's primary
 * goal at all. This fires `listing_clicked_out` with the same shape the CRA
 * app uses, and never blocks the navigation (track() swallows errors).
 */
export default function OutboundListingLink({
  href, children, className,
  listingId, source, sourceKind, priceCents, status, position, clusterKey, surface,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  listingId: string;
  source: string | null;
  sourceKind: string | null;
  priceCents: number | null;
  /** 'sold' rows are comps; 'active' rows are the buyable ones. */
  status: 'sold' | 'active';
  position: number;
  clusterKey: string | null;
  surface: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="nofollow noopener"
      className={className}
      onClick={() =>
        track(GOAL_EVENTS.LISTING_CLICKED_OUT, {
          surface,
          listing_id: listingId,
          source,
          source_kind: sourceKind,
          listing_status: status,
          price_usd: priceCents != null ? priceCents / 100 : null,
          position,
          cluster_key: clusterKey,
        })
      }
    >
      {children}
    </a>
  );
}
