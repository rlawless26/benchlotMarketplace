/**
 * Deploy script for Benchlot Firebase Functions
 * 
 * This script helps deploy Firebase Functions with environment variables set properly.
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Configuration to be updated
const config = {
  SENDGRID_API_KEY: '',
  STRIPE_SECRET: '',
  APP_URL: 'https://benchlot.com'
};

// Helper function to run shell commands
const runCommand = (command) => {
  try {
    console.log(`Running: ${command}`);
    return execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error);
    process.exit(1);
  }
};

// Get the SendGrid API key
const getSendGridApiKey = () => {
  return new Promise((resolve) => {
    rl.question('Enter your SendGrid API key (starting with SG.): ', (answer) => {
      config.SENDGRID_API_KEY = answer;
      resolve();
    });
  });
};

// Get the Stripe secret key
const getStripeSecret = () => {
  return new Promise((resolve) => {
    rl.question('Enter your Stripe secret key (starting with sk_): ', (answer) => {
      config.STRIPE_SECRET = answer;
      resolve();
    });
  });
};

// Get the app URL
const getAppUrl = () => {
  return new Promise((resolve) => {
    rl.question(`Enter your app URL (default: ${config.APP_URL}): `, (answer) => {
      if (answer) {
        config.APP_URL = answer;
      }
      resolve();
    });
  });
};

// Update the environment variables in the functions code
const updateEnvironmentVariables = () => {
  const filePath = './index.js';
  const fs = require('fs');
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Find and replace the environment variables section
    const envVarsRegex = /environmentVariables: {[^}]*}/g;
    const newEnvVars = `environmentVariables: {
      APP_URL: "${config.APP_URL}",
      SENDGRID_API_KEY: "${config.SENDGRID_API_KEY}",
      STRIPE_SECRET: "${config.STRIPE_SECRET}"
    }`;
    
    content = content.replace(envVarsRegex, newEnvVars);
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Updated environment variables in index.js');
  } catch (error) {
    console.error('Error updating environment variables:', error);
    process.exit(1);
  }
};

// Main function
const deploy = async () => {
  console.log('🚀 Benchlot Firebase Functions Deployment');
  console.log('=========================================');
  
  try {
    await getSendGridApiKey();
    await getStripeSecret();
    await getAppUrl();
    
    rl.close();
    
    console.log('\nConfiguring deployment with:');
    console.log(`- App URL: ${config.APP_URL}`);
    console.log(`- SendGrid API Key: ${config.SENDGRID_API_KEY.substring(0, 7)}...`);
    console.log(`- Stripe Secret: ${config.STRIPE_SECRET.substring(0, 7)}...`);
    
    // Update environment variables in the code
    updateEnvironmentVariables();
    
    // Deploy the functions
    console.log('\nDeploying Firebase Functions...');
    runCommand('firebase deploy --only functions');
    
    console.log('\n🎉 Deployment complete!');
  } catch (error) {
    console.error('❌ Deployment error:', error);
    process.exit(1);
  }
};

// Start the deployment process
deploy();