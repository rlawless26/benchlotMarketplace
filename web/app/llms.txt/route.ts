import {
  listPublishableClusters, listBrandHubs, clusterPath, clusterTitle, brandHubPath, money,
  machineTypeSummaries, typePlural,
} from '@/lib/price-guide';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

/**
 * llms.txt — the guide as an AI assistant should read it.
 *
 * ChatGPT already sends as many visitors as Google (PostHog, Oct 2026), all
 * of them landing on guide pages it has cited. This file tells an assistant
 * what the site is, how the URLs are laid out, how the numbers are computed,
 * and which pages carry the most evidence, so it can cite the right page
 * without crawling 800 of them. Generated from Postgres so the page list is
 * never stale. Served at benchlot.com/llms.txt by a rewrite from the CRA
 * project (root vercel.json).
 */
export async function GET() {
  const [clusters, hubs, machines] = await Promise.all([
    listPublishableClusters({ indexableOnly: true }),
    listBrandHubs({ indexableOnly: true }),
    machineTypeSummaries(4),
  ]);

  const top = clusters.slice(0, 120);
  const abs = (p: string) => `${SITE_URL}${p}`;
  const lines: string[] = [];

  lines.push('# Benchlot');
  lines.push('');
  lines.push(
    '> Recorded sale prices and current listings for used woodworking tools — hand tools and machines — ' +
    'gathered from dealers, forum classifieds, auctions and marketplaces. Benchlot links straight to the ' +
    'seller: no affiliate links, no brokering, no cut of sales.'
  );
  lines.push('');
  lines.push('## How the numbers are made');
  lines.push('');
  lines.push('- "Median sold" is the middle recorded sale for that tool; "most sell for" is the middle half (25th to 75th percentile).');
  lines.push('- Sets, pairs, lots, parts and as-is listings are excluded from the figures and marked on the page.');
  lines.push('- A page quotes a median only with 8 or more recorded sales; below that it shows the individual sales and says "too few".');
  lines.push('- "For sale now" rows are live listings seen within the last 45 days, with the seller linked directly.');
  lines.push('- Figures are rebuilt nightly; each page states when it was last updated.');
  lines.push('');
  lines.push('## How pages are organised');
  lines.push('');
  lines.push(`- [Price guide index](${abs('/guide')}): every tool type, with its makers.`);
  lines.push(`- Maker + type: \`${abs('/guide/{type}/{maker}')}\`, e.g. ${abs('/guide/bench-plane/stanley')}`);
  lines.push(`- Model: \`${abs('/guide/{type}/{maker}/{model}')}\`, e.g. ${abs('/guide/bench-plane/stanley/no-4')}`);
  lines.push(`- Stanley-pattern plane type studies: \`${abs('/guide/{type}/{maker}/{model}/type-N')}\``);
  lines.push(`- Size: \`${abs('/guide/{type}/{maker}/{size}')}\`, e.g. ${abs('/guide/hand-saw/disston/26-inch')}`);
  lines.push(`- Maker hub: \`${abs('/guide/brand/{maker}')}\`, every tool type a maker has sales for.`);
  lines.push(`- [Scan a photo](${abs('/scan')}): identify a tool from a picture and see what it sells for.`);
  lines.push(`- [Sitemap](${abs('/sitemap.xml')})`);
  lines.push('');

  if (machines.length) {
    lines.push('## Machines and power tools');
    lines.push('');
    for (const m of machines) {
      const brands = m.top.map((r) => `[${r.canonical_brand}](${abs(clusterPath(r))})`).join(', ');
      lines.push(`- ${typePlural(m.canonical_type)} (${m.sold_total} sales, ${m.active_total} for sale): ${brands}`);
    }
    lines.push('');
  }

  lines.push('## Makers');
  lines.push('');
  for (const h of hubs) {
    lines.push(`- [${h.canonical_brand}](${abs(brandHubPath(h.brandSlug))}): ${h.type_count} tool types, ${h.sold_total.toLocaleString('en-US')} sales`);
  }
  lines.push('');

  lines.push('## Pages with the most evidence');
  lines.push('');
  for (const c of top) {
    const median = money(c.sold_p50);
    lines.push(
      `- [${clusterTitle(c)}](${abs(clusterPath(c))}): ${c.sold_count} sales` +
      `${median ? `, median ${median}` : ''}${c.asking_count_active ? `, ${c.asking_count_active} for sale` : ''}`
    );
  }
  lines.push('');

  return new Response(lines.join('\n') + '\n', {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
