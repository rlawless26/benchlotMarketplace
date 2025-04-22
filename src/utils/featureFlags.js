/**
 * Feature Flags
 * Central place to manage feature flags for the application
 * 
 * You can override these in localStorage during development:
 * localStorage.setItem('ENABLE_TOOL_FIRST_FLOW', 'false')
 * localStorage.setItem('ENABLE_DIRECT_BANK_ACCOUNT', 'false')
 * localStorage.setItem('USE_CUSTOM_ACCOUNTS', 'false')
 * 
 * This file also includes authentication utilities for showing the auth modal
 */

// Helper to check localStorage first, then fallback to default
const getFeatureFlag = (key, defaultValue) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const value = window.localStorage.getItem(key);
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return defaultValue;
};

// Flag that enables the tool-first seller onboarding flow
export const ENABLE_TOOL_FIRST_FLOW = getFeatureFlag('ENABLE_TOOL_FIRST_FLOW', true);

// Flag for direct bank account collection (bypassing Stripe onboarding)
export const ENABLE_DIRECT_BANK_ACCOUNT = getFeatureFlag('ENABLE_DIRECT_BANK_ACCOUNT', true);

// Flag to use Custom Stripe accounts for ALL sellers (less info required)
export const USE_CUSTOM_ACCOUNTS = getFeatureFlag('USE_CUSTOM_ACCOUNTS', true);

// Default path for seller onboarding
export const SELLER_ENTRY_PATH = '/sell';

// Export all feature flags as an object for debugging
export const featureFlags = {
  ENABLE_TOOL_FIRST_FLOW,
  ENABLE_DIRECT_BANK_ACCOUNT,
  USE_CUSTOM_ACCOUNTS,
  SELLER_ENTRY_PATH
};

// Auth modal event - create a custom event to trigger the auth modal
let authModalEventListeners = [];

/**
 * Opens the authentication modal
 * @param {string} mode - 'signin' or 'signup'
 * @param {string} redirectPath - Path to redirect after authentication
 */
export const openAuthModal = (mode = 'signin', redirectPath = null) => {
  if (redirectPath) {
    // Store the redirect path for after authentication
    sessionStorage.setItem('authRedirectPath', redirectPath);
  }
  
  // Dispatch to all listeners
  authModalEventListeners.forEach(listener => {
    listener({ mode, redirectPath });
  });
};

/**
 * Register a listener for auth modal events
 * @param {Function} listener - Function to call when modal should open
 * @returns {Function} - Function to remove the listener
 */
export const onAuthModalRequested = (listener) => {
  authModalEventListeners.push(listener);
  
  // Return a function to remove the listener
  return () => {
    authModalEventListeners = authModalEventListeners.filter(l => l !== listener);
  };
};

/**
 * Get the redirect path after authentication
 * @returns {string|null} - The path to redirect to, or null if none
 */
export const getAuthRedirectPath = () => {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    return sessionStorage.getItem('authRedirectPath');
  }
  return null;
};

/**
 * Clear the redirect path after using it
 */
export const clearAuthRedirectPath = () => {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    sessionStorage.removeItem('authRedirectPath');
  }
};

export default featureFlags;