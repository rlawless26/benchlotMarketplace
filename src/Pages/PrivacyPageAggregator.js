// src/Pages/PrivacyPageAggregator.js
//
// Privacy Policy for the aggregator. Benchlot indexes public listings from
// external sources and lets users save email alerts. We don't process
// payments, host user-created listings, or run a social profile system —
// the pre-pivot privacy policy (profiles, transaction history, payment
// processors) doesn't apply.

import React, { useEffect } from 'react';

import SiteHeader from '../components/siteChrome/SiteHeader';
import SiteFooter from '../components/siteChrome/SiteFooter';

const readingCol = {
  maxWidth: 760,
  margin: '0 auto',
  padding: '72px 40px 112px',
};

export default function PrivacyPageAggregator() {
  useEffect(() => {
    document.title = 'Privacy Policy | Benchlot';
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
            Privacy Policy.
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
            <h2>1. Short version</h2>
            <p>
              Benchlot is a search engine for used tool listings. We collect the minimum needed to run the
              service: an email address if you save an alert or subscribe to the weekly digest, and standard
              request metadata (IP, user agent, search queries) so we can keep the site working. We
              don&rsquo;t sell your data. We don&rsquo;t process payments. There&rsquo;s no social profile,
              no transaction history, no seller payout information — because Benchlot doesn&rsquo;t do any
              of that. You click through to the source to transact.
            </p>

            <h2>2. Who we are</h2>
            <p>
              &ldquo;Benchlot,&rdquo; &ldquo;we,&rdquo; and &ldquo;us&rdquo; mean Benchlot, Inc. This policy
              covers our website and any services we operate under it.
            </p>

            <h2>3. Information we collect</h2>

            <h3>3.1. Information you give us directly</h3>
            <ul>
              <li>
                <strong>Email address.</strong> Collected when you create an account to save alerts, sign up
                for the weekly digest, or contact us. That&rsquo;s the primary personal data we hold.
              </li>
              <li>
                <strong>Alert criteria.</strong> If you save an alert, we store the search query and filters
                (e.g. &ldquo;Stanley No. 5,&rdquo; max $100) so we can match new listings against them and
                email you.
              </li>
              <li>
                <strong>Messages you send us.</strong> If you email us, we keep the message long enough to
                respond.
              </li>
            </ul>

            <h3>3.2. Information we collect automatically</h3>
            <ul>
              <li>
                <strong>Request metadata.</strong> When you visit the site, our servers log standard request
                details (IP address, user agent, referrer, timestamp) to operate and secure the service.
              </li>
              <li>
                <strong>Usage information.</strong> We log pages visited, searches run, and result clicks so
                we can improve search quality. This data is typically aggregated and anonymized for
                analysis.
              </li>
              <li>
                <strong>Cookies and similar technologies.</strong> We use a small number of cookies for
                session state, authentication (if signed in), and basic analytics. Most browsers let you
                block or clear cookies in settings.
              </li>
            </ul>

            <h3>3.3. Information we do NOT collect</h3>
            <ul>
              <li>Payment or financial information (we don&rsquo;t take payments)</li>
              <li>Shipping addresses, phone numbers, or tax IDs</li>
              <li>Identity verification documents</li>
              <li>Precise device location</li>
              <li>Social-media friend lists or contacts</li>
              <li>Listings you post (you don&rsquo;t post listings on Benchlot — we aggregate them from other sites)</li>
            </ul>

            <h2>4. How we use the information</h2>
            <p>We use collected information to:</p>
            <ul>
              <li>Deliver alert and digest emails you&rsquo;ve asked for</li>
              <li>Show relevant search results and respond to your queries</li>
              <li>Improve search quality, category coverage, and site performance</li>
              <li>Prevent abuse (rate-limiting, spam, scraping)</li>
              <li>Comply with legal obligations when required</li>
            </ul>

            <h2>5. Who we share information with</h2>
            <p>We share information only with the service providers that power the site, specifically:</p>
            <ul>
              <li>
                <strong>Google Firebase / Google Cloud</strong> — hosts our database, authentication,
                scheduled scrapers, and website. Your email address lives in Firestore (Google Cloud).
              </li>
              <li>
                <strong>Email sending service</strong> (currently SendGrid via Firebase) for alert and
                digest emails.
              </li>
              <li>
                <strong>Anthropic</strong> — our normalizer sends listing title + description text to the
                Claude API so we can classify tools by brand and type. Your personal data is NOT sent to
                Anthropic. Only public listing content from indexed sources is.
              </li>
              <li>
                <strong>Analytics providers</strong> (Google Analytics, if enabled) for aggregate usage
                reporting. IPs are truncated before storage where the provider supports it.
              </li>
            </ul>
            <p>
              We do not sell personal information. We do not share it for third-party marketing. We may
              disclose information if required by law (e.g. a valid court order).
            </p>

            <h2>6. Data retention</h2>
            <p>
              We keep your email address and alert criteria for as long as you have an active account. If
              you delete your account, we delete those records. Request logs and aggregated usage data are
              kept for as long as needed to operate and secure the service, typically 90 days or less for
              identified logs.
            </p>

            <h2>7. Your rights</h2>
            <p>You can at any time:</p>
            <ul>
              <li>
                <strong>Access your data.</strong> Email us and we&rsquo;ll send you a copy of what
                we&rsquo;ve stored.
              </li>
              <li>
                <strong>Correct your data.</strong> Update your email in account settings, or email us.
              </li>
              <li>
                <strong>Delete your account.</strong> Email us and we&rsquo;ll delete your account and its
                associated alerts.
              </li>
              <li>
                <strong>Unsubscribe from emails.</strong> Every digest and alert email includes an
                unsubscribe link. You can also reply to any email from us.
              </li>
            </ul>
            <p>
              If you&rsquo;re in the EU/UK or California, the above rights are covered by GDPR / UK GDPR /
              CCPA respectively; the mechanism is the same — email us.
            </p>

            <h2>8. Security</h2>
            <p>
              We use industry-standard measures (TLS in transit, access controls on our database, sanely
              scoped service accounts) to protect your information. No system is perfectly secure; if
              you&rsquo;re concerned about a specific incident, email us.
            </p>

            <h2>9. Children</h2>
            <p>
              The Services are not directed at children under 13, and we don&rsquo;t knowingly collect
              information from them. If you believe we have inadvertently collected information from a
              child, contact us and we&rsquo;ll delete it.
            </p>

            <h2>10. International users</h2>
            <p>
              Benchlot operates from the United States. If you access the site from outside the US, your
              information is transferred to and stored in the US. Data-protection laws in the US may differ
              from those in your country.
            </p>

            <h2>11. Changes to this policy</h2>
            <p>
              We&rsquo;ll post any changes here and update the &ldquo;Last Updated&rdquo; date. For material
              changes, signed-in users will get an email notice.
            </p>

            <h2>12. Contact</h2>
            <p>
              Questions or requests about your data? Email{' '}
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
