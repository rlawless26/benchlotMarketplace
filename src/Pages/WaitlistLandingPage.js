// src/Pages/WaitlistLandingPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import ToolScanExampleCard from '../components/ToolScanExampleCard';

const WaitlistLandingPage = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    document.title = 'Rekerf — The Marketplace for Premium Used Hand Tools';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: '', message: '' });

    try {
      await addDoc(collection(db, 'waitlist'), {
        email: email.toLowerCase().trim(),
        signed_up_at: serverTimestamp()
      });

      setSubmitStatus({
        type: 'success',
        message: "You're on the list! We'll notify you when Rekerf is ready."
      });
      setEmail('');
    } catch (error) {
      console.error('Waitlist signup error:', error);
      setSubmitStatus({
        type: 'error',
        message: 'Something went wrong. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const StatusMessage = () => {
    if (!submitStatus.message) return null;
    return (
      <div className={`mt-4 p-3 rounded-md text-center text-sm ${
        submitStatus.type === 'success'
          ? 'bg-green-50 text-success border border-green-200'
          : 'bg-red-50 text-error border border-red-200'
      }`}>
        {submitStatus.message}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-bone font-body">
      {/* Section 1: Hero */}
      <section
        className="relative flex items-center justify-center min-h-[90vh] bg-cover bg-center"
        style={{ backgroundImage: 'url("/images/shop_tools_bg.jpg")' }}
      >
        <div className="absolute inset-0 bg-spruce bg-opacity-60"></div>

        {/* Nav */}
        <nav className="absolute top-0 left-0 right-0 z-20 py-6 px-6 flex items-center justify-between">
          <span className="text-xl font-display font-black text-bone" style={{ letterSpacing: '-1.5px' }}>Rekerf</span>
          <div className="flex items-center gap-5">
            <Link to="/scan" className="text-bone font-body text-sm font-medium hover:text-honey transition-colors">Scan a Tool</Link>
            <a
              href="#waitlist-bottom"
              className="hidden sm:inline-flex px-4 py-2 bg-honey text-dark-teal rounded-lg text-sm font-medium font-body hover:bg-honey-light transition-colors"
            >
              Join Waitlist
            </a>
          </div>
        </nav>

        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-display font-black mb-6 text-bone leading-tight">
            The marketplace for premium used hand tools
          </h1>
          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto" style={{ color: '#e8e6e0' }}>
            Buy and sell quality hand tools with people who know the craft.
          </p>

          {/* CTA */}
          <div className="max-w-xl mx-auto text-center">
            <Link
              to="/scan"
              className="inline-flex items-center gap-1 px-8 py-4 bg-honey text-dark-teal rounded-lg text-lg font-medium font-body hover:bg-honey-light transition-colors"
            >
              What's your tool worth? &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Section 2: ToolScan Showcase */}
      <section className="bg-spruce py-16">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <h2 className="text-3xl font-display font-bold text-bone text-center mb-3">
            See what your tools are worth
          </h2>
          <p className="text-center mb-10 text-lg font-body max-w-2xl mx-auto" style={{ color: '#6a8a84' }}>
            Photograph a hand tool and we'll do our best to tell you what it is, what era it's from, and what it's worth.
          </p>

          <ToolScanExampleCard />

          <div className="text-center mt-8">
            <Link
              to="/scan"
              className="inline-flex items-center gap-1 px-6 py-3 bg-honey text-dark-teal rounded-lg font-medium font-body hover:bg-honey-light transition-colors"
            >
              Try it on your tools &rarr;
            </Link>
            <p className="mt-4 text-sm font-body" style={{ color: 'rgba(242, 240, 235, 0.6)' }}>
              Planes &middot; Chisels &middot; Saws &middot; Spokeshaves &middot; Measuring tools &middot; And more
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: Who It's For */}
      <section className="py-20 bg-bone">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-display font-bold text-spruce text-center mb-12">
            Built for woodworkers at every stage
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-[#fafaf8] rounded-xl border border-[#e4e2dc] p-6">
              <h3 className="text-lg font-display font-semibold text-spruce mb-3">Inherited a workshop?</h3>
              <p className="text-base font-body text-secondary mb-5">
                You don't need to become an expert in someone else's hobby to understand what they left behind. Photograph the tools, and we'll tell you what they are and what they're worth.
              </p>
              <Link to="/scan" className="text-honey font-body font-medium hover:text-honey-dark transition-colors">
                Scan your first tool &rarr;
              </Link>
            </div>

            {/* Card 2 */}
            <div className="bg-[#fafaf8] rounded-xl border border-[#e4e2dc] p-6">
              <h3 className="text-lg font-display font-semibold text-spruce mb-3">Upgrading your tools?</h3>
              <p className="text-base font-body text-secondary mb-5">
                Moving from Narex to Lie-Nielsen? List what you're done with, find what you're looking for. A marketplace where every buyer and seller knows the craft.
              </p>
              <a href="#waitlist-bottom" className="text-honey font-body font-medium hover:text-honey-dark transition-colors">
                Join the waitlist &rarr;
              </a>
            </div>

            {/* Card 3 */}
            <div className="bg-[#fafaf8] rounded-xl border border-[#e4e2dc] p-6">
              <h3 className="text-lg font-display font-semibold text-spruce mb-3">Selling your collection?</h3>
              <p className="text-base font-body text-secondary mb-5">
                We'll draft a title, description, and price estimate from your photo. You review it, adjust what needs adjusting, and list.
              </p>
              <Link to="/scan" className="text-honey font-body font-medium hover:text-honey-dark transition-colors">
                Try it free &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: How It Works */}
      <section className="py-20 bg-bone-light">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-display font-bold text-spruce text-center mb-12">
            How it works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-spruce text-bone flex items-center justify-center mx-auto mb-4 font-display font-bold text-lg">1</div>
              <h3 className="text-lg font-display font-semibold text-dark-teal mb-2">Scan</h3>
              <p className="text-base text-secondary font-body">
                Photograph your tool. We'll take a crack at identifying it.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-spruce text-bone flex items-center justify-center mx-auto mb-4 font-display font-bold text-lg">2</div>
              <h3 className="text-lg font-display font-semibold text-dark-teal mb-2">List</h3>
              <p className="text-base text-secondary font-body">
                Review the AI-generated listing, adjust anything, and publish. No more tedious manual descriptions.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-spruce text-bone flex items-center justify-center mx-auto mb-4 font-display font-bold text-lg">3</div>
              <h3 className="text-lg font-display font-semibold text-dark-teal mb-2">Sell</h3>
              <p className="text-base text-secondary font-body">
                Secure payments, verified buyers, and a community that values quality tools.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Bottom CTA */}
      <section id="waitlist-bottom" className="py-20 bg-bone">
        <div className="max-w-xl mx-auto px-4 text-center">
          <p className="text-sm text-secondary font-body mb-4">
            Built by a wannabe skilled woodworker in Boston.
          </p>
          <h2 className="text-3xl font-display font-bold text-spruce mb-3">
            Nothing to scan right now?
          </h2>
          <p className="text-secondary font-body mb-8">
            Join the waitlist and we'll let you know when the marketplace launches.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spruce focus:border-transparent font-body"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
              <button
                type="submit"
                className="px-6 py-3 bg-honey text-dark-teal font-medium rounded-lg hover:bg-honey-light transition-colors whitespace-nowrap font-body"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Joining...' : 'Join Waitlist'}
              </button>
            </div>
            <StatusMessage />
          </form>
          <p className="mt-4 text-sm text-secondary font-body">
            Or{' '}
            <Link to="/scan" className="text-honey hover:text-honey-dark font-medium">scan a tool now &rarr;</Link>
            {' '}&mdash; no account needed.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-dark-teal text-center">
        <p className="text-stone-400 text-sm font-body">
          Built in New England for the hand tool community.
        </p>
        <p className="text-stone-500 text-xs mt-2 font-body">
          &copy; {new Date().getFullYear()} Rekerf. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default WaitlistLandingPage;
