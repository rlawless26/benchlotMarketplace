'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/analytics';

/** The "scan a photo" button on a guide page, with its click counted. */
export default function ScanLink({ singular }: { singular: string }) {
  const pathname = usePathname();
  return (
    <Link
      href="/scan"
      onClick={() => track('scan_link_clicked', { path: pathname })}
      className="inline-block rounded border border-honey bg-bone px-4 py-2 text-sm font-medium text-dark-teal hover:bg-honey-light"
    >
      Scan a photo of your {singular}
    </Link>
  );
}
