import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useSeller } from '../firebase/hooks/useSeller';

/**
 * Persistent banner that warns sellers their Stripe Connect payout setup
 * is incomplete. Renders nothing if the user is not a seller, if onboarding
 * is complete, or while seller status is still loading.
 *
 * Props:
 *   variant — 'banner' (default, full-width card) or 'inline' (smaller, fits in form flows)
 *   className — optional extra classes for the wrapper
 */
const StripeStatusBanner = ({ variant = 'banner', className = '' }) => {
  const { isSeller, isOnboardingComplete } = useSeller();

  if (!isSeller) return null;
  if (isOnboardingComplete) return null;

  const isInline = variant === 'inline';

  return (
    <div
      className={`bg-honey-light border border-honey text-dark-teal rounded-md ${
        isInline ? 'px-4 py-3' : 'px-5 py-4'
      } ${className}`}
      role="status"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5 text-dark-teal" />
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${isInline ? 'text-sm' : 'text-base'}`}>
            Set up payouts to get paid when your tool sells
          </p>
          <p className={`text-dark-teal/80 mt-1 ${isInline ? 'text-xs' : 'text-sm'}`}>
            Your listings are visible to buyers, but you'll need to connect a bank account
            before you can receive payment.
          </p>
          <Link
            to="/seller/onboarding"
            className={`inline-flex items-center mt-2 font-medium underline hover:no-underline ${
              isInline ? 'text-xs' : 'text-sm'
            }`}
          >
            Set Up Payouts →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StripeStatusBanner;
