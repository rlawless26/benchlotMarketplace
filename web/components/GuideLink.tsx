'use client';

import Link from 'next/link';
import { track, GUIDE_LINK_EVENT } from '@/lib/analytics';

/**
 * A next/link between guide pages that says what kind of link it was.
 *
 * Only 12.7% of sessions see a second page, and until now nothing said
 * which internal links the other 87% ignored: autocapture records a click
 * on an anchor, not that it was the size chip, the model list or the
 * breadcrumb. `guide_link_clicked` carries `kind` and the page's cluster
 * key so the plan's internal-linking work can be judged chip by chip.
 */
export type GuideLinkKind =
  | 'breadcrumb' | 'size' | 'model' | 'plane_type' | 'related_brand' | 'brand_hub' | 'hub_type' | 'type_hub' | 'listings';

export default function GuideLink({
  href, kind, clusterKey = null, className, children,
}: {
  href: string;
  kind: GuideLinkKind;
  /** The page the click happened on, not the destination. */
  clusterKey?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => track(GUIDE_LINK_EVENT, { kind, cluster_key: clusterKey, href })}
    >
      {children}
    </Link>
  );
}
