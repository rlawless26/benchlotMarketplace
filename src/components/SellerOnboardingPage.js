import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../firebase/hooks/useAuth';
import { getConnectAccountStatus, refreshConnectAccountLink } from '../utils/stripeService';

/**
 * Seller Onboarding Page
 * Manages the Stripe Connect onboarding process
 * Shows status and provides options to continue/refresh onboarding
 */
const SellerOnboardingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accountStatus, setAccountStatus] = useState(null);
  const [error, setError] = useState(null);
  
  // Check if this is a refresh from Stripe
  const isRefresh = new URLSearchParams(location.search).get('refresh') === 'true';

  // Get current user and check their Stripe account status
  useEffect(() => {
    const checkUserAndStatus = async () => {
      try {
        // Check if still loading authentication state
        if (loading && !user) {
          return;
        }
        
        if (!user) {
          navigate('/login', { state: { from: '/seller/onboarding' } });
          return;
        }
        
        // Check if this is a return from Stripe onboarding complete
        const isComplete = location.pathname.includes('/complete');
        
        // Check account status
        const status = await getConnectAccountStatus(user.uid);
        setAccountStatus(status);
        
        // If completed onboarding or account is active, redirect to dashboard with newSeller flag
        if (isComplete || (status.detailsSubmitted && status.payoutsEnabled)) {
          navigate('/seller/dashboard?newSeller=true');
          return;
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error checking account status:', err);
        setError(err.message || 'Failed to check account status. Please try again.');
        setLoading(false);
      }
    };
    
    checkUserAndStatus();
  }, [user, navigate, loading, location]);
  
  // Handle refreshing the onboarding link
  const handleRefreshLink = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        throw new Error('User information is missing');
      }
      
      // Get a new onboarding link
      const result = await refreshConnectAccountLink(user.uid);
      
      if (!result.url) {
        throw new Error('No Stripe URL returned');
      }
      
      // Open the Stripe URL in a new tab
      window.open(result.url, '_blank');
      setLoading(false);
      
    } catch (err) {
      console.error('Error refreshing onboarding link:', err);
      setError(err.message || 'Failed to refresh onboarding link. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-100 min-h-screen">
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-700"></div>
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-medium text-gray-800 mb-6">Complete Your Seller Onboarding</h1>
          
          {isRefresh && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md mb-6">
              Your Stripe session has expired. Please continue onboarding to complete your seller account setup.
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              {error}
            </div>
          )}
          
          <div className="space-y-6">
            <p className="text-gray-600">
              To start selling on Benchlot, we need to set up your payment processing. This allows
              you to receive payments securely when your tools sell.
            </p>
            
            {accountStatus && !accountStatus.detailsSubmitted && (
              <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg">
                <h2 className="text-lg font-medium text-gray-800 mb-4">Complete Stripe Onboarding</h2>
                <p className="mb-4">You'll need to complete the following steps:</p>
                <ul className="list-disc pl-5 mb-6 space-y-2">
                  <li>Verify your identity</li>
                  <li>Connect a bank account</li>
                  <li>Provide business information (if applicable)</li>
                </ul>
                <p className="mb-6">This information is securely handled by Stripe, our payment processor.</p>
                <button 
                  onClick={handleRefreshLink}
                  className="w-full py-3 bg-green-700 text-white rounded-md hover:bg-green-800 font-medium"
                >
                  Continue Onboarding
                </button>
              </div>
            )}
            
            {accountStatus && accountStatus.detailsSubmitted && !accountStatus.payoutsEnabled && (
              <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg">
                <h2 className="text-lg font-medium text-gray-800 mb-4">Onboarding in Progress</h2>
                <p className="mb-4">
                  Thanks for submitting your information! Stripe is currently reviewing your account.
                  This usually takes 1-2 business days.
                </p>
                <p className="mb-6">
                  We'll notify you when your account is ready to start accepting payments.
                </p>
                
                <button 
                  onClick={handleRefreshLink}
                  className="w-full py-3 bg-green-700 text-white rounded-md hover:bg-green-800 font-medium"
                >
                  Check Status Again
                </button>
              </div>
            )}
            
            {accountStatus && accountStatus.detailsSubmitted && accountStatus.payoutsEnabled && (
              <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
                <h2 className="text-lg font-medium text-green-800 mb-4">Onboarding Complete!</h2>
                <p className="mb-4">
                  Your account has been verified and is ready to receive payments.
                </p>
                <button 
                  onClick={() => navigate('/seller/dashboard')}
                  className="w-full py-3 bg-green-700 text-white rounded-md hover:bg-green-800 font-medium"
                >
                  Go to Seller Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SellerOnboardingPage;