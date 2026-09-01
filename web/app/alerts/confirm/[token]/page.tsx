import type { Metadata } from 'next';
import Link from 'next/link';
import { confirmAlert, alertSummary } from '@/lib/alerts';

export const dynamic = 'force-dynamic';
// A confirmation page must never be indexed: the URL contains a bearer token.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const alert = await confirmAlert(token);

  if (!alert) {
    return (
      <div className="max-w-xl">
        <h1 className="font-display text-3xl font-semibold text-spruce">Link already used</h1>
        <p className="mt-3 text-spruce-light">
          This confirmation link has already been used, or it&apos;s expired. If your alert is
          active you&apos;ll hear from us when something matches — no further action needed.
        </p>
        <Link href="/guide" className="mt-6 inline-block rounded bg-honey px-5 py-2.5 font-medium text-dark-teal hover:bg-honey-light">
          Back to the price guide
        </Link>
      </div>
    );
  }

  const summary = alertSummary(alert);
  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl font-semibold text-spruce">You&apos;re set</h1>
      <p className="mt-3 text-spruce-light">
        We&apos;ll email you when a <strong className="text-spruce">{summary}</strong> is listed
        by any of the dealers, forums and marketplaces we index.
      </p>
      <p className="mt-4 text-sm text-spruce-light">
        No account was created. Every email includes a one-click unsubscribe.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/guide" className="inline-block rounded bg-honey px-5 py-2.5 font-medium text-dark-teal hover:bg-honey-light">
          Browse the price guide
        </Link>
        <Link href={`/alerts/unsubscribe/${alert.unsubscribe_token}`}
              className="inline-block rounded border border-bone-dark px-5 py-2.5 text-spruce hover:border-honey">
          Cancel this alert
        </Link>
      </div>
    </div>
  );
}
