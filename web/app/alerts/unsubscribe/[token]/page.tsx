import type { Metadata } from 'next';
import Link from 'next/link';
import { unsubscribeAlert, alertSummary } from '@/lib/alerts';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const alert = await unsubscribeAlert(token);

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl font-semibold text-spruce">
        {alert ? 'Unsubscribed' : 'Nothing to unsubscribe'}
      </h1>
      <p className="mt-3 text-spruce-light">
        {alert
          ? <>You won&apos;t hear from us about <strong className="text-spruce">{alertSummary(alert)}</strong> again.</>
          : <>That link doesn&apos;t match an active alert — it may already have been used.</>}
      </p>
      <Link href="/guide" className="mt-6 inline-block rounded bg-honey px-5 py-2.5 font-medium text-dark-teal hover:bg-honey-light">
        Back to the price guide
      </Link>
    </div>
  );
}
