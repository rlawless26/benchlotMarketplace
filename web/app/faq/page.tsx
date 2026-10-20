import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/lib/jsonld';
import { SITE_URL } from '@/lib/site';
import { sql } from '@/lib/db';
import { FRESH_DAYS } from '@/lib/price-guide';

export const revalidate = 3600;

/**
 * benchlot.com/faq, served here through a rewrite from the CRA project.
 *
 * The CRA page (src/Pages/FAQPage.js) rendered these answers inside a JS
 * shell whose one static description still talked about saved searches, so
 * the page a sharer's friend opens read as "enable JavaScript" to crawlers.
 * Same six questions, with the two factual answers (sources, alerts) now
 * drawn from the database and the alert flow as they are today, plus the
 * "where do the prices come from" paragraph the homepage already carries.
 */
export const metadata: Metadata = {
  title: 'Rarely asked questions',
  description:
    'What Benchlot is, which dealers, forums and marketplaces it indexes, where the sold prices come from, how alerts work, and how to get in touch.',
  alternates: { canonical: '/faq' },
  openGraph: {
    title: 'Rarely asked questions · Benchlot',
    description: 'What Benchlot is, what it indexes, where the sold prices come from, and how alerts work.',
    url: '/faq',
    type: 'website',
    images: ['/og-image.png'],
  },
};

const CONTACT = 'rob@benchlot.com';

type Source = { name: string; kind: string };

/** Sources with a live listing in the freshness window, dealers first. */
async function liveSources(): Promise<Source[]> {
  return sql<Source>(
    `SELECT s.name, s.kind::text AS kind
     FROM sources s
     WHERE EXISTS (
       SELECT 1 FROM listings l
       WHERE l.source = s.id AND l.status = 'active' AND l.last_seen_at > now() - interval '${FRESH_DAYS} days'
     )
     ORDER BY CASE s.kind::text WHEN 'Dealer' THEN 0 WHEN 'Forum' THEN 1 ELSE 2 END, s.name`
  );
}

const listNames = (names: string[]) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

export default async function FaqPage() {
  const sources = await liveSources();
  const dealers = sources.filter((s) => s.kind === 'Dealer').map((s) => s.name);
  const forums = sources.filter((s) => s.kind === 'Forum').map((s) => s.name);
  const markets = sources.filter((s) => s.kind !== 'Dealer' && s.kind !== 'Forum').map((s) => s.name);

  const sourcesAnswer = [
    dealers.length ? `Dealers: ${listNames(dealers)}.` : null,
    forums.length ? `Forum classifieds: ${listNames(forums)}.` : null,
    markets.length ? `Marketplaces: ${listNames(markets)}.` : null,
    'The price guide’s recorded sales also draw on the Jim Bode Value Guide archive.',
  ].filter(Boolean).join(' ');

  const questions: { q: string; a: string; html?: React.ReactNode }[] = [
    {
      q: 'What is Benchlot?',
      a: 'A free search engine that pulls used woodworking tool listings, hand tools and power tools alike, from dealers, forums, auction houses and marketplaces into one place, and keeps the ones that sold as a price record. It is a hobby project, built because the alternative was keeping fifteen tabs open.',
    },
    {
      q: 'Why use Benchlot?',
      a: 'Instead of checking a dozen sites every week to find the tool you want, check one. Benchlot brings the listings to you, searchable, filterable and sorted by whatever you care about, and tells you what the same tool has actually sold for.',
    },
    {
      q: 'Does Benchlot sell tools?',
      a: 'No. When you find something you want, click through to the source and buy it from them. Benchlot takes nothing from the sale: no affiliate links, no brokering.',
    },
    {
      q: 'What sources do you index?',
      a: sourcesAnswer,
    },
    {
      q: 'Where do the prices in the guide come from?',
      a: 'Benchlot reads public listings from tool dealers, forum classifieds, auction houses and marketplaces every night, sorts them by maker and tool type, and keeps the ones that sold as a price record. The guide quotes a median only when there are at least eight recorded sales; sets, lots and parts are left out of the figures. Sold prices, not asking prices.',
    },
    {
      q: 'What is an alert?',
      a: 'Open the tool’s page in the price guide and use the alert form under its prices: one email when a match is listed anywhere Benchlot indexes. No account, one click to confirm, unsubscribe any time.',
      html: (
        <>
          Open the tool&rsquo;s page in the <Link href="/guide" className="text-honey-dark hover:underline">price guide</Link> and
          use the alert form under its prices: one email when a match is listed anywhere Benchlot indexes.
          No account, one click to confirm, unsubscribe any time.
        </>
      ),
    },
    {
      q: 'How do I contact you or report an issue?',
      a: `Email ${CONTACT}.`,
      html: (
        <>
          Email <a href={`mailto:${CONTACT}`} className="text-honey-dark underline underline-offset-2">{CONTACT}</a>.
        </>
      ),
    },
  ];

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: `${SITE_URL}/faq`,
    mainEntity: questions.map((x) => ({
      '@type': 'Question',
      name: x.q,
      acceptedAnswer: { '@type': 'Answer', text: x.a },
    })),
  };

  return (
    <article className="max-w-2xl">
      <JsonLd data={faqJsonLd} />
      <h1 className="font-display text-4xl font-semibold text-spruce">Rarely asked questions</h1>
      <div className="mt-8 divide-y divide-bone-dark border-y border-bone-dark">
        {questions.map((x) => (
          <section key={x.q} className="py-6">
            <h2 className="font-display text-xl font-semibold text-spruce">{x.q}</h2>
            <p className="mt-2 text-spruce">{x.html ?? x.a}</p>
          </section>
        ))}
      </div>
      <p className="mt-8 text-sm text-spruce-light">
        <Link href="/guide" className="text-honey-dark hover:underline">Price guide</Link>
        {' · '}
        <a href="/search" className="text-honey-dark hover:underline">All listings</a>
        {' · '}
        <Link href="/scan" className="text-honey-dark hover:underline">Scan a tool</Link>
      </p>
    </article>
  );
}
