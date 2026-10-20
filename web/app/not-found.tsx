import Link from 'next/link';
import SearchForm from '@/components/SearchForm';
import NotFoundPing from '@/components/NotFoundPing';

/**
 * The guide's 404. A retired size or brand spelling 301s before it gets
 * here (redirectTarget), so what lands here is a tool the guide has no
 * page for yet: offer the search, the index and the scanner rather than a
 * dead end, and record the path.
 */
export default function NotFound() {
  return (
    <div className="max-w-2xl">
      <NotFoundPing />
      <h1 className="font-display text-3xl font-semibold text-spruce">No page here yet</h1>
      <p className="mt-3 text-spruce-light">
        The guide has pages for tools with at least eight recorded sales or ten listings. This one
        has neither, or the address is not quite right. Search the guide for the maker, or scan a photo
        of the tool to see the nearest reference.
      </p>
      <div className="mt-6">
        <SearchForm />
      </div>
      <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <li><Link href="/guide" className="text-honey-dark hover:underline">Every tool in the guide</Link></li>
        <li><Link href="/scan" className="text-honey-dark hover:underline">Scan a photo</Link></li>
        <li><a href="/search" className="text-honey-dark hover:underline">Search all listings</a></li>
      </ul>
    </div>
  );
}
