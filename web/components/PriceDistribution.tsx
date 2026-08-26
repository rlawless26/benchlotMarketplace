import { SoldPoint } from '@/lib/price-guide';

/**
 * Sold-price distribution: one dot per real sale, faceted by source kind.
 *
 * Why a strip plot and not the Reverb-style monthly line: sold dates are too
 * sparse to trend. 26,103 of 34,017 sold rows carry no date at all (Jim Bode's
 * Value Guide deliberately publishes none), and 5,394 more share a single
 * markExpired batch timestamp. A distribution needs no dates, so it can use
 * every comp.
 *
 * Why faceted by source kind rather than coloured by it: the kinds price
 * differently — dealers sell restored stock, marketplaces sell everything — and
 * that difference IS the finding, so it gets an axis rather than a hue. It also
 * sidesteps a real problem: the brand's KIND_COLORS fail a CVD check as a
 * categorical chart palette (brown/red separate by ΔE 1.5 for protanopia), so
 * colour alone could not carry identity here. Row labels do.
 *
 * Log scale: tool prices span $3 to $3,200 and are perceived multiplicatively;
 * a linear axis would collapse everything below $200 into the left margin.
 * Exact figures are printed as text, so nobody has to read a value off the log
 * axis.
 */

const KIND_ORDER = ['Dealer', 'Marketplace', 'Forum', 'Reddit', 'Auction'];

const KIND_LABEL: Record<string, string> = {
  Dealer: 'Dealers',
  Marketplace: 'Marketplaces',
  Forum: 'Forum classifieds',
  Reddit: 'Reddit',
  Auction: 'Auctions',
};

type Props = { points: SoldPoint[]; median: number | null };

function niceTicks(minC: number, maxC: number): number[] {
  const candidates = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
  return candidates
    .map((d) => d * 100)
    .filter((c) => c >= minC * 0.9 && c <= maxC * 1.1);
}

export default function PriceDistribution({ points, median }: Props) {
  const priced = points.filter((l) => l.price_cents > 0);
  // Below ~6 points a strip plot is just the table again, drawn worse.
  if (priced.length < 6) return null;

  const values = priced.map((l) => l.price_cents).sort((a, b) => a - b);
  const minC = values[0];
  const maxC = values[values.length - 1];
  const q = (p: number) => values[Math.min(values.length - 1, Math.floor(values.length * p))];
  const p25 = q(0.25);
  const p75 = q(0.75);
  const medianC = median !== null ? median * 100 : q(0.5);

  // Geometry
  const W = 720;
  const PAD_L = 108;
  const PAD_R = 16;
  const ROW_H = 34;
  const AXIS_H = 26;
  const plotW = W - PAD_L - PAD_R;

  const lo = Math.log10(Math.max(1, minC * 0.85));
  const hi = Math.log10(maxC * 1.15);
  const x = (c: number) => PAD_L + ((Math.log10(Math.max(1, c)) - lo) / (hi - lo)) * plotW;

  const byKind = new Map<string, SoldPoint[]>();
  for (const l of priced) {
    const k = l.source_kind || 'Marketplace';
    byKind.set(k, [...(byKind.get(k) ?? []), l]);
  }
  const rows = KIND_ORDER.filter((k) => byKind.has(k)).map((k) => ({
    kind: k,
    items: byKind.get(k) as SoldPoint[],
  }));

  const H = rows.length * ROW_H + AXIS_H + 14;
  const ticks = niceTicks(minC, maxC);
  const usd = (c: number) =>
    c >= 100000 ? `$${Math.round(c / 100 / 1000)}k` : `$${Math.round(c / 100)}`;

  return (
    <figure className="mt-6">
      <figcaption className="text-sm text-spruce-light">
        Every recorded sale, by where it sold. The band spans the middle half of
        all sales; the line is the median.
      </figcaption>

      <div className="mt-3 overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[34rem]"
          role="img"
          aria-label={`Distribution of ${priced.length} sold prices, grouped by source type. Median ${usd(medianC)}.`}
        >
          {/* Interquartile band — recessive, sits behind the marks. */}
          <rect
            x={x(p25)} y={4} width={Math.max(1, x(p75) - x(p25))}
            height={rows.length * ROW_H} fill="#e8e6e0"
          />
          {/* Median. Honey per the brand rule that prices are always honey; it
              is also a distinct mark shape, so identity is never colour-alone. */}
          <line
            x1={x(medianC)} x2={x(medianC)} y1={0} y2={rows.length * ROW_H + 4}
            stroke="#d4aa60" strokeWidth={2}
          />
          <text
            x={x(medianC)} y={rows.length * ROW_H + 15} textAnchor="middle"
            fontSize={11} fontWeight={600} fill="#b08a40"
          >
            median {usd(medianC)}
          </text>

          {rows.map((row, i) => {
            const cy = 4 + i * ROW_H + ROW_H / 2;
            return (
              <g key={row.kind}>
                <text
                  x={PAD_L - 10} y={cy + 4} textAnchor="end"
                  fontSize={12} fill="#2a4a48"
                >
                  {KIND_LABEL[row.kind] ?? row.kind}
                </text>
                <text
                  x={PAD_L - 10} y={cy + 17} textAnchor="end"
                  fontSize={10} fill="#2a4a48" opacity={0.7}
                >
                  {row.items.length} {row.items.length === 1 ? 'sale' : 'sales'}
                </text>
                {row.items.map((l) => (
                  <circle
                    key={l.id}
                    cx={x(l.price_cents)} cy={cy} r={4.5}
                    fill="#1a3030" fillOpacity={0.55}
                    stroke="#f8f6f2" strokeWidth={1.5}
                  >
                    {/* Native tooltip: no JS, works on a static page. */}
                    <title>{`${usd(l.price_cents)} — ${l.title_raw} (${l.source_name})`}</title>
                  </circle>
                ))}
              </g>
            );
          })}

          {/* Axis last so its labels sit above the band. */}
          {ticks.map((c) => (
            <g key={c}>
              <line
                x1={x(c)} x2={x(c)} y1={4} y2={rows.length * ROW_H + 4}
                stroke="#dcd8cf" strokeWidth={1}
              />
              <text
                x={x(c)} y={H - 4} textAnchor="middle" fontSize={11} fill="#2a4a48"
              >
                {usd(c)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </figure>
  );
}
