/**
 * Seller Onboarding Page
 *
 * Thin wrapper around Stripe Connect Express hosted onboarding. Three modes
 * keyed off the route:
 *
 *   /seller/onboarding          → generate a fresh Stripe accountLinks URL
 *                                 and redirect to it. If the seller doesn't
 *                                 have a Stripe account yet, show a manual
 *                                 "Set Up Payouts" button instead of auto-
 *                                 creating (to avoid cascading state changes
 *                                 that could trigger re-render loops).
 *
 *   /seller/onboarding/refresh  → expired link, same as above.
 *
 *   /seller/onboarding/complete → returning from Stripe. Fetch fresh account
 *                                 status, then redirect to dashboard.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader, AlertTriangle } from 'lucide-react';
import { useAuth } from '../firebase/hooks/useAuth';
import { useSeller } from '../firebase/hooks/useSeller';
import { getConnectAccountStatus, refreshConnectAccountLink } from '../utils/stripeService';
import { openAuthModal } from '../utils/featureFlags';

const SellerOnboardingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { createSellerAccount } = useSeller();
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Connecting you to Stripe…');
  const [needsAccountCreation, setNeedsAccountCreation] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);

  // Capture user UID in a ref so useEffect doesn't depend on the user object
  // (which changes on every onSnapshot delivery and would re-trigger the effect).
  const userRef = useRef(null);
  const hasAttempted = useRef(false);

  const isCompleteReturn = location.pathname.includes('/complete');

  // ── One-shot effect: runs once when auth resolves ─────────────────────
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      openAuthModal('signin', '/seller/onboarding');
      return;
    }

    // Capture the UID and email for use in the async function
    userRef.current = { uid: user.uid, email: user.email, displayName: user.displayName, sellerName: user.sellerName };

    // Only run once per mount
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    let cancelled = false;

    const run = async () => {
      try {
        if (isCompleteReturn) {
          // ── Return path from Stripe ────────────────────────────────────
          setStatusMessage('Finalizing your account…');
          try {
            await getConnectAccountStatus(userRef.current.uid);
          } catch (statusErr) {
            console.warn('[onboarding/complete] could not fetch account status:', statusErr.message);
          }
          if (cancelled) return;
          navigate('/seller/dashboard?onboardingComplete=true');
          return;
        }

        // ── Outbound to Stripe ───────────────────────────────────────────
        setStatusMessage('Connecting you to Stripe…');
        const result = await refreshConnectAccountLink(userRef.current.uid);
        if (cancelled) return;

        if (result && result.url) {
          window.location.href = result.url;
        } else {
          throw new Error('Could not generate a Stripe onboarding link.');
        }
      } catch (err) {
        console.error('[onboarding] error:', err);
        if (cancelled) return;

        // If the error is "not a seller" or similar, the user needs an
        // account created from scratch. Show a manual button instead of
        // auto-retrying (which triggers updateDoc → onSnapshot → loop).
        if (err.message?.includes('not a seller') || err.message?.includes('404')) {
          setNeedsAccountCreation(true);
          setError(null);
        } else if (err.message?.includes('Too many requests')) {
          setError('Too many requests. Please wait a few minutes and try again.');
        } else {
          setError(err.message || 'Something went wrong. Please try again.');
        }
      }
    };

    run();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isCompleteReturn, navigate]);

  // ── Manual account creation (user clicks button, not auto-triggered) ──
  const handleCreateAccount = useCallback(async () => {
    if (!userRef.current) return;

    setCreatingAccount(true);
    setError(null);

    try {
      const result = await createSellerAccount({
        sellerName: userRef.current.displayName || userRef.current.sellerName || '',
        sellerType: 'individual',
        contactEmail: userRef.current.email || '',
        isSeller: true,
        'profile.isSeller': true,
      });

      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        setError(result.error || 'Could not create your Stripe account. Please try again.');
        setCreatingAccount(false);
      }
    } catch (err) {
      console.error('[onboarding] create account error:', err);
      if (err.message?.includes('Too many requests')) {
        setError('Too many requests. Please wait a few minutes and try again.');
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
      setCreatingAccount(false);
    }
  }, [createSellerAccount]);

  return (
    <div className="bg-bone min-h-screen">
      <main className="max-w-md mx-auto px-4 py-16">
        <div className="bg-bone-light rounded-lg shadow-md border border-default p-8 text-center">
          {error ? (
            <>
              <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-display font-medium text-spruce mb-2">
                Onboarding hit a snag
              </h1>
              <p className="text-gray-700 mb-6">{error}</p>
              <button
                type="button"
                onClick={() => {
                  hasAttempted.current = false;
                  setError(null);
                  setNeedsAccountCreation(false);
                  window.location.reload();
                }}
                className="px-6 py-2 bg-honey text-dark-teal rounded-md font-medium hover:bg-honey-light"
              >
                Try Again
              </button>
              <p className="text-sm text-gray-500 mt-4">
                Or{' '}
                <button
                  type="button"
                  onClick={() => navigate('/seller/dashboard')}
                  className="underline text-spruce hover:text-spruce-dark"
                >
                  return to your dashboard
                </button>
                .
              </p>
            </>
          ) : needsAccountCreation ? (
            <>
              <h1 className="text-xl font-display font-medium text-spruce mb-2">
                Set up your payout account
              </h1>
              <p className="text-gray-700 mb-6">
                You'll be redirected to Stripe to verify your identity and connect a bank account. Takes about 3 minutes.
              </p>
              <button
                type="button"
                onClick={handleCreateAccount}
                disabled={creatingAccount}
                className="px-8 py-3 bg-honey text-dark-teal rounded-md font-medium hover:bg-honey-light disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingAccount ? (
                  <span className="flex items-center justify-center">
                    <Loader className="h-4 w-4 animate-spin mr-2" />
                    Setting up…
                  </span>
                ) : (
                  'Set Up Payouts'
                )}
              </button>
              <p className="text-sm text-gray-500 mt-4">
                Or{' '}
                <button
                  type="button"
                  onClick={() => navigate('/seller/dashboard')}
                  className="underline text-spruce hover:text-spruce-dark"
                >
                  return to your dashboard
                </button>
                .
              </p>
            </>
          ) : (
            <>
              <Loader className="h-10 w-10 text-spruce animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-display font-medium text-spruce mb-2">
                {isCompleteReturn ? 'Almost done…' : 'Setting up payouts'}
              </h1>
              <p className="text-gray-700">{statusMessage}</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default SellerOnboardingPage;
