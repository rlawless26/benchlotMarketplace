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

/**
 * Add a bank account to a Custom Connect account for individual sellers
 * This is used when sellers skip Stripe hosted onboarding
 * @param {string} userId User ID
 * @param {object} bankData Bank account details
 * @returns {Promise<object>} Response with bank account information
 */
export const addBankAccount = async (userId, bankData) => {
  try {
    const response = await fetch(`${API_URL}/add-bank-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        accountNumber: bankData.accountNumber,
        routingNumber: bankData.routingNumber,
        accountHolderName: bankData.accountHolderName,
        accountHolderType: 'individual', // Default for individual sellers
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to add bank account');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding bank account:', error);
    throw error;
  }
};

/**
 * Update Stripe Connect account with required information
 * @param {string} userId User ID
 * @param {object} accountData Account details including personal information
 * @returns {Promise<object>} Response with updated account information
 */
export const updateConnectAccount = async (userId, accountData) => {
  try {
    const response = await fetch(`${API_URL}/update-connect-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        firstName: accountData.firstName,
        lastName: accountData.lastName,
        websiteUrl: accountData.websiteUrl
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update account information');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating Connect account:', error);
    throw error;
  }
};

export default {
  createConnectAccount,
  getConnectAccountStatus,
  refreshConnectAccountLink,
  getConnectDashboardLink,
  getPayouts,
  addBankAccount,
  updateConnectAccount
};