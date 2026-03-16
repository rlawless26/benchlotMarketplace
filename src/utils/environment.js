/**
 * Environment utility for Rekerf
 * Provides environment detection and configuration helpers
 */

// Get the current environment
export const getEnvironment = () => {
  // First check the explicit environment setting
  const explicitEnv = process.env.REACT_APP_ENVIRONMENT;
  if (explicitEnv) {
    return explicitEnv;
  }
  
  // If not set explicitly, determine based on URL
  const hostname = window.location.hostname;
  
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return 'development';
  }
  
  // Check for staging environment explicitly
  if (hostname.includes('staging.rekerf.com')) {
    return 'staging';
  }
  
  // Check for Vercel preview deployments
  if (hostname.includes('vercel.app') && !hostname.includes('rekerf-marketplace.vercel.app')) {
    return 'staging';
  }
  
  // Production domains - explicitly check for exact match on rekerf.com
  if (hostname === 'rekerf.com' || hostname === 'www.rekerf.com' || hostname === 'rekerf-marketplace.vercel.app') {
    return 'production';
  }
  
  // Default to development for safety
  return 'development';
};

// Check if we're in a specific environment
export const isProduction = () => getEnvironment() === 'production';
export const isStaging = () => getEnvironment() === 'staging';
export const isDevelopment = () => getEnvironment() === 'development';

// Get environment-specific configuration
export const getConfig = (development, staging, production) => {
  const env = getEnvironment();
  
  switch (env) {
    case 'production':
      return production;
    case 'staging':
      return staging;
    case 'development':
    default:
      return development;
  }
};

// Export default object for easy importing
const environment = {
  getEnvironment,
  isProduction,
  isStaging,
  isDevelopment,
  getConfig
};

export default environment;