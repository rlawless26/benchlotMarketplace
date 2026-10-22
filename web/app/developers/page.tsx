import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL } from '@/lib/site';
import { meta as catalogMeta } from '@/lib/api/catalog';
import { KeyRequestForm } from './KeyRequestForm';

export const revalidate = 3600;

/**
 * benchlot.com/developers: the front door for agents and the people who wire
 * them up. Endpoint table, MCP setup, limits, the attribution ask, and a
 * key request form. Numbers come from the same catalogue the API serves.
 */
export const metadata: Metadata = {
  title: 'API and MCP server',
  description: 'Free JSON API and MCP server for used woodworking tool prices, listings and identification. Attribution required, no affiliate links, nothing for sale.',
  alternates: { canonical: '/developers' },
  openGraph: {
    title: 'Benchlot API and MCP server',
    description: 'Prices, listings and identification for used woodworking tools, for your agent or app. Free, with attribution.',
    url: '/developers',
    type: 'website',
    images: ['/og-image.png'],
  },
};

const API = `${SITE_URL}/api/v1`;
const MCP = `${SITE_URL}/mcp`;

const ENDPOINTS: { method: 'GET' | 'POST'; path: string; what: string; key?: boolean }[] = [
  { method: 'GET', path: '/prices?type=&brand=&model=|size=', what: 'What a tool sells for: sold median and quartiles, asking prices, what is for sale now, with confidence, freshness and coverage.' },
  { method: 'GET', path: '/prices/search?q=', what: 'Find price-guide pages by free text.' },
  { method: 'GET', path: '/listings?q=&type=&brand=&status=', what: 'Listings for sale now, or recorded sales. Every row links its source.' },
  { method: 'GET', path: '/listings/{id}', what: 'One listing.' },
  { method: 'GET', path: '/types', what: 'The tool types the guide knows, with evidence counts.' },
  { method: 'GET', path: '/brands?type=', what: 'Makers with price-guide pages.' },
  { method: 'GET', path: '/meta', what: 'Coverage, freshness, sources, thresholds, licensing. Read it first.' },
  { method: 'POST', path: '/identify', what: 'Identify a tool from one to five photos, with the guide band and live listings. 5 scans per 15 minutes without a key, 20 with one.' },
  { method: 'POST', path: '/alerts', what: 'Email alert when a tool is newly listed. The address confirms by email.' },
  { method: 'POST', path: '/keys', what: 'Request a free key by email.' },
];

const TOOLS = ['get_price_guide', 'search_price_guide', 'search_listings', 'get_coverage', 'identify_tool', 'create_alert'];

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded-md bg-spruce p-3 text-sm text-bone"><code>{children}</code></pre>
  );
}

