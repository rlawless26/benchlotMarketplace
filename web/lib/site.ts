/**
 * Canonical-host gate.
 *
 * This app serves preview and *.vercel.app URLs long before it serves
 * benchlot.com, and those hosts return byte-identical content. If they are
 * crawlable they compete with the real domain for exactly the keywords this
 * work exists to win, so everything except the canonical host is noindex.
 *
 * Host resolution, in order:
 *   1. NEXT_PUBLIC_SITE_URL      - explicit override
 *   2. VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL - set automatically by Vercel,
 *      so preview deployments self-describe with no configuration
 *   3. localhost                 - local dev
 *
 * To let a domain rank, point NEXT_PUBLIC_SITE_URL at https://benchlot.com there.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost}`;

  return 'http://localhost:3000';
}

export const SITE_URL = resolveSiteUrl();

const CANONICAL_HOSTS = new Set(['benchlot.com', 'www.benchlot.com']);

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/** True only on the domain that is meant to rank. */
export const IS_CANONICAL_HOST = CANONICAL_HOSTS.has(hostOf(SITE_URL));
