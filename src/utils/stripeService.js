/**
 * Stripe Service
 * Handles communication with the Stripe API endpoints
 */

// Import environment utilities
import { getEnvironment, getConfig } from './environment';

// API URL for Firebase Functions - environment specific
const API_URL = process.env.REACT_APP_FIREBASE_API_URL || getConfig(
  // Dev - use localhost if running emulator, otherwise use production
  'http://localhost:5001/benchlot-6d64e/us-central1/api',
  // Staging
  'https://stripeapi-sed2e4p6ua-uc.a.run.app',
  // Production
  'https://stripeapi-sed2e4p6ua-uc.a.run.app'
);

/**
 * Create a new Stripe Connect account for a seller
 * @param {object} userData User data including userId and email
 * @param {object} sellerData Seller profile information
 * @returns {Promise<object>} Response with URL for onboarding
 */
export const createConnectAccount = async (userData, sellerData = {}) => {
  try {
    const response = await fetch(`${API_URL}/create-connected-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userData.uid,
        email: userData.email,
        ...sellerData
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create Connect account');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating Connect account:', error);
    throw error;
  }
};

/**
 * Get the status of a Stripe Connect account
 * @param {string} userId User ID
 * @returns {Promise<object>} Account status
 */
export const getConnectAccountStatus = async (userId) => {
  try {
    const response = await fetch(`${API_URL}/get-account-status?userId=${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get account status');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting Connect account status:', error);
    throw error;
  }
};

/**
 * Get a fresh onboarding link for a Connect account
 * @param {string} userId User ID
 * @returns {Promise<object>} Fresh onboarding URL
 */
export const refreshConnectAccountLink = async (userId) => {
  try {
    const response = await fetch(`${API_URL}/refresh-account-link?userId=${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to refresh account link');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error refreshing Connect account link:', error);
    throw error;
  }
};

/**
 * Get a link to the Stripe dashboard for a Connect account
 * @param {string} userId User ID
 * @returns {Promise<object>} Dashboard URL
 */
export const getConnectDashboardLink = async (userId) => {
  try {
    const response = await fetch(`${API_URL}/get-dashboard-link?userId=${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get dashboard link');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting Connect dashboard link:', error);
    throw error;
  }
};

/**
 * Get payouts history for a Connect account
 * This will need to be implemented on the server side
 * @param {string} userId User ID
 * @returns {Promise<object>} Payouts data
 */
export const getPayouts = async (userId) => {
  // This would need to be implemented in the future
  return Promise.resolve({ payouts: [] });
};

export default {
  createConnectAccount,
  getConnectAccountStatus,
  refreshConnectAccountLink,
  getConnectDashboardLink,
  getPayouts
};