/**
 * Setup script for Firebase Function secrets
 * 
 * This script helps set up secrets for Firebase Functions
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Ask for the SendGrid API key
const getApiKey = () => {
  return new Promise((resolve) => {
    rl.question('Enter your SendGrid API key (starting with SG.): ', (answer) => {
      resolve(answer);
    });
  });
};

// Set the API key as a Firebase secret
const setApiKey = (apiKey) => {
  try {
    console.log('Setting SendGrid API key as a Firebase secret...');
    execSync(`echo "${apiKey}" | firebase functions:secrets:set SENDGRID_API_KEY`, { stdio: 'inherit' });
    console.log('✅ SendGrid API key set successfully');
  } catch (error) {
    console.error('❌ Error setting SendGrid API key:', error.message);
  }
};

// Main function
const setup = async () => {
  console.log('🔐 Firebase Functions Secret Setup');
  console.log('=================================');
  
  try {
    const apiKey = await getApiKey();
    rl.close();
    
    if (!apiKey) {
      console.error('❌ API key cannot be empty');
      process.exit(1);
    }
    
    setApiKey(apiKey);
    
    console.log('\n🎉 Setup complete!');
    console.log('Next steps:');
    console.log('1. Deploy your functions: firebase deploy --only functions:sendEmailTest,functions:sendEmailTestHttp');
    console.log('2. Test the email function: node test-email-http.js your-email@example.com');
  } catch (error) {
    console.error('❌ Setup error:', error.message);
    process.exit(1);
  }
};

// Run the setup
setup();