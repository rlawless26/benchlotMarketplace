import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

/**
 * Open Graph cards for the price guide.
 *
 * Every guide page shares one layout: the maker and tool in display type, the
 * one number a woodworker would quote to a friend (the median sold price) in
 * Honey, the evidence behind it, and a price band so the card says something
 * even at thumbnail size. Before this, the 890 guide pages had no og:image
 * at all, so a link pasted into Reddit, Discord or iMessage unfurled as bare
 * text while the homepage got a wordmark card.
 *
 * Rendered by Satori through `next/og`, which lays out a strict flexbox
 * subset: every element with more than one child needs `display: flex`, and
 * text must sit inside its own element. Fonts are the static TTFs in
 * `assets/fonts` (Google's variable files do not render in Satori), read from
 * disk once per instance.
 */

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const SPRUCE = '#1a3030';
const SPRUCE_DEEP = '#132424';
const BONE = '#f2f0eb';
const BONE_DIM = 'rgba(242, 240, 235, 0.62)';
const HONEY = '#d4aa60';
const DARK_TEAL = '#0c1c1e';

let fontsPromise: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 500 | 700 }[]> | null = null;

function loadFonts() {
  if (!fontsPromise) {
    const dir = path.join(process.cwd(), 'assets', 'fonts');
    const read = async (file: string) => {
      const b = await readFile(path.join(dir, file));
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
    };
    fontsPromise = Promise.all([
      read('petrona-700.ttf').then((data) => ({ name: 'Petrona', data, weight: 700 as const })),
      read('outfit-400.ttf').then((data) => ({ name: 'Outfit', data, weight: 400 as const })),
      read('outfit-500.ttf').then((data) => ({ name: 'Outfit', data, weight: 500 as const })),
    ]);
  }
  return fontsPromise;
}

export type OgTile = { value: string; label: string };

export type OgBand = {
  /** Five ascending price points; the band is drawn from the first to the last. */
  low: number; p25: number; median: number; p75: number; high: number;
  lowLabel: string; highLabel: string;
};

export type OgCard = {
  /** Small honey line above the title: "USED BENCH PLANES". */
  eyebrow: string;
  /** Display line, wraps to two lines. */
  title: string;
  /** The one number, in Honey. */
  figure: string;
  figureLabel: string;
  /** Up to three supporting numbers. */
  tiles: OgTile[];
  /** Optional price band drawn across the bottom. */
  band?: OgBand | null;
  /** Optional rows for a hub card, in place of a band. */
  rows?: { name: string; value: string }[];
  /** Shown bottom-right: the path the card is for. */
  pathLabel: string;
};

/** Title size steps down with length so two lines always fit. */
function titleSize(title: string): number {
  if (title.length <= 28) return 66;
  if (title.length <= 40) return 56;
  if (title.length <= 56) return 48;
  return 40;
}

function Band({ band }: { band: OgBand }) {
  const span = Math.max(1, band.high - band.low);
  const pct = (v: number) => `${Math.min(100, Math.max(0, ((v - band.low) / span) * 100))}%`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div style={{ display: 'flex', position: 'relative', width: '100%', height: 18, borderRadius: 9, backgroundColor: 'rgba(242,240,235,0.14)' }}>
        <div style={{ position: 'absolute', left: pct(band.p25), width: `${Math.max(1, ((band.p75 - band.p25) / span) * 100)}%`, top: 0, height: 18, borderRadius: 9, backgroundColor: HONEY, opacity: 0.85 }} />
        <div style={{ position: 'absolute', left: pct(band.median), top: -7, width: 4, height: 32, marginLeft: -2, borderRadius: 2, backgroundColor: BONE }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 22, color: BONE_DIM, fontFamily: 'Outfit' }}>
        <div>{band.lowLabel}</div>
        <div style={{ color: BONE }}>half of sales in the honey band</div>
        <div>{band.highLabel}</div>
      </div>
    </div>
  );
}

export async function renderOgCard(card: OgCard) {
  const fonts = await loadFonts();
  const tiles = card.tiles.slice(0, 3);
  return new ImageResponse(
    (
      <div
        style={{
          width: OG_WIDTH, height: OG_HEIGHT, display: 'flex', flexDirection: 'column',
          backgroundColor: SPRUCE, backgroundImage: `linear-gradient(135deg, ${SPRUCE} 0%, ${SPRUCE_DEEP} 100%)`,
          color: BONE, fontFamily: 'Outfit', padding: '48px 64px 44px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <div style={{ fontFamily: 'Petrona', fontWeight: 700, fontSize: 40, letterSpacing: '0.01em' }}>Benchlot</div>
            <div style={{ marginLeft: 18, fontSize: 22, color: HONEY, fontWeight: 500, letterSpacing: '0.04em' }}>USED TOOL PRICE GUIDE</div>
          </div>
          <div style={{ fontSize: 22, color: BONE_DIM }}>benchlot.com</div>
        </div>

        {/* Eyebrow + title */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 44 }}>
          <div style={{ fontSize: 24, color: HONEY, fontWeight: 500, letterSpacing: '0.08em' }}>{card.eyebrow.toUpperCase()}</div>
          <div style={{ marginTop: 10, fontFamily: 'Petrona', fontWeight: 700, fontSize: titleSize(card.title), lineHeight: 1.1, maxWidth: 1072 }}>
            {card.title}
          </div>
        </div>

        {/* Figure + tiles */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 1, marginRight: 24 }}>
            <div style={{ fontFamily: 'Petrona', fontWeight: 700, fontSize: 112, lineHeight: 1, color: HONEY, letterSpacing: '-0.01em' }}>{card.figure}</div>
            <div style={{ marginTop: 8, fontSize: 26, color: BONE }}>{card.figureLabel}</div>
          </div>
          <div style={{ display: 'flex', flexShrink: 0 }}>
            {tiles.map((t, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: 44 }}>
                <div style={{ fontFamily: 'Petrona', fontWeight: 700, fontSize: 44, lineHeight: 1 }}>{t.value}</div>
                <div style={{ marginTop: 8, fontSize: 22, color: BONE_DIM }}>{t.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Band or rows */}
        <div style={{ display: 'flex', marginTop: 36, minHeight: 64 }}>
          {card.band ? (
            <Band band={card.band} />
          ) : card.rows && card.rows.length > 0 ? (
            <div style={{ display: 'flex', width: '100%', borderTop: `1px solid rgba(242,240,235,0.18)`, paddingTop: 16 }}>
              {card.rows.slice(0, 4).map((r, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', flex: 1, marginRight: i < 3 ? 24 : 0 }}>
                  <div style={{ fontSize: 22, color: BONE_DIM }}>{r.name}</div>
                  <div style={{ marginTop: 4, fontFamily: 'Petrona', fontWeight: 700, fontSize: 30, color: HONEY }}>{r.value}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', width: '100%', borderTop: `1px solid rgba(242,240,235,0.18)`, paddingTop: 16, fontSize: 22, color: BONE_DIM }}>
              Sold prices, not asking prices. Gathered nightly from dealers, forum classifieds, auctions and marketplaces.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14, fontSize: 20, color: BONE_DIM }}>
          <div style={{ backgroundColor: DARK_TEAL, borderRadius: 6, padding: '4px 12px' }}>{card.pathLabel}</div>
        </div>
      </div>
    ),
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      fonts,
      headers: {
        // Social crawlers cache by URL; the page passes a ?v= stamp from the
        // nightly stats build so a changed median gets a fresh card.
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    }
  );
}
