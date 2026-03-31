/**
 * Configuration setup script for Benchlot Firebase Functions
 * 
 * This script helps set up the necessary configuration values for the Firebase Functions.
 * Run this script before deploying or testing the functions locally.
 */

const { execSync } = require('child_process');

// Placeholder values (replace these with your actual values)
const config = {
  app: {
    url: 'https://benchlot.com' // Your production app URL
  },
  sendgrid: {
    api_key: 'SG.REPLACE_WITH_YOUR_ACTUAL_SENDGRID_API_KEY', // Replace with your actual SendGrid API key
  },
  stripe: {
    secret: 'sk_test_51REPLACE_WITH_YOUR_ACTUAL_STRIPE_KEY', // Replace with your actual Stripe secret key
    webhook_secret: 'whsec_REPLACE_WITH_YOUR_WEBHOOK_SECRET' // Replace with your actual webhook secret
  }
};

// Main function to set up configuration
const setupConfig = () => {
  console.log('🔧 Setting up Firebase Functions configuration...');
  
  try {
    // Set app configuration
    execSync(`firebase functions:config:set app.url="${config.app.url}"`, { stdio: 'inherit' });
    console.log('✅ App URL configured');
    
    // Set SendGrid configuration
    execSync(`firebase functions:config:set sendgrid.api_key="${config.sendgrid.api_key}"`, { stdio: 'inherit' });
    console.log('✅ SendGrid API key configured');
    
    // Set Stripe configuration
    execSync(`firebase functions:config:set stripe.secret="${config.stripe.secret}"`, { stdio: 'inherit' });
    execSync(`firebase functions:config:set stripe.webhook_secret="${config.stripe.webhook_secret}"`, { stdio: 'inherit' });
    console.log('✅ Stripe keys configured');
    
    console.log('\n🎉 Configuration complete! You can now deploy your functions or run them locally.');
    console.log('To run functions locally with this config, use:');
    console.log('firebase functions:config:get > .runtimeconfig.json && firebase emulators:start');
  } catch (error) {
    console.error('❌ Error setting configuration:', error.message);
    process.exit(1);
  }
};

// Execute the setup
setupConfig();