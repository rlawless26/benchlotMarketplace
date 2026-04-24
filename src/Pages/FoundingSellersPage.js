// src/Pages/FoundingSellersPage.js
import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const META_PIXEL_ID = process.env.REACT_APP_META_PIXEL_ID;
const HUBSPOT_PORTAL_ID = process.env.REACT_APP_HUBSPOT_PORTAL_ID || '396680';
const HUBSPOT_FORM_ID = process.env.REACT_APP_HUBSPOT_FOUNDING_FORM_ID;

function loadMetaPixel(pixelId) {
  if (!pixelId || typeof window === 'undefined' || window.fbq) return;
  /* eslint-disable */
  !function(f,b,e,v,n,t,s){
    if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s);
  }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');
}

async function submitToHubSpot({ firstName, email, tools, listingCount }) {
  if (!HUBSPOT_FORM_ID) return; // graceful no-op if not configured
  const endpoint = `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${HUBSPOT_FORM_ID}`;
  const payload = {
    fields: [
      { name: 'firstname', value: firstName },
      { name: 'email', value: email },
      { name: 'founding_seller_tools', value: tools },
      { name: 'founding_seller_listing_count', value: listingCount || '' },
    ],
    context: {
      pageUri: typeof window !== 'undefined' ? window.location.href : '',
      pageName: 'Founding Sellers',
    },
  };
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // HubSpot is best-effort; Firestore is the system of record
    console.warn('HubSpot submission failed (non-fatal):', err);
  }
}

