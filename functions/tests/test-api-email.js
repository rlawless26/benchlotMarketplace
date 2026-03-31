/**
 * Test script for Benchlot SendGrid Email Integration
 * 
 * This script tests the API endpoints for sending emails through SendGrid.
 * Usage:
 *   node tests/test-api-email.js [email-address] [test-type]
 * 
 * Examples:
 *   node tests/test-api-email.js your@email.com          # Runs all tests
 *   node tests/test-api-email.js your@email.com test     # Runs test email only
 *   node tests/test-api-email.js your@email.com reset    # Runs password reset email only
 */

const axios = require('axios');

// Configuration
const testEmail = process.argv[2] || 'test@benchlot.com'; // Use email from command line or default
const apiUrl = 'https://api-sed2e4p6ua-uc.a.run.app'; // The URL from deployment

// Helper function to log test results
const logResult = (testName, success, details = null) => {
  console.log(`\n📧 TEST: ${testName}`);
  if (success) {
    console.log('✅ PASS');
  } else {
    console.log('❌ FAIL');
    if (details) {
      console.error('Error details:', details);
    }
  }
};

// Helper function to make API requests
const callEndpoint = async (endpoint, data) => {
  try {
    console.log(`Calling endpoint: ${apiUrl}/${endpoint}`);
    console.log('With data:', JSON.stringify(data, null, 2));
    
    const response = await axios.post(`${apiUrl}/${endpoint}`, data);
    console.log('Response:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('API error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      return { success: false, error: error.response.data };
    }
    return { success: false, error: { message: error.message } };
  }
};

// Test for password reset email
const testPasswordReset = async () => {
  const result = await callEndpoint('send-password-reset', {
    email: testEmail,
    resetLink: 'https://benchlot.com/reset-password?token=test-token-123'
  });
  logResult('Password Reset Email', result.success, result.error);
  return result;
};

// Test for test email
const testSimpleTestEmail = async () => {
  const result = await callEndpoint('send-test-email', {
    email: testEmail
  });
  logResult('Simple Test Email', result.success, result.error);
  return result;
};

// Additional test types can be added here
const testTypes = {
  'test': testSimpleTestEmail,
  'reset': testPasswordReset,
  // Add more test types as needed
};

// Run the tests
const runTests = async () => {
  // Get specific test type if provided
  const specificTest = process.argv[3];
  
  console.log('🚀 Testing Benchlot Email API');
  console.log('============================');
  console.log(`Using email: ${testEmail}`);
  console.log(`API URL: ${apiUrl}`);
  if (specificTest) {
    console.log(`Running specific test: ${specificTest}`);
  } else {
    console.log('Running all tests');
  }
  console.log('============================\n');
  
  try {
    if (specificTest && testTypes[specificTest]) {
      // Run just the specified test
      await testTypes[specificTest]();
    } else if (specificTest) {
      console.error(`Unknown test type: ${specificTest}`);
      console.log('Available tests: ' + Object.keys(testTypes).join(', '));
    } else {
      // Run all tests
      await testSimpleTestEmail();
      await testPasswordReset();
    }
    
    console.log('\n============================');
    console.log('📋 Tests completed');
  } catch (error) {
    console.error('\n❌ Test runner error:', error);
  }
};

// Execute tests
runTests();