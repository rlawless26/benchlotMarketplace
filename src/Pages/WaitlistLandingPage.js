// src/Pages/WaitlistLandingPage.js
import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Search, Users, ShieldCheck } from 'lucide-react';

const WaitlistLandingPage = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    document.title = 'Join the Waitlist | Rekerf';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: '', message: '' });

    try {
      // Write to Firestore (duplicates handled server-side by HubSpot 409)
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
      {/* Header / Logo */}
      <header className="absolute top-0 left-0 right-0 z-20 py-6 px-6">
        <span className="text-2xl font-display font-black text-bone" style={{ letterSpacing: '-1.5px' }}>Rekerf</span>
      </header>

      {/* Hero Section */}
      <section
        className="relative flex items-center justify-center min-h-[90vh] bg-cover bg-center"
        style={{ backgroundImage: 'url("/images/shop_tools_bg.jpg")' }}
      >
        <div className="absolute inset-0 bg-spruce bg-opacity-60"></div>

        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-display font-black mb-6 text-bone leading-tight">
            The marketplace for premium used hand tools
          </h1>
          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto" style={{ color: '#e8e6e0' }}>
            Buy and sell quality hand tools, power tools, and shop equipment — a marketplace made for woodworkers and makers.
          </p>

          {/* Inline email signup */}
          <div className="bg-bone-light rounded-lg shadow-lg p-6 md:p-8 max-w-xl mx-auto">
            <h3 className="text-xl font-display font-medium mb-2 text-dark-teal">
              Join the Waitlist for Early Access
            </h3>
            <p className="text-secondary text-sm mb-4">
              Be the first to know when we launch.
            </p>
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-spruce focus:border-transparent"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-honey text-dark-teal font-medium rounded-md hover:bg-honey-light transition-colors whitespace-nowrap"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Joining...' : 'Join Waitlist'}
                </button>
              </div>
              <StatusMessage />
            </form>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-bone-light">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-display font-medium mb-3 text-dark-teal">How Rekerf Works</h2>
            <p className="text-secondary">A simple way to buy and sell tools you trust.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-bone-dark flex items-center justify-center mx-auto mb-5">
                <Search className="h-7 w-7 text-spruce" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-dark-teal">List or Find</h3>
              <p className="text-secondary text-sm">
                List a tool you're ready to pass on, or browse quality equipment from fellow woodworkers.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-bone-dark flex items-center justify-center mx-auto mb-5">
                <Users className="h-7 w-7 text-spruce" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-dark-teal">Connect</h3>
              <p className="text-secondary text-sm">
                Match with knowledgeable buyers or sellers who share your passion for the craft.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-bone-dark flex items-center justify-center mx-auto mb-5">
                <ShieldCheck className="h-7 w-7 text-spruce" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-dark-teal">Transact with Confidence</h3>
              <p className="text-secondary text-sm">
                Secure payments and a platform built for the community, so every deal feels right.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 bg-bone">
        <div className="max-w-xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-display font-medium mb-3 text-dark-teal">
            Ready to Join?
          </h2>
          <p className="text-secondary mb-8">
            Sign up for early access and be part of the Rekerf community from day one.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-spruce focus:border-transparent"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
              <button
                type="submit"
                className="px-6 py-3 bg-honey text-dark-teal font-medium rounded-md hover:bg-honey-light transition-colors whitespace-nowrap"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Joining...' : 'Join Waitlist'}
              </button>
            </div>
            <StatusMessage />
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-dark-teal text-center">
        <p className="text-stone-400 text-sm">
          Built in New England for the hand tool community.
        </p>
        <p className="text-stone-500 text-xs mt-2">
          &copy; {new Date().getFullYear()} Rekerf. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default WaitlistLandingPage;