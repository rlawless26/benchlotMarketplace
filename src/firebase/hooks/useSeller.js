import { useState, useEffect, useContext, createContext } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config';
import { useAuth } from './useAuth';

// API URL for Firebase Functions
const API_URL = process.env.REACT_APP_FIREBASE_API_URL || 'https://stripeapi-sed2e4p6ua-uc.a.run.app';

// Create context for seller functionality
const SellerContext = createContext();

// Provider component
export function SellerProvider({ children }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sellerStatus, setSellerStatus] = useState(null);
  
  // Fetch seller status on mount or when user changes
  useEffect(() => {
    console.log('SellerProvider - User state changed:', { 
      hasUser: !!user, 
      isAuthenticated: !!user,
      isSeller: user?.profile?.isSeller
    });
    
    if (user && user.profile && user.profile.isSeller) {
      console.log('SellerProvider - User is a seller, fetching status');
      getSellerStatus();
    } else {
      console.log('SellerProvider - User is not a seller or no user, clearing status');
      setSellerStatus(null);
    }
  }, [user]);

  // Create a Stripe Connect account for the user
  const createSellerAccount = async (sellerData = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!user) {
        throw new Error('You must be logged in to become a seller');
      }
      
      // Create a connected account with Stripe
      const response = await fetch(`${API_URL}/create-connected-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
          sellerName: sellerData.sellerName || user.profile?.displayName || user.email.split('@')[0],
          sellerType: sellerData.sellerType || 'individual',
          location: sellerData.location || '',
          contactEmail: sellerData.contactEmail || user.email,
          contactPhone: sellerData.contactPhone || '',
          sellerBio: sellerData.sellerBio || ''
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create seller account');
      }
      
      const data = await response.json();
      
      // Return the URL for the Stripe onboarding flow
      return { 
        success: true, 
        url: data.url,
        accountId: data.accountId,
        exists: data.exists
      };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get the status of a seller's Stripe Connect account
  const getSellerStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!user) {
        throw new Error('You must be logged in to check seller status');
      }
      
      // Get account status from the server
      const response = await fetch(`${API_URL}/get-account-status?userId=${encodeURIComponent(user.uid)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        // If the user is not a seller, this is not an error
        if (errorData.error === 'User is not a seller') {
          setSellerStatus(null);
          return { success: true, isSeller: false };
        }
        throw new Error(errorData.error || 'Failed to get seller status');
      }
      
      const status = await response.json();
      setSellerStatus(status);
      
      return { success: true, status };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };
  
  // Refresh the onboarding link for a seller
  const refreshOnboardingLink = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!user) {
        throw new Error('You must be logged in to refresh onboarding');
      }
      
      // Get a new onboarding link
      const response = await fetch(`${API_URL}/refresh-account-link?userId=${encodeURIComponent(user.uid)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refresh onboarding link');
      }
      
      const data = await response.json();
      
      return { success: true, url: data.url };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get a link to the Stripe dashboard
  const getDashboardLink = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!user) {
        throw new Error('You must be logged in to access the dashboard');
      }
      
      // Get a dashboard link
      const response = await fetch(`${API_URL}/get-dashboard-link?userId=${encodeURIComponent(user.uid)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get dashboard link');
      }
      
      const data = await response.json();
      
      return { success: true, url: data.url };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check if the current user is a seller
  const isSeller = () => {
    const result = !!(user?.profile?.isSeller || user?.isSeller);
    console.log('isSeller check:', { result, user: !!user });
    return result;
  };
  
  // Check if the seller has completed onboarding
  const isOnboardingComplete = () => {
    const result = !!(sellerStatus?.detailsSubmitted && sellerStatus?.payoutsEnabled);
    console.log('isOnboardingComplete check:', { result, sellerStatus: !!sellerStatus });
    return result;
  };
  
  // Context value
  const value = {
    isSeller: user?.profile?.isSeller || user?.isSeller || false,
    isOnboardingComplete: !!(sellerStatus?.detailsSubmitted && sellerStatus?.payoutsEnabled),
    sellerStatus,
    isLoading,
    error,
    createSellerAccount,
    getSellerStatus,
    refreshOnboardingLink,
    getDashboardLink
  };
  
  return <SellerContext.Provider value={value}>{children}</SellerContext.Provider>;
}

// Hook for using seller context
export const useSeller = () => {
  const context = useContext(SellerContext);
  if (!context) {
    throw new Error('useSeller must be used within a SellerProvider');
  }
  return context;
};

export default useSeller;