import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../firebase/hooks/useAuth';
import { getConnectAccountStatus, refreshConnectAccountLink } from '../utils/stripeService';
import { ENABLE_DIRECT_BANK_ACCOUNT, USE_CUSTOM_ACCOUNTS, openAuthModal } from '../utils/featureFlags';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

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
  const [userData, setUserData] = useState(null);
  
  // Check if this is a refresh from Stripe
  const isRefresh = new URLSearchParams(location.search).get('refresh') === 'true';

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Get current user and check their Stripe account status
  useEffect(() => {
    const checkUserAndStatus = async () => {
      try {
        // Check if still loading authentication state
        if (loading && !user) {
          return;
        }
        
        if (!user) {
          // Use auth modal instead of redirect to login page
          openAuthModal('signin', '/seller/onboarding' + location.search);
          return;
        }
        
        // Get user data from Firestore to check for needsBankDetails flag
        try {
          // Get user data from Firestore using Firebase v9 syntax
          const userRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userRef);
          if (userDocSnap.exists()) {
            const userDataFromFirestore = userDocSnap.data();
            setUserData(userDataFromFirestore);
            
            // Check if this user needs to add bank details
            if (ENABLE_DIRECT_BANK_ACCOUNT && userDataFromFirestore.needsBankDetails) {
              navigate(`/seller/bank-details?accountId=${userDataFromFirestore.stripeAccountId}`);
              return;
            }
          }
        } catch (userDataError) {
          console.error('Error fetching user data:', userDataError);
          // Continue with account status check even if user data fetch fails
        }
        
        // Check if this is a return from Stripe onboarding complete
        const isComplete = location.pathname.includes('/complete');
        
        // Check account status
        try {
          const status = await getConnectAccountStatus(user.uid);
          setAccountStatus(status);
          
          // If account is restricted and has pending requirements that match our known fixable ones
          // (first_name, last_name, business_profile.url), attempt to fix it automatically
          if (status && (status.status === 'restricted' || !status.detailsSubmitted) && status.requirements) {
            const needsFirstName = status.requirements.currently_due?.includes('individual.first_name');
            const needsLastName = status.requirements.currently_due?.includes('individual.last_name');
            const needsUrl = status.requirements.currently_due?.includes('business_profile.url');
            
            if (needsFirstName || needsLastName || needsUrl) {
              console.log('Detected fixable restrictions, attempting to update account:', {
                needsFirstName, needsLastName, needsUrl
              });
              
              try {
                const { updateConnectAccount } = await import('../utils/stripeService');
                
                // Get first/last name from the user data
                const firstName = user.firstName || (user.displayName ? user.displayName.split(' ')[0] : '');
                const lastName = user.lastName || (user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '');
                
                // Update the account with missing information
                const updateResult = await updateConnectAccount(user.uid, {
                  firstName,
                  lastName,
                  // We'll provide a dummy URL that points to the seller's profile on Benchlot
                  websiteUrl: `https://benchlot.com/sellers/${user.uid}`
                });
                
                console.log('Successfully updated Stripe account with missing information:', updateResult);
                
                // Get a fresh status
                const updatedStatus = await getConnectAccountStatus(user.uid);
                setAccountStatus(updatedStatus);
              } catch (updateError) {
                console.error('Error fixing restricted account:', updateError);
                // Continue with the flow, don't block on this error
              }
            }
          }
        } catch (statusError) {
          console.error('Error fetching account status:', statusError);
          
          // If we're coming back from the Stripe redirect and getting an error
          // It might mean we need to wait for the webhook to update the user data
          if (isComplete) {
            console.log('Coming back from Stripe redirect - handling potential timing issue');
            
            // Check if there's a pending tool listing to create
            const pendingToolListingJSON = localStorage.getItem('pendingToolListing');
            
            if (pendingToolListingJSON) {
              // There's a pending tool listing - redirect to create it
              navigate('/seller/create-pending-listing');
              return;
            } else {
              // No pending listing - redirect to dashboard 
              navigate('/seller/dashboard?newSeller=true');
              return;
            }
          }
          
          // If not from Stripe redirect, check for bank account redirect
          if (ENABLE_DIRECT_BANK_ACCOUNT && userData && userData.needsBankDetails) {
            // User needs to enter bank details directly
            console.log('User needs to enter bank details directly');
            navigate(`/seller/bank-details?accountId=${userData.stripeAccountId}`);
            return;
          }
          
          // Otherwise show the error
          setError(statusError.message || 'Failed to get account status');
          setLoading(false);
          return;
        }
        
        // Check if there's a pending tool listing to create
        const pendingToolListingJSON = localStorage.getItem('pendingToolListing');
        
        // If completed onboarding or account is active, update user document and redirect
        if (isComplete || 
            (accountStatus && accountStatus.detailsSubmitted && accountStatus.payoutsEnabled) ||
            // Also consider the account complete if it was restricted but we've addressed all requirements
            (accountStatus && accountStatus.status === 'restricted' && 
             (!accountStatus.requirements || 
              !accountStatus.requirements.currently_due || 
              accountStatus.requirements.currently_due.length === 0)
            )) {
          // Update the user document to explicitly mark them as a seller
          try {
            // Import necessary functions from firebase/firestore
            const { updateDoc } = await import('firebase/firestore');
            
            // Reference to the user document
            const userRef = doc(db, 'users', user.uid);
            
            // First check current user data to handle structure safely
            const userSnapshot = await getDoc(userRef);
            const userData = userSnapshot.data() || {};
            
            // Prepare update data with consistent structure
            const updateData = {
              // Keep top-level isSeller for backward compatibility
              isSeller: true,
              
              // Create a structured seller object
              seller: {
                isSeller: true,
                stripeStatus: 'active',
                verified: true,
                sellerSince: new Date().toISOString()
              }
            };
            
            // If we already have seller info, merge it rather than overwrite
            if (userData.seller) {
              updateData.seller = {
                ...userData.seller,
                ...updateData.seller
              };
            }
            
            // Update the document with the structured data
            await updateDoc(userRef, updateData);
            
            console.log('User document updated with seller status after onboarding completion');
          } catch (updateError) {
            console.error('Error updating user seller status:', updateError);
            // Continue with redirect even if update fails
          }
          
          if (pendingToolListingJSON) {
            // There's a pending tool listing - redirect to create it
            navigate('/seller/create-pending-listing');
          } else {
            // No pending listing - redirect to dashboard
            navigate('/seller/dashboard?newSeller=true');
          }
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
            
            {/* Default state when no account status is available or details not submitted */}
            {(!accountStatus || !accountStatus.detailsSubmitted) && (
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
                  {USE_CUSTOM_ACCOUNTS 
                    ? "Enter Payout Details"
                    : "Continue Onboarding"
                  }
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