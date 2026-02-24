import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Simple SVG icons for How It Works
const CameraIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CC785C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

const MessageIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CC785C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
);

const ShieldCheckIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CC785C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CC785C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const BagIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CC785C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 01-8 0"/>
  </svg>
);

const ChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#44403C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-25 hidden sm:block">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

function StepCard({ icon, label }) {
  return (
    <div className="flex flex-col items-center gap-2" style={{ minWidth: '90px', maxWidth: '120px' }}>
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'rgba(204,120,92,0.1)' }}
      >
        {icon}
      </div>
      <span className="text-sm font-medium text-center leading-tight" style={{ color: '#44403C' }}>
        {label}
      </span>
    </div>
  );
}

export default function WaitlistLandingPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalized = email.toLowerCase().trim();
    if (!normalized) return;

    setStatus('submitting');
    try {
      await setDoc(doc(db, 'waitlist', normalized), {
        email: normalized,
        signed_up_at: new Date().toISOString(),
      });
      setStatus('success');
      setEmail('');
    } catch (err) {
      console.error('Waitlist signup error:', err);
      setStatus('error');
    }
  };

  return (
    <div
      style={{ backgroundColor: '#F0EEE6', color: '#44403C', fontFamily: "'Montserrat', sans-serif" }}
      className="min-h-screen"
    >
      {/* Hero Section */}
      <section className="relative" style={{ minHeight: '520px' }}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/shop_tools_bg.jpg')" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.55))' }}
        />
        <div
          className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-20"
          style={{ minHeight: '520px' }}
        >
          <div
            style={{
              fontFamily: "'Spectral', serif",
              fontSize: '1.75rem',
              fontWeight: 600,
              color: '#F0EEE6',
              letterSpacing: '0.06em',
              marginBottom: '2.5rem',
            }}
          >
            Benchlot
          </div>
          <h1
            className="text-3xl md:text-5xl font-semibold max-w-2xl mb-5"
            style={{ fontFamily: "'Spectral', serif", color: '#FFFFFF', lineHeight: 1.15 }}
          >
            Quality Tools Don't Always Need That New Price Tag
          </h1>
          <p
            className="text-base md:text-lg max-w-xl"
            style={{ color: '#F0EEE6', lineHeight: 1.7, opacity: 0.93 }}
          >
            Benchlot is the marketplace where woodworkers buy and sell premium tools
            with confidence. Build your dream workshop for less &mdash; or find the
            right home for quality equipment that deserves another life.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-14 px-6 max-w-3xl mx-auto text-center">
        <h2
          className="text-2xl md:text-3xl font-semibold mb-10"
          style={{ fontFamily: "'Spectral', serif" }}
        >
          How It Works
        </h2>

        {/* For Sellers */}
        <div className="mb-8">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-5"
            style={{ color: '#CC785C' }}
          >
            For Sellers
          </p>
          <div className="flex items-center justify-center gap-3 md:gap-5 flex-wrap">
            <StepCard icon={<CameraIcon />} label="List Your Tool" />
            <ChevronRight />
            <StepCard icon={<MessageIcon />} label="Connect With Buyers" />
            <ChevronRight />
            <StepCard icon={<ShieldCheckIcon />} label="Sell With Confidence" />
          </div>
        </div>

        {/* For Buyers */}
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-5"
            style={{ color: '#CC785C' }}
          >
            For Buyers
          </p>
          <div className="flex items-center justify-center gap-3 md:gap-5 flex-wrap">
            <StepCard icon={<SearchIcon />} label="Browse Quality Tools" />
            <ChevronRight />
            <StepCard icon={<MessageIcon />} label="Connect With Sellers" />
            <ChevronRight />
            <StepCard icon={<BagIcon />} label="Buy With Confidence" />
          </div>
        </div>
      </section>

      {/* Email Signup */}
      <section
        className="py-12 px-6 text-center"
        style={{ backgroundColor: 'rgba(204,120,92,0.07)' }}
      >
        <h2
          className="text-xl md:text-2xl font-semibold mb-6"
          style={{ fontFamily: "'Spectral', serif" }}
        >
          Join the Waitlist for Early Access
        </h2>

        {status === 'success' ? (
          <p className="text-base font-medium" style={{ color: '#CC785C' }}>
            You're on the list! We'll be in touch soon.
          </p>
        ) : (
          <>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                className="w-full sm:flex-1 px-4 py-3 rounded-lg border text-base outline-none transition-colors focus:ring-2"
                style={{
                  borderColor: '#D5D0C8',
                  backgroundColor: '#FFFFFF',
                  color: '#44403C',
                  fontFamily: "'Montserrat', sans-serif",
                }}
              />
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full sm:w-auto px-6 py-3 rounded-lg text-white font-medium text-base cursor-pointer"
                style={{
                  backgroundColor: '#CC785C',
                  opacity: status === 'submitting' ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => { if (status !== 'submitting') e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={(e) => { if (status !== 'submitting') e.currentTarget.style.opacity = '1'; }}
              >
                {status === 'submitting' ? 'Joining...' : 'Join Waitlist'}
              </button>
            </form>
            {status === 'error' && (
              <p className="mt-3 text-sm" style={{ color: '#B43C38' }}>
                Something went wrong. Please try again.
              </p>
            )}
          </>
        )}
      </section>

      {/* Footer */}
      <footer
        className="py-8 px-6 text-center text-sm"
        style={{ color: '#44403C', opacity: 0.55 }}
      >
        Built in New England for the hand tool community
      </footer>
    </div>
  );
}
