/**
 * PayoutsSettings Component
 *
 * Seller-only settings tab showing Stripe Connect payout status and setup CTA.
 * Replaces the "Payment Processing" subsection that was buried inside the
 * seller dashboard's Business Details tab.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, AlertTriangle, ExternalLink, DollarSign, Loader } from 'lucide-react';
import { useSeller } from '../../firebase/hooks/useSeller';

const PayoutsSettings = ({ user }) => {
  const { isOnboardingComplete, getDashboardLink } = useSeller();
  const [openingDashboard, setOpeningDashboard] = useState(false);

  const isComplete = isOnboardingComplete ||
    (user?.chargesEnabled === true && user?.payoutsEnabled === true);

  const handleOpenStripeDashboard = async () => {
    setOpeningDashboard(true);
    try {
      const result = await getDashboardLink();
      if (result.success && result.url) {
        window.open(result.url, '_blank');
      }
    } catch (err) {
      console.error('Error opening Stripe dashboard:', err);
    } finally {
      setOpeningDashboard(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-display font-medium text-stone-800">Payouts</h2>
        <p className="text-stone-600 text-sm mt-1">
          Manage how you receive payments when your tools sell
        </p>
      </div>

      {isComplete ? (
        <>
          {/* Connected state */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-medium text-green-800 mb-1">
                  Payouts connected
                </h3>
                <p className="text-green-700 text-sm">
                  Your bank account is connected and you're ready to receive payments.
                  When a buyer purchases one of your tools, your earnings (90% of the
                  sale price) will be transferred to your connected account.
                </p>
              </div>
            </div>
          </div>

          {/* Stripe account info */}
          <div className="bg-bone-light rounded-lg border border-default p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-stone-800">Stripe Express</h3>
                <p className="text-sm text-stone-500 mt-0.5">
                  {user?.stripeAccountId
                    ? `Account ${user.stripeAccountId.slice(0, 8)}...${user.stripeAccountId.slice(-4)}`
                    : 'Connected'}
                </p>
              </div>
              <button
                onClick={handleOpenStripeDashboard}
                disabled={openingDashboard}
                className="text-sm font-medium text-spruce hover:underline flex items-center disabled:opacity-50"
              >
                {openingDashboard ? (
                  <Loader className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-1" />
                )}
                Manage in Stripe
              </button>
            </div>
          </div>

          {/* Fee explanation */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <DollarSign className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800">How payouts work</h4>
                <p className="text-xs text-blue-700 mt-1">
                  Benchlot charges a 10% marketplace fee on each sale (includes payment
                  processing). When a buyer purchases your tool, your earnings (90% of
                  the sale price) are transferred to your connected bank account.
                  Transfers typically arrive within 2-3 business days.
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Not connected state */}
          <div className="bg-honey-light border border-honey rounded-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-8 w-8 text-dark-teal flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-medium text-dark-teal mb-1">
                  Set up payouts to get paid
                </h3>
                <p className="text-dark-teal/80 text-sm mb-4">
                  Your listings are visible to buyers, but you'll need to connect a
                  bank account before you can receive payment. You'll be redirected to
                  Stripe to verify your identity and connect your account. Takes about
                  3 minutes.
                </p>
                <Link
                  to="/seller/onboarding"
                  className="inline-flex items-center px-5 py-2.5 bg-honey text-dark-teal rounded-md font-medium hover:bg-honey/80 border border-dark-teal/10"
                >
                  Set Up Payouts →
                </Link>
              </div>
            </div>
          </div>

          {/* Fee explanation */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <DollarSign className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800">What are the fees?</h4>
                <p className="text-xs text-blue-700 mt-1">
                  Listing tools on Benchlot is free. When a tool sells, Benchlot charges
                  a 10% marketplace fee (includes payment processing). You keep 90% of
                  the sale price. There are no hidden costs or subscription fees.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PayoutsSettings;
