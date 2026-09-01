import type { Metadata } from 'next';
import { Petrona, Outfit } from 'next/font/google';
import Link from 'next/link';
import { SITE_URL, IS_INDEXABLE } from '@/lib/site';
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${petrona.variable} ${outfit.variable}`}>
      <body className="min-h-screen bg-bone text-dark-teal antialiased">
        <header className="border-b border-bone-dark bg-bone-light">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
            <Link href="/" className="font-display text-xl font-semibold text-spruce">
              Benchlot
            </Link>
            <nav className="flex gap-6 text-sm">
              <Link href="/guide" className="text-spruce hover:text-honey-dark">
                Price guide
              </Link>
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
          </div>
        </footer>
      </body>
    </html>
  );
}
