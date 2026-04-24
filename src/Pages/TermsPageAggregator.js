// src/Pages/TermsPageAggregator.js
//
// Terms of Service for the aggregator. Benchlot indexes public listings from
// external sources; users click through to those sources to transact. No
// marketplace, no payments, no user-posted inventory — the pre-pivot terms
// (seller/buyer/marketplace fee) don't apply.

import React, { useEffect } from 'react';

import SiteHeader from '../components/siteChrome/SiteHeader';
import SiteFooter from '../components/siteChrome/SiteFooter';

const readingCol = {
  maxWidth: 760,
  margin: '0 auto',
  padding: '72px 40px 112px',
};

export default function TermsPageAggregator() {
  useEffect(() => {
    document.title = 'Terms of Service | Benchlot';
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bone)',
      }}
    >
      <SiteHeader />

      <main style={{ flex: 1 }}>
        <article style={readingCol}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 48,
              lineHeight: 1.04,
              letterSpacing: '-1.2px',
              color: 'var(--spruce)',
              margin: '0 0 12px',
            }}
          >
            Terms of Service.
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 400,
              fontSize: 14,
              color: 'var(--fg-muted)',
              margin: '0 0 48px',
              letterSpacing: '0.01em',
            }}
          >
            Last Updated: April 24, 2026
          </p>

          <div className="prose prose-stone max-w-none">
            <h2>1. What Benchlot is</h2>
            <p>
              Benchlot is a search engine for used woodworking tool listings — hand tools and
              power tools alike. We index publicly-available listings from dealers, forum classifieds,
              and auction houses into one place
              so you can search across them. When you find something you want, you click through to the
              original source and transact there.
            </p>
            <p>
              <strong>We do not sell tools.</strong> We don&rsquo;t hold inventory, process payments, take a
              commission, or facilitate transactions. We point you at listings — the rest is between you and
              the seller.
            </p>

            <h2>2. Agreement to Terms</h2>
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the Benchlot
              website and services (the &ldquo;Services&rdquo;). By using the Services you agree to these
              Terms and our Privacy Policy. If you don&rsquo;t agree, don&rsquo;t use the Services.
            </p>
            <p>In these Terms, &ldquo;Benchlot,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; and &ldquo;our&rdquo; refer to Benchlot, Inc. &ldquo;You&rdquo; and &ldquo;your&rdquo; refer to anyone using the Services.</p>

            <h2>3. Accounts and alerts</h2>
            <p>
              You can use Benchlot&rsquo;s search anonymously. If you want to save an alert (a persistent
              search that notifies you by email when a new listing matches), you&rsquo;ll create an account
              with an email address. You agree to:
            </p>
            <ul>
              <li>Provide an accurate email address and keep it current</li>
              <li>Keep your account credentials confidential</li>
              <li>Use the account only for personal, non-commercial purposes</li>
              <li>Not create multiple accounts or impersonate others</li>
            </ul>
            <p>
              You can delete your account at any time by contacting us. We may suspend or terminate accounts
              that abuse the service (scraping us in turn, spamming, fraud, etc.).
            </p>

            <h2>4. Third-party listings and linking</h2>
            <p>
              Every listing on Benchlot originates from a third-party source that we link back to. Key points:
            </p>
            <ul>
              <li>
                <strong>Accuracy:</strong> We try to keep listings fresh, but sources change faster than our
                scrape cadence. Prices, availability, condition, and shipping terms may be out of date by the
                time you click through. Always verify details on the source site before committing to a
                transaction.
              </li>
              <li>
                <strong>Transactions:</strong> We are not a party to any transaction initiated through a
                Benchlot clickthrough. All payments, shipping, returns, warranties, and disputes are between
                you and the source seller.
              </li>
              <li>
                <strong>Attribution:</strong> Listing titles, images, and descriptions shown on Benchlot are
                attributed to their source. We display them for search and discovery purposes under fair-use
                and fair-dealing principles for indexing aggregators.
              </li>
              <li>
                <strong>Source compliance:</strong> We respect robots.txt and standard aggregator etiquette.
                If you are a source operator and want Benchlot to stop indexing your site, email us and
                we&rsquo;ll remove it within a reasonable window.
              </li>
            </ul>

            <h2>5. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Scrape, copy, or redistribute Benchlot&rsquo;s indexed data in bulk</li>
              <li>Interfere with the operation of the Services (denial-of-service, probing, etc.)</li>
              <li>Use Benchlot to build a competing aggregator by harvesting our search results</li>
              <li>Use Benchlot for any illegal purpose or in violation of these Terms</li>
            </ul>

            <h2>6. Intellectual property</h2>
            <p>
              The Benchlot name, logo, design, and the arrangement and selection of content are ours.
              You may not reproduce them without permission. Third-party listing content shown on Benchlot
              remains the property of the source.
            </p>

            <h2>7. No warranty</h2>
            <p>
              The Services are provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranty
              of any kind. We do not warrant that listings are accurate, that the Services will be
              uninterrupted, or that any tool you find through Benchlot will meet your expectations.
            </p>

            <h2>8. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, Benchlot is not liable for any indirect, incidental,
              special, consequential, or punitive damages arising from your use of the Services, including
              any dispute or loss related to a transaction you initiated with a source seller after a
              Benchlot clickthrough. Our total liability for any claim is limited to the amount you have
              paid Benchlot in the prior twelve months — for most users that is <strong>$0</strong>, because
              Benchlot is free.
            </p>

            <h2>9. Indemnification</h2>
            <p>
              You agree to defend, indemnify, and hold harmless Benchlot, Inc. and its officers, directors,
              employees, and agents from any claims or expenses arising out of your use of the Services or
              your violation of these Terms.
            </p>

            <h2>10. Termination</h2>
            <p>
              We may suspend or terminate access to the Services at any time for any reason. You may stop
              using the Services at any time.
            </p>

            <h2>11. Changes to these Terms</h2>
            <p>
              We may update these Terms periodically. Material changes will be posted with a new &ldquo;Last
              Updated&rdquo; date and, for signed-in users, noted by email where reasonable. Continued use
              after changes means you accept the updated Terms.
            </p>

            <h2>12. Governing law</h2>
            <p>
              These Terms are governed by the laws of the Commonwealth of Massachusetts. Any dispute
              relating to these Terms will be brought in state or federal courts in Boston, Massachusetts.
            </p>

            <h2>13. Contact</h2>
            <p>
              Questions about these Terms? Email{' '}
              <a
                href="mailto:rob@benchlot.com"
                style={{
                  color: 'var(--honey)',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                rob@benchlot.com
              </a>
              .
            </p>
          </div>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
