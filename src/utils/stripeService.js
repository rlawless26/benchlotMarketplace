/**
 * Stripe Service
 * Handles communication with the Stripe API endpoints
 */

// Import environment utilities
import { getConfig } from './environment';

// API URL for Firebase Functions - environment specific
const API_URL = process.env.REACT_APP_FIREBASE_API_URL || getConfig(
  // Dev - use localhost if running emulator, otherwise use production
  'http://localhost:5001/benchlot/us-central1/api',
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
 * Get seller's Stripe balance (available + pending)
 * @param {string} userId User ID
 * @returns {Promise<object>} Balance data with available and pending amounts
 */
export const getSellerBalance = async (userId) => {
  try {
    const response = await fetch(`${API_URL}/get-seller-balance?userId=${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get seller balance');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting seller balance:', error);
    throw error;
  }
};

/**
 * Get transfer history for a seller
 * @param {string} userId User ID
 * @param {number} limit Number of transfers to return
 * @param {string} startingAfter Pagination cursor
 * @returns {Promise<object>} Transfers data
 */
export const getSellerTransfers = async (userId, limit = 25, startingAfter = null) => {
  try {
    let url = `${API_URL}/get-seller-transfers?userId=${encodeURIComponent(userId)}&limit=${limit}`;
    if (startingAfter) {
      url += `&startingAfter=${encodeURIComponent(startingAfter)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get seller transfers');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting seller transfers:', error);
    throw error;
  }
};

/**
 * Get orders for a seller
 * @param {string} userId User ID
 * @param {string} status Optional status filter
 * @param {number} limit Number of orders to return
 * @returns {Promise<object>} Orders data with aggregate stats
 */
export const getSellerOrders = async (userId, status = null, limit = 50) => {
  try {
    let url = `${API_URL}/get-seller-orders?userId=${encodeURIComponent(userId)}&limit=${limit}`;
    if (status) {
      url += `&status=${encodeURIComponent(status)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get seller orders');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting seller orders:', error);
    throw error;
  }
};

/**
 * Create a refund for an order
 * @param {string} orderId Order ID
 * @param {string} reason Refund reason
 * @param {number} amount Optional partial refund amount (full refund if omitted)
 * @param {string} userId ID of user initiating the refund
 * @returns {Promise<object>} Refund result
 */
export const createRefund = async (orderId, reason, amount = null, userId = null) => {
  try {
    const body = { orderId, reason };
    if (amount) body.amount = amount;
    if (userId) body.userId = userId;

    const response = await fetch(`${API_URL}/create-refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create refund');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating refund:', error);
    throw error;
  }
};

/**
 * Get payouts history for a Connect account
 * @param {string} userId User ID
 * @returns {Promise<object>} Payouts data
 */
export const getPayouts = async (userId) => {
  // Payouts are tracked via webhooks in the payouts collection
  // This function serves as a client-side convenience wrapper
  return getSellerTransfers(userId);
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

const stripeService = {
  createConnectAccount,
  getConnectAccountStatus,
  refreshConnectAccountLink,
  getConnectDashboardLink,
  getSellerBalance,
  getSellerTransfers,
  getSellerOrders,
  createRefund,
  getPayouts,
  addBankAccount,
  updateConnectAccount
};

export default stripeService;