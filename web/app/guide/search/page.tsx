import type { Metadata } from 'next';
import Link from 'next/link';
import SearchForm from '@/components/SearchForm';
import { searchClusters, clusterPath, clusterPhrase } from '@/lib/price-guide';

export const metadata: Metadata = {
  title: 'Search the price guide',
  // Result pages are query-dependent and would only ever be thin duplicates
  // of the cluster pages they link to.
  robots: { index: false, follow: true },
};

type Props = { searchParams: Promise<{ q?: string | string[] }> };

export default async function SearchPage({ searchParams }: Props) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw ?? '').trim().slice(0, 80);
  const results = q ? await searchClusters(q) : [];

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-spruce">Search the price guide</h1>
      <div className="mt-4 max-w-2xl">
        <SearchForm defaultValue={q} />
      </div>

      {q && results.length === 0 && (
        <p className="mt-8 text-spruce-light">
          Nothing in the guide matches &ldquo;{q}&rdquo; yet. Try the maker&rsquo;s name on its own,
          or <Link href="/guide" className="text-honey-dark hover:underline">browse every tool</Link>.
        </p>
      )}

      {results.length > 0 && (
        <>
          <p className="mt-8 text-sm text-spruce-light">
            {results.length} {results.length === 1 ? 'match' : 'matches'} for &ldquo;{q}&rdquo;
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((c) => (
              <li key={c.cluster_key}>
                <Link href={clusterPath(c)}
                      className="flex items-baseline justify-between gap-3 rounded border border-bone-dark bg-bone-light px-3 py-2 text-sm text-spruce hover:border-honey">
                  <span>{clusterPhrase(c)}</span>
                  <span className="tnum shrink-0 text-xs text-spruce-light">
                    {c.sold_count > 0 ? `${c.sold_count} sold` : `${c.asking_count} listed`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