export default async function DevelopersPage() {
  const m = await catalogMeta().catch(() => null);
  const cov = m?.coverage ?? null;
  const pages = m?.price_guide.pages_published ?? null;

  return (
    <article className="max-w-3xl">
      <h1 className="font-display text-4xl font-semibold text-spruce">For agents and the people who build them</h1>
      <p className="mt-3 text-lg text-spruce">
        Everything the price guide knows, as JSON and as an MCP server. Free. Attribution required. Nothing for sale here: every listing links to the dealer, forum or seller it came from.
      </p>
      <p className="mt-2 text-sm text-spruce-light">
        {pages !== null && <>{pages.toLocaleString()} price-guide pages · </>}
        {cov && <>{cov.listings_total.toLocaleString()} listings indexed, {Math.round(cov.pct_in_price_guide * 100)}% in the guide, as of {(cov.as_of ?? '').slice(0, 10)} · </>}
        <Link href="/developers/policy" className="text-honey-dark hover:underline">data-use policy</Link>
      </p>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-spruce">MCP server</h2>
        <p className="mt-2 text-spruce">Streamable HTTP at <code className="text-sm">{MCP}</code>. Six tools: {TOOLS.join(', ')}.</p>
        <p className="mt-3 text-sm font-medium text-spruce">Claude Code</p>
        <Code>{`claude mcp add --transport http benchlot ${MCP}
# optional, raises the limits:
claude mcp add --transport http benchlot ${MCP} --header "Authorization: Bearer bl_live_…"`}</Code>
        <p className="mt-3 text-sm font-medium text-spruce">Claude Desktop, Cursor, and other clients that take an HTTP URL</p>
        <Code>{`{ "mcpServers": { "benchlot": { "type": "http", "url": "${MCP}" } } }`}</Code>
        <p className="mt-3 text-sm font-medium text-spruce">Clients that only speak stdio</p>
        <Code>{`{ "mcpServers": { "benchlot": { "command": "npx", "args": ["-y", "mcp-remote", "${MCP}"] } } }`}</Code>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-spruce">REST API</h2>
        <p className="mt-2 text-spruce">
          Base URL <code className="text-sm">{API}</code>. Machine-readable description at <a href={`${API}/openapi.json`} className="text-honey-dark hover:underline">openapi.json</a>. Every response is <code className="text-sm">{'{ data, meta, errors }'}</code>; <code className="text-sm">meta.attribution</code> says what to print.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-bone-dark text-left text-spruce-light"><th className="py-2 pr-3 font-medium">Endpoint</th><th className="py-2 font-medium">What</th></tr></thead>
            <tbody className="divide-y divide-bone-dark">
              {ENDPOINTS.map((e) => (
                <tr key={e.path}>
                  <td className="py-2 pr-3 align-top whitespace-nowrap"><code>{e.method} {e.path}</code>{e.key && <span className="ml-2 rounded bg-honey/30 px-1.5 py-0.5 text-xs text-spruce">key</span>}</td>
                  <td className="py-2 align-top text-spruce">{e.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm font-medium text-spruce">Example</p>
        <Code>{`curl "${API}/prices?type=bench%20plane&brand=stanley&model=no.%204" | jq '.data | {confidence, sold, guide_url}'`}</Code>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-spruce">Reading the numbers honestly</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-spruce">
          <li><code className="text-sm">confidence</code>: <strong>high</strong> is 20 or more recorded sales, <strong>medium</strong> 8 to 19, <strong>low</strong> fewer than 8. Below 8 no sold median is published; do not state one.</li>
          <li><code className="text-sm">freshness.last_sale_at</code> and <code className="text-sm">sales_last_365d</code> say how current the evidence is. <code className="text-sm">coverage.sources</code> says where it came from; specialist dealers skew prices up.</li>
          <li>Asking prices are not selling prices. The two blocks are kept apart on purpose.</li>
          <li>On listings, <code className="text-sm">price_status: stale</code> means the source does not allow the asking price to be repeated past 24 hours (eBay). Link the listing instead.</li>
          <li>Breaking changes get a new version prefix. <code className="text-sm">/api/v1</code> stays stable.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-spruce">Keys and limits</h2>
        <p className="mt-2 text-spruce">
          Everything works without a key: 30 requests a minute per address, and 5 photo identifications per 15 minutes. A key is free, raises those to 120 and 20, and makes your usage attributable so we can help if something breaks. Send it as <code className="text-sm">Authorization: Bearer bl_live_…</code>. We log route, status, latency, key and a salted hash of the IP; never request bodies.
        </p>
        <KeyRequestForm action={`${API}/keys`} />
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-spruce">What we ask</h2>
        <p className="mt-2 text-spruce">
          Say <em>via Benchlot</em> and link the <code className="text-sm">guide_url</code> or <code className="text-sm">source_url</code> next to any figure or listing you show. Send people to the source, unaltered: no wrapping, no tracking parameters. Don&rsquo;t mirror the dataset. That is the whole <Link href="/developers/policy" className="text-honey-dark hover:underline">policy</Link>.
        </p>
        <p className="mt-2 text-sm text-spruce-light">
          We cannot see what agents do with the answers, and we do not try to: no redirect tracker, no UTM on seller links. Questions: <a href="mailto:rob@benchlot.com" className="text-honey-dark underline underline-offset-2">rob@benchlot.com</a>.
        </p>
      </section>
    </article>
  );
}
