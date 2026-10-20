'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { track, PAGE_NOT_FOUND_EVENT } from '@/lib/analytics';

/**
 * Reports a 404 with the path and the referrer. Search Console shows
 * queries like "stanley no 113 price" landing on URLs the guide does not
 * serve; this is the list of them, with where the link came from.
 */
export default function NotFoundPing() {
  const pathname = usePathname();
  useEffect(() => {
    track(PAGE_NOT_FOUND_EVENT, { path: pathname, referrer: document.referrer || null });
  }, [pathname]);
  return null;
}
