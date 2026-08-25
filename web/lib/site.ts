/**
 * Canonical URL and indexability.
 *
 * These are TWO separate concerns and are deliberately kept apart:
 *
 *   SITE_URL      where this content canonically lives (drives metadataBase,
 *                 every alternates.canonical, sitemap entries, JSON-LD url)
 *   IS_INDEXABLE  whether this deployment should invite crawlers at all
 *
 * They used to be one value, which set a trap: pointing SITE_URL at the domain
 * that should rank ALSO flipped robots.txt to allow, so a deployment served at
 * one host would advertise canonicals belonging to another. If that other host
 * doesn't serve the same routes, crawlers get sent to a page that isn't there.
 *
 * Architecture this supports: the app is served at benchlot.com/guide/* via a
 * rewrite from the benchlot-marketplace project, so benchlot.com genuinely
 * serves these routes and the canonicals are truthful. The app's own
 * *.vercel.app origin serves identical content behind those same canonicals,
 * which is the normal way to let a search engine consolidate on one URL.
 */

/**
 * The domain this content is published on. Checked into code rather than held
 * in an env var: it is a fact about the project, and the one time it lived in a
 * mutable variable, flipping that variable silently rewrote every canonical.
 */
const CANONICAL_SITE_URL = 'https://benchlot.com';

function resolveSiteUrl(): string {
  // Explicit override wins — but it still has to name an allow-listed host to
  // be indexable, so a typo degrades to noindex rather than to bad canonicals.
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  // VERCEL_ENV is set automatically: 'production' | 'preview' | 'development'.
  // Only the production deployment speaks for the canonical domain.
  if (process.env.VERCEL_ENV === 'production') return CANONICAL_SITE_URL;

  // Previews self-canonicalise and stay noindex.
  const vercelHost = process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost}`;

  return 'http://localhost:3000';
}

export const SITE_URL = resolveSiteUrl();

/**
 * Hosts allowed to present themselves as the indexable home of this content.
 * benchlot.com serves /guide/* through a rewrite, so it really does own them.
 */
const CANONICAL_HOSTS = new Set(['benchlot.com', 'www.benchlot.com']);

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export const CANONICAL_HOST = hostOf(SITE_URL);

/**
 * Indexable only when the resolved canonical names an allow-listed host. Every
 * preview resolves to its own *.vercel.app URL and is therefore noindex, with
 * no configuration and nothing to forget to set.
 */
export const IS_INDEXABLE = CANONICAL_HOSTS.has(CANONICAL_HOST);
