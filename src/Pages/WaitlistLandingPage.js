// src/Pages/WaitlistLandingPage.js
import React, { useState } from 'react';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Search, Users, ShieldCheck } from 'lucide-react';

const WaitlistLandingPage = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: '', message: '' });

    try {
      // Check for duplicate email
      const waitlistRef = collection(db, 'waitlist');
      const q = query(waitlistRef, where('email', '==', email.toLowerCase().trim()));
      const existing = await getDocs(q);

      if (!existing.empty) {
        setSubmitStatus({
          type: 'success',
          message: "You're already on the list! We'll be in touch soon."
        });
        setEmail('');
        setIsSubmitting(false);
        return;
      }

      // Write to Firestore
      await addDoc(waitlistRef, {
        email: email.toLowerCase().trim(),
        signed_up_at: serverTimestamp()
      });

      setSubmitStatus({
        type: 'success',
        message: "You're on the list! We'll notify you when Benchlot is ready."
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
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-red-50 text-red-700 border border-red-200'
      }`}>
        {submitStatus.message}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      {/* Header / Logo */}
      <header className="absolute top-0 left-0 right-0 z-20 py-6 px-6">
        <span className="text-2xl font-serif font-medium text-white">Benchlot</span>
      </header>

      {/* Hero Section */}
      <section
        className="relative flex items-center justify-center min-h-[90vh] bg-cover bg-center"
        style={{ backgroundImage: 'url("/images/shop_tools_bg.jpg")' }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-60"></div>

        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-serif font-medium mb-6 text-white leading-tight">
            Quality Tools Don't Always Need That New Price Tag
          </h1>
          <p className="text-lg md:text-xl text-white text-opacity-90 mb-10 max-w-2xl mx-auto">
            Benchlot is a marketplace for woodworkers and makers to buy and sell quality hand tools,
            power tools, and shop equipment — built by people who actually use them.
          </p>

          {/* Inline email signup */}
          <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 max-w-xl mx-auto">
            <h3 className="text-xl font-serif font-medium mb-2 text-stone-800">
              Join the Waitlist for Early Access
            </h3>
            <p className="text-stone-500 text-sm mb-4">
              Be the first to know when we launch.
            </p>
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-benchlot-primary focus:border-transparent"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-benchlot-primary hover:bg-benchlot-secondary text-white font-medium rounded-md transition-colors whitespace-nowrap"
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
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-serif font-medium mb-3 text-stone-800">How Benchlot Works</h2>
            <p className="text-stone-500">A simple way to buy and sell tools you trust.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-benchlot-accent-light flex items-center justify-center mx-auto mb-5">
                <Search className="h-7 w-7 text-benchlot-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-stone-800">List or Find</h3>
              <p className="text-stone-500 text-sm">
                List a tool you're ready to pass on, or browse quality equipment from fellow woodworkers.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-benchlot-accent-light flex items-center justify-center mx-auto mb-5">
                <Users className="h-7 w-7 text-benchlot-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-stone-800">Connect</h3>
              <p className="text-stone-500 text-sm">
                Match with knowledgeable buyers or sellers who share your passion for the craft.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-benchlot-accent-light flex items-center justify-center mx-auto mb-5">
                <ShieldCheck className="h-7 w-7 text-benchlot-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-stone-800">Transact with Confidence</h3>
              <p className="text-stone-500 text-sm">
                Secure payments and a platform built for the community, so every deal feels right.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 bg-stone-100">
        <div className="max-w-xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-serif font-medium mb-3 text-stone-800">
            Ready to Join?
          </h2>
          <p className="text-stone-500 mb-8">
            Sign up for early access and be part of the Benchlot community from day one.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-benchlot-primary focus:border-transparent"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
              <button
                type="submit"
                className="px-6 py-3 bg-benchlot-primary hover:bg-benchlot-secondary text-white font-medium rounded-md transition-colors whitespace-nowrap"
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
      <footer className="py-8 bg-stone-900 text-center">
        <p className="text-stone-400 text-sm">
          Built in New England for the hand tool community.
        </p>
        <p className="text-stone-500 text-xs mt-2">
          &copy; {new Date().getFullYear()} Benchlot. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default WaitlistLandingPage;
