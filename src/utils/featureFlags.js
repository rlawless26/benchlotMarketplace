/**
 * Feature Flags
 * Central place to manage feature flags for the application
 *
 * You can override these in localStorage during development:
 * localStorage.setItem('ENABLE_TOOL_FIRST_FLOW', 'false')
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

// Marketplace beta — when false, public visitors only see ToolScan, waitlist, and info pages.
// When true, the full marketplace is visible to everyone. This is the launch switch.
export const MARKETPLACE_BETA = getFeatureFlag('MARKETPLACE_BETA', true);

// Aggregator mode — when true, the public surface is the tool-discovery aggregator.
// All marketplace routes redirect unauthenticated visitors; signed-in users still
// reach marketplace code for dev/testing. localStorage override:
// localStorage.setItem('AGGREGATOR_MODE', 'false') restores the pre-pivot view.
export const AGGREGATOR_MODE = getFeatureFlag('AGGREGATOR_MODE', true);

// Price-guide — when true, render PriceContextChip on result cards, the
// /guide/:type/:brand/:size? routes, and the "Benchlot index" line in
// ToolScan results. When false (current default), all that UI stays
// hidden so we can accrue real organic sold-comp data via the nightly
// pipelines before exposing the surface publicly.
//
// Server-side data pipelines (markExpired flips to sold, priceSnapshots
// writes, jimbode_valueguide ingestion, nightly pricestats build) run
// regardless of this flag — the flag only gates user-facing rendering.
//
// Local dev override: `localStorage.setItem('PRICE_GUIDE_ENABLED', 'true')`.
// Public launch: change the default below from `false` to `true`, ship.
export const PRICE_GUIDE_ENABLED = getFeatureFlag('PRICE_GUIDE_ENABLED', false);

// Plane-pages — when true, render canonical plane type pages at
// /planes/:brand/:model and /planes/:brand/:model/:type. These consume the
// model-fine and type-fine priceStats grains shipped on 2026-05-06. The
// /guide/... legacy URLs continue to work; this flag only gates the new
// /planes/... surface.
//
// Local dev override: `localStorage.setItem('PLANE_PAGES_ENABLED', 'true')`.
// Public launch: flip the default to true after spot-check passes.
export const PLANE_PAGES_ENABLED = getFeatureFlag('PLANE_PAGES_ENABLED', false);

// Tool check (`/check`) — when true, render the unified check page that
// accepts either a pasted listing URL or an uploaded photo and returns a
// price verdict + comparable sales + cheaper alternatives. Internal name
// is "check" / "deal-check" — the user-facing surface is just Benchlot.
//
// Local dev override: `localStorage.setItem('TOOL_CHECK_ENABLED', 'true')`.
export const TOOL_CHECK_ENABLED = getFeatureFlag('TOOL_CHECK_ENABLED', false);

// Default path for seller onboarding
export const SELLER_ENTRY_PATH = '/sell';

// Export all feature flags as an object for debugging
export const featureFlags = {
  ENABLE_TOOL_FIRST_FLOW,
  SELLER_ENTRY_PATH,
  MARKETPLACE_BETA,
  AGGREGATOR_MODE,
  PRICE_GUIDE_ENABLED,
  PLANE_PAGES_ENABLED,
  TOOL_CHECK_ENABLED,
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