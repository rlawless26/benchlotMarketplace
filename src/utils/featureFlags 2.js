/**
 * Feature Flags
 * Central place to manage feature flags for the application
 */

// Flag that enables the tool-first seller onboarding flow
export const ENABLE_TOOL_FIRST_FLOW = true;

// Default path for seller onboarding
export const SELLER_ENTRY_PATH = '/sell';

// Export all feature flags as an object for debugging
export const featureFlags = {
  ENABLE_TOOL_FIRST_FLOW,
  SELLER_ENTRY_PATH
};

export default featureFlags;