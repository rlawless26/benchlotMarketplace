/**
 * Test script for Benchlot SendGrid email HTTP endpoint
 * 
 * This script tests the dedicated email HTTP endpoint we've created
 */

const axios = require('axios');

// Configuration
const testEmail = process.argv[2] || 'test@benchlot.com'; // Use email from command line or default
const apiUrl = 'https://us-central1-benchlot-6d64e.cloudfunctions.net/sendEmailTestHttp'; // Use the actual URL from the deployment output

async function testEmailEndpoint() {
  console.log('🚀 Testing SendGrid Email HTTP Endpoint');
  console.log('========================================');
  console.log(`Target email: ${testEmail}`);
  console.log(`API URL: ${apiUrl}`);
  console.log('========================================\n');
  
  try {
    console.log(`Sending request to ${apiUrl}`);
    console.log('Request data:', { email: testEmail });
    
    const response = await axios.post(apiUrl, { email: testEmail });
    
    console.log('\n✅ SUCCESS!');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('\n❌ ERROR');
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testEmailEndpoint();