const FoundingSellersPage = () => {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [tools, setTools] = useState('');
  const [listingCount, setListingCount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [didSubmit, setDidSubmit] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef(null);

  useEffect(() => {
    document.title = 'Become a Founding Seller — Benchlot';
    loadMetaPixel(META_PIXEL_ID);
  }, []);

  const scrollToForm = (e) => {
    if (e) e.preventDefault();
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');

    const payload = {
      first_name: firstName.trim(),
      email: email.toLowerCase().trim(),
      tools_to_list: tools.trim(),
      listing_count_estimate: listingCount || null,
      source: 'founding-sellers-landing',
      signed_up_at: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'founding_sellers'), payload);
      submitToHubSpot({
        firstName: payload.first_name,
        email: payload.email,
        tools: payload.tools_to_list,
        listingCount: payload.listing_count_estimate,
      });
      if (window.fbq) window.fbq('track', 'Lead');
      setDidSubmit(true);
    } catch (err) {
      console.error('Founding seller signup error:', err);
      setError('Something went wrong. Please try again, or email rob@benchlot.com.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bone font-body text-dark-teal">
      {/* Hero with photo background */}
      <section
        className="relative bg-cover"
        style={{
          backgroundImage: "url('/images/founding-hero-tools.jpg')",
          backgroundPosition: '30% bottom',
        }}
      >
        {/* Spruce-tinted overlay for legibility (stronger on left where text sits) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(14,32,32,0.82) 0%, rgba(14,32,32,0.70) 45%, rgba(14,32,32,0.45) 100%)',
          }}
        />

        {/* Wordmark overlay */}
        <div className="relative z-10 px-6 pt-8">
          <div className="max-w-[960px] mx-auto">
            <a href="https://benchlot.com" className="inline-block" aria-label="Benchlot home">
              <span
                className="font-display font-black text-bone"
                style={{ fontSize: '26px', letterSpacing: '-1.5px' }}
              >
                Benchlot
              </span>
            </a>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 px-6 pt-16 md:pt-24 pb-20 md:pb-32">
          <div className="max-w-[960px] mx-auto">
            <h1 className="text-4xl md:text-6xl font-display font-black text-bone leading-[1.05] tracking-tight mb-6 max-w-3xl">
              Your tools deserve a better next home.
            </h1>
            <p className="text-lg md:text-xl text-bone/85 leading-relaxed max-w-2xl mb-10">
              Benchlot is the curated marketplace for quality tools — built by a
              woodworker, for woodworkers. No eBay noise. No Craigslist flakes. Just
              people who know what a Bedrock is worth.
            </p>
            <a
              href="#signup"
              onClick={scrollToForm}
              className="inline-flex items-center px-8 py-4 bg-honey text-dark-teal font-semibold rounded-lg text-base md:text-lg hover:bg-honey-light transition-colors"
            >
              Become a Founding Seller
            </a>
            <p className="mt-4 text-sm text-bone/70">
              Limited to the first 50 founding sellers
            </p>
          </div>
        </div>
      </section>

      {/* The Offer */}
      <section className="px-6 py-16 md:py-20 bg-bone-light border-y border-[#e4e2dc]">
        <div className="max-w-[960px] mx-auto">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-spruce mb-12 md:mb-14 text-center">
            The Founding Seller Deal
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
            <div>
              <h3 className="text-xl font-display font-bold text-spruce mb-3">
                0% selling fees
              </h3>
              <p className="text-[15px] text-spruce/75 leading-relaxed">
                Your first 3 listings are completely free. No commission, no listing
                fees, no catch.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-display font-bold text-spruce mb-3">
                Curated, not cluttered
              </h3>
              <p className="text-[15px] text-spruce/75 leading-relaxed">
                Your Lie-Nielsen won't sit next to a Harbor Freight combo kit. Benchlot
                is curated for serious woodworkers.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-display font-bold text-spruce mb-3">
                Buyers who get it
              </h3>
              <p className="text-[15px] text-spruce/75 leading-relaxed">
                Every buyer on Benchlot is a woodworker. No flippers. No lowballers.
                People who'll actually use your tools.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="px-6 py-16 md:py-24">
        <div className="max-w-[960px] mx-auto">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-spruce mb-10 md:mb-12 max-w-2xl">
            You already know the alternatives aren't great.
          </h2>

          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left">
                  <th className="w-[22%] py-4 pr-4 align-bottom text-sm font-body font-medium uppercase tracking-wide text-spruce/60"></th>
                  <th className="w-[26%] py-4 px-4 align-bottom text-sm font-body font-semibold text-spruce/70">
                    eBay
                  </th>
                  <th className="w-[26%] py-4 px-4 align-bottom text-sm font-body font-semibold text-spruce/70">
                    Craigslist / FB
                  </th>
                  <th className="w-[26%] py-4 px-4 align-bottom relative">
                    <span className="absolute left-4 right-4 top-0 h-1 bg-honey rounded-b-sm" />
                    <span className="block text-sm font-body font-bold text-spruce">
                      Benchlot
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="text-[15px]">
                {[
                  ['Fees', '~13% + shipping hassle', 'Free, but you pay in time', '0% for founding sellers'],
                  ['Audience', 'Everyone (mostly not woodworkers)', 'Local, mostly tire-kickers', 'Woodworkers only'],
                  ['Listing experience', 'Lost among 17,000 router bit listings', '"Is this still available?" → silence', 'Curated. Your tool gets seen.'],
                  ['Trust', 'Buyer/seller disputes, returns', 'Meet a stranger in a parking lot', 'Community of verified woodworkers'],
                ].map(([label, ebay, cl, bl]) => (
                  <tr key={label} className="border-t border-[#e4e2dc]">
                    <td className="py-5 pr-4 font-display font-semibold text-spruce">
                      {label}
                    </td>
                    <td className="py-5 px-4 text-spruce/70">{ebay}</td>
                    <td className="py-5 px-4 text-spruce/70">{cl}</td>
                    <td className="py-5 px-4 text-spruce font-medium bg-bone-light">
                      {bl}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked comparison */}
          <div className="md:hidden space-y-6">
            {[
              {
                label: 'Fees',
                rows: [
                  ['eBay', '~13% + shipping hassle'],
                  ['Craigslist / FB', 'Free, but you pay in time'],
                  ['Benchlot', '0% for founding sellers'],
                ],
              },
              {
                label: 'Audience',
                rows: [
                  ['eBay', 'Everyone (mostly not woodworkers)'],
                  ['Craigslist / FB', 'Local, mostly tire-kickers'],
                  ['Benchlot', 'Woodworkers only'],
                ],
              },
              {
                label: 'Listing experience',
                rows: [
                  ['eBay', 'Lost among 17,000 router bit listings'],
                  ['Craigslist / FB', '"Is this still available?" → silence'],
                  ['Benchlot', 'Curated. Your tool gets seen.'],
                ],
              },
              {
                label: 'Trust',
                rows: [
                  ['eBay', 'Buyer/seller disputes, returns'],
                  ['Craigslist / FB', 'Meet a stranger in a parking lot'],
                  ['Benchlot', 'Community of verified woodworkers'],
                ],
              },
            ].map(({ label, rows }) => (
              <div
                key={label}
                className="bg-bone-light rounded-card border border-[#e4e2dc] overflow-hidden"
              >
                <div className="px-5 py-3 bg-spruce text-bone font-display font-semibold">
                  {label}
                </div>
                <ul className="divide-y divide-[#e4e2dc]">
                  {rows.map(([name, value]) => {
                    const isBenchlot = name === 'Benchlot';
                    return (
                      <li
                        key={name}
                        className={`px-5 py-4 ${isBenchlot ? 'bg-honey/10' : ''}`}
                      >
                        <div
                          className={`text-xs uppercase tracking-wide mb-1 ${
                            isBenchlot ? 'text-spruce font-bold' : 'text-spruce/60 font-medium'
                          }`}
                        >
                          {name}
                        </div>
                        <div
                          className={`text-[15px] ${
                            isBenchlot ? 'text-spruce font-medium' : 'text-spruce/75'
                          }`}
                        >
                          {value}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who's behind this */}
      <section className="px-6 py-16 md:py-24 bg-spruce">
        <div className="max-w-[720px] mx-auto">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-bone mb-6">
            Built from the bench, not a boardroom.
          </h2>
          <p className="text-lg leading-relaxed text-bone/85">
            Benchlot was built by a woodworker who got tired of watching
            quality tools disappear into eBay's void or get scooped by flippers at
            estate sales. This isn't a tech company that discovered woodworking —
            it's a woodworker who built the marketplace the community actually needs.
          </p>
        </div>
      </section>

      {/* Signup form */}
      <section id="signup" className="px-6 py-16 md:py-24" ref={formRef}>
        <div className="max-w-[560px] mx-auto">
          <div className="bg-bone-light rounded-card border border-[#e4e2dc] p-6 md:p-10 shadow-card">
            {didSubmit ? (
              <div className="text-center py-6">
                <h2 className="text-2xl md:text-3xl font-display font-bold text-spruce mb-3">
                  You're in.
                </h2>
                <p className="text-[15px] text-spruce/80 leading-relaxed">
                  We'll email you when it's time to list your first tool. Keep an eye
                  on your inbox — Rob reads every signup personally and may reach out
                  directly.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-spruce mb-2">
                  Claim your founding seller spot
                </h2>
                <p className="text-[15px] text-spruce/75 mb-8">
                  50 spots. 0% fees on your first 3 listings. Tell us what you'd list.
                </p>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="fs-firstname"
                      className="block text-sm font-medium text-spruce mb-1.5"
                    >
                      First name
                    </label>
                    <input
                      id="fs-firstname"
                      type="text"
                      autoComplete="given-name"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 bg-bone border border-[#d4d2cc] rounded-btn focus:outline-none focus:ring-2 focus:ring-spruce focus:border-transparent font-body text-dark-teal"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="fs-email"
                      className="block text-sm font-medium text-spruce mb-1.5"
                    >
                      Email
                    </label>
                    <input
                      id="fs-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 bg-bone border border-[#d4d2cc] rounded-btn focus:outline-none focus:ring-2 focus:ring-spruce focus:border-transparent font-body text-dark-teal"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="fs-tools"
                      className="block text-sm font-medium text-spruce mb-1.5"
                    >
                      What tools would you list first?
                    </label>
                    <textarea
                      id="fs-tools"
                      required
                      rows={4}
                      value={tools}
                      onChange={(e) => setTools(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="e.g., Stanley No. 5 Jack Plane, set of Narex bench chisels, Veritas router plane..."
                      className="w-full px-4 py-3 bg-bone border border-[#d4d2cc] rounded-btn focus:outline-none focus:ring-2 focus:ring-spruce focus:border-transparent font-body text-dark-teal resize-y"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="fs-count"
                      className="block text-sm font-medium text-spruce mb-1.5"
                    >
                      How many tools do you think you'd list in your first month?
                      <span className="text-spruce/50 font-normal"> (optional)</span>
                    </label>
                    <select
                      id="fs-count"
                      value={listingCount}
                      onChange={(e) => setListingCount(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 bg-bone border border-[#d4d2cc] rounded-btn focus:outline-none focus:ring-2 focus:ring-spruce focus:border-transparent font-body text-dark-teal"
                    >
                      <option value="">Select one</option>
                      <option value="1-3">1–3 tools</option>
                      <option value="4-10">4–10 tools</option>
                      <option value="10+">10+ tools</option>
                      <option value="not-sure">Not sure yet</option>
                    </select>
                  </div>

                  {error && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 text-error text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full px-6 py-4 bg-honey text-dark-teal font-semibold rounded-btn hover:bg-honey-light transition-colors text-base disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Submitting…' : 'Count me in'}
                  </button>
                  <p className="text-xs text-spruce/60 text-center">
                    No spam. Just a welcome email and early access when we open
                    listings.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10 border-t border-[#e4e2dc]">
        <div className="max-w-[960px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-spruce/70">
          <div className="flex items-center gap-4">
            <span
              className="text-lg font-display font-black text-spruce"
              style={{ letterSpacing: '-1px' }}
            >
              Benchlot
            </span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
            <span>
              Questions?{' '}
              <a
                href="mailto:rob@benchlot.com"
                className="text-spruce hover:text-honey-dark underline underline-offset-2"
              >
                rob@benchlot.com
              </a>
            </span>
            <a
              href="https://benchlot.com"
              className="text-spruce/60 hover:text-spruce text-xs"
            >
              Learn more about Benchlot →
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FoundingSellersPage;
