import type { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 3600;

/**
 * Data-use policy for the API and MCP server. Drafted 2026-10-21 alongside
 * the data layer; to be reconciled into /terms when that page moves to Next
 * (growth plan B12). Until then src/Pages/TermsPageAggregator.js §5 points
 * here as the exception to its no-bulk-redistribution clause.
 */
export const metadata: Metadata = {
  title: 'API data-use policy',
  description: 'What you may do with prices and listings from the Benchlot API and MCP server: free, with attribution and a link back to the source.',
  alternates: { canonical: '/developers/policy' },
  robots: { index: true, follow: true },
};

const UPDATED = '2026-10-21';

export default function PolicyPage() {
  return (
    <article className="max-w-2xl">
      <p className="text-sm text-spruce-light"><Link href="/developers" className="text-honey-dark hover:underline">Developers</Link> · Policy</p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-spruce">API data-use policy</h1>
      <p className="mt-2 text-sm text-spruce-light">Last updated {UPDATED}. Applies to <code>/api/v1</code> and <code>/mcp</code>.</p>

      <div className="mt-8 space-y-6 text-spruce">
        <section>
          <h2 className="font-display text-xl font-semibold">What you may do</h2>
          <p className="mt-2">
            Query the API or MCP server, display what it returns, quote it, and build on it: in an assistant, an app, a spreadsheet, a forum post. The data is free, and it will stay free. There is no paid tier and no plan for one.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">What we ask in return</h2>
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            <li>
              <strong>Attribution, with a link.</strong> Every price, statistic or listing you show names Benchlot and links the <code>guide_url</code> (for a price) or <code>source_url</code> (for a listing) that came with it. The text <em>via Benchlot</em> is enough. The attribution object in every response has the exact wording.
            </li>
            <li>
              <strong>Link to the source, unaltered.</strong> A listing belongs to the dealer, forum member or seller who posted it. Send people to them. Do not wrap, shorten, track or add parameters to <code>source_url</code>. We do not either.
            </li>
            <li>
              <strong>No bulk mirroring.</strong> Cache what you need to answer a question; do not re-publish, re-license or sell the dataset, in whole or in part, or stand up a copy of the price guide. Aggregate statistics you compute yourself are yours.
            </li>
            <li>
              <strong>Respect source licences.</strong> eBay asking prices and availability may not be stored past the <code>price_valid_until</code> we return, and never past 24 hours; after that the row says <code>price_status: stale</code> and you fetch the listing itself. Listings from r/handtools are credited <em>via r/handtools</em> and never to an individual.
            </li>
            <li>
              <strong>Respect the limits.</strong> Thirty requests a minute anonymously; more with a free key. Do not rotate keys or addresses to get around them. If you need more, ask.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">What the numbers are</h2>
          <p className="mt-2">
            Statistics over public listings: a median and quartiles of recorded sales, de-duplicated across sources, with multi-item lots and parts listings left out, rebuilt nightly. They describe what sellers asked and buyers paid in the places Benchlot indexes, which skews toward specialist dealers. They are offered without warranty. Read <code>confidence</code>, <code>freshness</code> and <code>coverage</code> on every answer; a confidence of <code>low</code> means fewer than eight recorded sales and no sold median is published, so do not state one.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">What Benchlot is not</h2>
          <p className="mt-2">
            Not a marketplace. Benchlot holds no inventory, brokers nothing, takes no commission and carries no affiliate links. The API carries no tracking parameters. The <Link href="/faq" className="text-honey-dark hover:underline">FAQ</Link> says the same thing in fewer words.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Keys, logs and privacy</h2>
          <p className="mt-2">
            A key is tied to the email address it was sent to and can be revoked on request. We log each request&rsquo;s route, status, latency, key id and a salted hash of the caller&rsquo;s IP, to run the rate limit and to see what agents actually ask for. We never log request bodies, photos sent for identification beyond what the scan feature already stores, or the addresses you submit for alerts beyond the alert itself, which the address holder must confirm by email.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Changes</h2>
          <p className="mt-2">
            Breaking changes to <code>/api/v1</code> get a new version prefix; this policy may change with notice on this page. Questions: <a href="mailto:rob@benchlot.com" className="text-honey-dark underline underline-offset-2">rob@benchlot.com</a>.
          </p>
        </section>
      </div>
    </article>
  );
}
