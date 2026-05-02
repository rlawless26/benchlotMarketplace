// src/Pages/FAQPage.js
// Rarely Asked Questions — single consolidated content page.
// Replaces the old About + FAQ + Contact trio per the RAQ consolidation spec.
// Items are always-expanded (no accordion). Route stays at /faq for SEO /
// external link continuity; chrome nav label is "RAQ".

import React, { useEffect } from 'react';

import SiteHeader from '../components/siteChrome/SiteHeader';
import SiteFooter from '../components/siteChrome/SiteFooter';

const readingCol = {
  maxWidth: 640,
  margin: '0 auto',
  padding: '72px 40px 112px',
};

const QUESTIONS = [
  {
    q: 'What is Benchlot?',
    a: (
      <>
        A free search engine that pulls used woodworking tool listings —
        hand tools and power tools alike — from dealers, forums, auction
        houses, and marketplaces into one place. It&rsquo;s a hobby project,
        built because the alternative was keeping fifteen tabs open.
      </>
    ),
  },
  {
    q: 'Why use Benchlot?',
    a: (
      <>
        Instead of checking a dozen sites every week to find the tool you want,
        check one. Benchlot brings the listings to you — searchable, filterable,
        sorted by whatever you care about.
      </>
    ),
  },
  {
    q: 'Does Benchlot sell tools?',
    a: (
      <>
        Nope. When you find something you want, click through to the source and
        buy it from them.
      </>
    ),
  },
  {
    q: 'What sources do you index?',
    a: <>Jim Bode Tools, Hyperkitten, The Best Things, Michael Rouillard Antique Tools, Sawmill Creek, Woodnet, Reddit (r/handtools, r/AntiqueToolBroker), eBay, Facebook Marketplace. More on the way.</>,
  },
  {
    q: "What's an alert?",
    a: (
      <>
        Save a search and we&rsquo;ll email you when a new listing matches.
        Great for the tools that sell in an hour.
      </>
    ),
  },
  {
    q: 'How do I contact you or report an issue?',
    a: (
      <>
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
      </>
    ),
  },
];

function RAQItem({ q, a }) {
  return (
    <div
      style={{
        padding: '24px 0',
        borderTop: '1px solid var(--border-light)',
      }}
    >
      <h3
        style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 700,
          fontSize: 18,
          lineHeight: 1.4,
          color: 'var(--dark-teal)',
          letterSpacing: '-0.1px',
          margin: '0 0 10px',
        }}
      >
        {q}
      </h3>
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-body)',
          fontWeight: 400,
          fontSize: 17,
          lineHeight: 1.7,
          color: 'var(--fg-primary)',
          letterSpacing: '0.005em',
        }}
      >
        {a}
      </p>
    </div>
  );
}

export default function FAQPage() {
  useEffect(() => {
    document.title = 'RAQ | Benchlot';
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
      <SiteHeader current="raq" />

      <main style={{ flex: 1 }}>
        <article style={readingCol}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 56,
              lineHeight: 1.04,
              letterSpacing: '-1.6px',
              color: 'var(--spruce)',
              margin: '0 0 48px',
            }}
          >
            Rarely Asked Questions.
          </h1>

          <div style={{ borderBottom: '1px solid var(--border-light)' }}>
            {QUESTIONS.map((qa, i) => (
              <RAQItem key={i} {...qa} />
            ))}
          </div>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
