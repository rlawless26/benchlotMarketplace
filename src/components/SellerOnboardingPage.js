/**
 * Seller Onboarding Page
 *
 * Thin wrapper around Stripe Connect Express hosted onboarding. Three modes
 * keyed off the route:
 *
 *   /seller/onboarding          → generate a fresh Stripe accountLinks URL
 *                                 and window.location.href to it. The user
 *                                 completes ID verification, business info,
 *                                 and bank account collection on Stripe's
 *                                 hosted pages.
 *
 *   /seller/onboarding/refresh  → the previous Stripe link expired. Regenerate
 *                                 and bounce the user back to Stripe.
 *
 *   /seller/onboarding/complete → the user just finished Stripe onboarding.
 *                                 Fetch their fresh account status (which
 *                                 also pushes chargesEnabled / payoutsEnabled
 *                                 to Firestore), then redirect to the
 *                                 dashboard with a success flag.
 *
 * The page deliberately renders almost no UI of its own — just a centered
 * spinner with a status message. All the actual onboarding happens on
 * stripe.com.
 */

import React, { useEffect, useState } from 'react';
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

  const isCompleteReturn = location.pathname.includes('/complete');

  useEffect(() => {
    // Wait for auth to resolve before doing anything
    if (authLoading) return;

    if (!user) {
      openAuthModal('signin', '/seller/onboarding');
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        if (isCompleteReturn) {
          // ── Return path from Stripe ──────────────────────────────────────
          // Pull the latest account status. The /get-account-status endpoint
          // also writes chargesEnabled / payoutsEnabled / detailsSubmitted to
          // the user doc, which the realtime useAuth snapshot listener picks
          // up immediately, so the dashboard banner reacts on its own.
          setStatusMessage('Finalizing your account…');
          try {
            await getConnectAccountStatus(user.uid);
          } catch (statusErr) {
            // Non-fatal — the webhook will eventually update the user doc.
            console.warn('[onboarding/complete] could not fetch account status:', statusErr.message);
          }
          if (cancelled) return;
          navigate('/seller/dashboard?onboardingComplete=true');
          return;
        }

        // ── Outbound to Stripe (normal entry OR refresh) ───────────────────
        // Try refreshing an existing account link first. If the user has no
        // Stripe account yet (e.g. because create-connected-account failed
        // during publish), fall back to creating one from scratch.
        setStatusMessage('Connecting you to Stripe…');
        let result;
        try {
          result = await refreshConnectAccountLink(user.uid);
        } catch (refreshErr) {
          console.warn('[onboarding] refresh failed, trying to create account:', refreshErr.message);
          // Fallback: create the Stripe Express account now. createSellerAccount
          // handles the Firestore user-doc setup AND calls /create-connected-account
          // which returns a hosted-onboarding URL.
          setStatusMessage('Setting up your payout account…');
          const createResult = await createSellerAccount({
            sellerName: user.displayName || user.sellerName || '',
            sellerType: 'individual',
            contactEmail: user.email || '',
            isSeller: true,
            'profile.isSeller': true,
          });
          if (createResult.success && createResult.url) {
            result = { url: createResult.url };
          } else {
            throw new Error(createResult.error || 'Could not create your Stripe account. Please try again.');
          }
        }

        if (cancelled) return;

        if (!result || !result.url) {
          throw new Error('Could not generate a Stripe onboarding link. Please try again.');
        }

        // Full-page redirect to Stripe's hosted onboarding
        window.location.href = result.url;
      } catch (err) {
        console.error('[onboarding] error:', err);
        if (!cancelled) {
          setError(err.message || 'Something went wrong. Please try again.');
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, isCompleteReturn]);

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
                onClick={() => window.location.reload()}
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
