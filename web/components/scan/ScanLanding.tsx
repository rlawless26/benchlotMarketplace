import Link from 'next/link';
import ScanExampleCard from './ScanExampleCard';

/**
 * Everything on /scan that is true before a photo is chosen. Server-rendered
 * and static, so ChatGPT's fetcher, GPTBot and Googlebot read a real page
 * instead of "You need to enable JavaScript". The upload control itself is
 * rendered by ScanClient around this.
 */
export default function ScanLanding({ upload }: { upload: React.ReactNode }) {
  return (
    <div>
      <section className="text-center">
        <h1 className="font-display text-4xl font-semibold text-spruce sm:text-5xl">
          Identify a tool from a photo
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-spruce-light">
          Photograph a hand tool or a machine and Benchlot names the maker, model, era and condition,
          then shows what that tool has actually sold for and what is listed right now.
          No account, nothing to install.
        </p>
        <div className="mx-auto mt-8 max-w-xl">{upload}</div>
        <p className="mt-3 text-sm text-spruce-light">Free · JPEG, PNG, WebP or HEIC · photos are shrunk before upload</p>
      </section>

      <section className="mt-16">
        <h2 className="text-center font-display text-2xl font-semibold text-spruce">What a result looks like</h2>
        <div className="mx-auto mt-6 max-w-3xl">
          <ScanExampleCard />
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-3xl">
        <h2 className="text-center font-display text-2xl font-semibold text-spruce">How it works</h2>
        <ol className="mt-8 grid gap-8 sm:grid-cols-3">
          {[
            ['Snap', 'Photograph the tool. One clear photo is usually enough; maker’s marks, medallions and castings help most.'],
            ['Identify', 'Benchlot names the tool, the maker, the era and the condition, and says how confident it is.'],
            ['Compare', 'See the recorded sale prices for that tool and the matching listings for sale now, linked straight to the seller.'],
          ].map(([h, p], i) => (
            <li key={h} className="text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-spruce font-display text-lg font-semibold text-bone">{i + 1}</div>
              <h3 className="font-display text-lg font-semibold text-dark-teal">{h}</h3>
              <p className="mt-1 text-sm text-spruce-light">{p}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16">
        <h2 className="text-center font-display text-2xl font-semibold text-spruce">Who it is for</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            ['Inherited a tool?', 'You do not need to become an expert in someone else’s hobby to understand what they left behind. Photograph the tools and find out what they are and what they are worth.'],
            ['Found one at a sale?', 'Check a flea-market or estate-sale find against recorded sales before you pay. Asking prices run high; the guide shows what tools actually sold for.'],
            ['Pricing one to sell?', 'See the middle of the market for your exact tool, then list it where buyers are looking.'],
          ].map(([h, p]) => (
            <div key={h} className="rounded-xl border border-bone-dark bg-bone-light p-6">
              <h3 className="font-display text-lg font-semibold text-spruce">{h}</h3>
              <p className="mt-3 text-spruce-light">{p}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-md text-center">
        <h2 className="font-display text-2xl font-semibold text-spruce">Or skip the scan</h2>
        <p className="mt-3 text-spruce-light">
          Already know what you have? Look it up in the price guide, or search every listing Benchlot indexes
          and save an alert for the next one.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/guide" className="rounded bg-honey px-5 py-2.5 font-medium text-dark-teal hover:bg-honey-light">Price guide</Link>
          <a href="/search" className="rounded border border-bone-dark bg-bone-light px-5 py-2.5 font-medium text-spruce hover:border-honey">Search listings</a>
        </div>
      </section>
    </div>
  );
}
