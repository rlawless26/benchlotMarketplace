import { useState, useEffect, useContext, createContext } from 'react';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
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
    // Check for seller status in multiple possible locations
    const userIsSeller = user?.isSeller === true || 
                         user?.seller?.isSeller === true || 
                         (user?.seller?.hasBankAccount === true && user?.seller?.verified === true);
    
    if (user && userIsSeller) {
      getSellerStatus();
      
      // If seller object is missing but isSeller is true at top level, update the document
      if (user.isSeller === true && !user.seller?.isSeller) {
        try {
          const userRef = doc(db, 'users', user.uid);
          updateDoc(userRef, {
            'seller': {
              isSeller: true,
              stripeStatus: user.stripeStatus || 'active',
              verified: user.verified || true,
              sellerSince: user.sellerSince || new Date().toISOString()
            }
          }).catch(err => {
            console.error('SellerProvider - Error updating seller object structure:', err);
          });
        } catch (err) {
          console.error('SellerProvider - Error preparing to update seller object structure:', err);
        }
      }
    } else {
      setSellerStatus(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Create a Stripe Connect account for the user
  const createSellerAccount = async (sellerData = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!user) {
        throw new Error('You must be logged in to become a seller');
      }
      
      // First, ensure the user document exists in Firestore
      // This prevents the "No document to update" error
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Create a basic user document with the provided seller data
        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || sellerData.sellerName || user.email.split('@')[0],
          createdAt: new Date().toISOString(),
          // Add seller-specific fields that will be updated by the API
          sellerName: sellerData.sellerName || user.displayName || user.email.split('@')[0],
          sellerType: sellerData.sellerType || 'individual',
          contactEmail: sellerData.contactEmail || user.email,
          contactPhone: sellerData.contactPhone || '',
          sellerBio: sellerData.sellerBio || '',
          // Allow caller to explicitly set seller status flags, otherwise start as false
          isSeller: sellerData.isSeller === true || false,
          // Set role explicitly to satisfy security rules
          role: 'seller',
          // Create the profile object with seller status
          profile: {
            fullName: sellerData.sellerName || user.displayName || '',
            location: sellerData.location || '',
            // Add first and last name fields to profile
            firstName: sellerData.firstName || user.displayName?.split(' ')[0] || '',
            lastName: sellerData.lastName || (user.displayName?.split(' ').slice(1).join(' ')) || '',
            // Include seller status in profile for newer code
            isSeller: sellerData['profile.isSeller'] === true || sellerData.isSeller === true || false
          },
          // Create the seller object with the new structure
          seller: {
            isSeller: sellerData.isSeller === true || false,
            sellerType: sellerData.sellerType || 'individual',
            sellerSince: new Date().toISOString()
          }
        };
        
        // Create the user document
        await setDoc(userRef, userData);
      } else {
        // Update existing user document with seller data
        await updateDoc(userRef, {
          sellerName: sellerData.sellerName || user.displayName || user.email.split('@')[0],
          sellerType: sellerData.sellerType || 'individual',
          location: sellerData.location || '',
          contactEmail: sellerData.contactEmail || user.email,
          contactPhone: sellerData.contactPhone || '',
          sellerBio: sellerData.sellerBio || '',
          // Set seller status flags if provided
          ...(sellerData.isSeller === true ? { isSeller: true } : {}),
          // Update profile fields
          ...(sellerData.firstName || sellerData.lastName ? {
            'profile.firstName': sellerData.firstName || user.displayName?.split(' ')[0] || '',
            'profile.lastName': sellerData.lastName || (user.displayName?.split(' ').slice(1).join(' ')) || '',
          } : {}),
          // Update profile.isSeller if provided
          ...(sellerData['profile.isSeller'] === true || sellerData.isSeller === true ? 
              { 'profile.isSeller': true } : {}),
          // Update the role to seller
          role: 'seller',
          // Create or update the seller object with the new structure
          seller: {
            isSeller: true,
            sellerType: sellerData.sellerType || 'individual',
            sellerSince: new Date().toISOString()
          }
        });
      }
      
      const requestData = {
        userId: user.uid,
        email: user.email,
        sellerName: sellerData.sellerName || user.profile?.displayName || user.email.split('@')[0],
        sellerType: sellerData.sellerType || 'individual',
        location: sellerData.location || '',
        contactEmail: sellerData.contactEmail || user.email,
        contactPhone: sellerData.contactPhone || '',
        sellerBio: sellerData.sellerBio || ''
      };
      
      // Create a connected account with Stripe
      const response = await fetch(`${API_URL}/create-connected-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create seller account');
      }
      
      const data = await response.json();

      // Extract the URL from the response
      const redirectUrl = data.url;
      
      // Return the URL for the Stripe onboarding flow
      return { 
        success: true, 
        url: redirectUrl,
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
  
  // Context value
  const value = {
    isSeller: !!(
      user?.seller?.isSeller === true || 
      user?.isSeller === true || 
      user?.seller?.stripeStatus === 'active' ||
      (user?.seller?.hasBankAccount === true && user?.seller?.verified === true)
    ),
    isOnboardingComplete: !!(
      (sellerStatus?.detailsSubmitted && sellerStatus?.payoutsEnabled) ||
      (user?.seller?.hasBankAccount === true && user?.seller?.verified === true) ||
      user?.seller?.stripeStatus === 'active'
    ),
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