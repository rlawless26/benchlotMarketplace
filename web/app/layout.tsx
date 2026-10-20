import type { Metadata } from 'next';
import { Petrona, Outfit } from 'next/font/google';
import Link from 'next/link';
import { Analytics as VercelAnalytics } from '@vercel/analytics/next';
import { SITE_URL, IS_INDEXABLE } from '@/lib/site';
import { Analytics } from './analytics';
import SearchForm from '@/components/SearchForm';
import './globals.css';

const petrona = Petrona({
  subsets: ['latin'],
  variable: '--font-petrona',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Benchlot — what used woodworking tools actually sell for',
    template: '%s · Benchlot',
  },
  description:
    'Real sold prices and current listings for used hand and power woodworking tools, gathered from dealers, forums and marketplaces.',
  robots: IS_INDEXABLE
    ? { index: true, follow: true }
    : { index: false, follow: false },
  // The icon files are served by the CRA project at the domain root (its
  // build/ wins the filesystem phase before any rewrite), so both apps share
  // one head.
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

/**
 * Link rule: next/link only for routes this app serves (/, /scan, /faq,
 * /guide/*, /alerts/confirm|unsubscribe). Plain <a> for everything the CRA
 * app serves (/search, /privacy, /terms) — a client-side navigation to one of those
 * would try to fetch an RSC payload that does not exist.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${petrona.variable} ${outfit.variable}`}>
      <body className="min-h-screen bg-bone text-dark-teal antialiased">
        <header className="border-b border-bone-dark bg-bone-light">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
            <Link href="/" className="font-display text-xl font-semibold text-spruce">
              Benchlot
            </Link>
            <nav className="flex items-center gap-4 text-sm sm:gap-6">
              <Link href="/guide" className="text-spruce hover:text-honey-dark">
                Price guide
              </Link>
              <Link href="/scan" className="text-spruce hover:text-honey-dark">
                Scan a tool
              </Link>
              <a href="/search" className="hidden text-spruce hover:text-honey-dark sm:inline">
                Listings
              </a>
              <SearchForm compact />
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-5 py-10">{children}</main>

        <footer className="mt-16 border-t border-bone-dark bg-bone-light">
          <div className="mx-auto max-w-5xl px-5 py-8 text-sm text-spruce-light">
            <p>
              Benchlot indexes public listings and links back to the source. We don&apos;t
              broker sales, take a cut, or use affiliate links.
            </p>
            <nav className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
              <Link href="/guide" className="hover:text-honey-dark">Price guide</Link>
              <a href="/search" className="hover:text-honey-dark">All listings</a>
              <Link href="/scan" className="hover:text-honey-dark">Scan a tool</Link>
              <Link href="/faq" className="hover:text-honey-dark">FAQ</Link>
              <a href="/privacy" className="hover:text-honey-dark">Privacy</a>
              <a href="/terms" className="hover:text-honey-dark">Terms</a>
            </nav>
          </div>
        </footer>

        <Analytics />
        <VercelAnalytics />
      </body>
    </html>
  );
}
