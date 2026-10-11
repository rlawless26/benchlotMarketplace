import type { Metadata } from 'next';
import ScanClient, { UploadZone } from '@/components/scan/ScanClient';
import ScanLanding from '@/components/scan/ScanLanding';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { SITE_URL } from '@/lib/site';

/**
 * /scan — identify a tool from a photo.
 *
 * Fully prerendered: the landing copy, the example result and the upload
 * form are in the HTML, so the page reads as a page to ChatGPT's fetcher and
 * to Googlebot instead of an empty CRA shell with a canonical pointing at the
 * homepage (which is what benchlot.com/scan served until October 2026).
 */
export const metadata: Metadata = {
  title: { absolute: 'Identify a woodworking tool from a photo · Benchlot' },
  description:
    'Upload a photo of a hand tool or machine. Benchlot names the maker, model, era and condition, then shows what it has actually sold for and what is listed now. Free, no account.',
  alternates: { canonical: '/scan' },
  openGraph: {
    title: 'Identify a woodworking tool from a photo · Benchlot',
    description: 'Photograph a tool; get the maker, model, era, condition, recorded sale prices and matching listings.',
    url: '/scan',
    type: 'website',
    images: ['/og-image.png'],
  },
};

export default function ScanPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Benchlot', path: '/' }, { name: 'Scan a tool', path: '/scan' }], SITE_URL)} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: 'Identify a used woodworking tool from a photo',
        description: 'Upload a photo and get the maker, model, era, condition, recorded sale prices and current listings.',
        step: [
          { '@type': 'HowToStep', name: 'Snap', text: 'Photograph the tool. One clear photo is usually enough; maker’s marks and castings help most.' },
          { '@type': 'HowToStep', name: 'Identify', text: 'Benchlot names the tool, the maker, the era and the condition, and says how confident it is.' },
          { '@type': 'HowToStep', name: 'Compare', text: 'See recorded sale prices for that tool and the matching listings for sale now.' },
        ],
      }} />
      <ScanClient landing={<ScanLanding upload={<UploadZone />} />} />
    </>
  );
}
