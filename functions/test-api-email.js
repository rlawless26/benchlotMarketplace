/**
 * Test script for Benchlot Email API
 * 
 * This script tests the updated API endpoints for sending email
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

// Run the tests
const runTests = async () => {
  console.log('🚀 Testing Benchlot Email API');
  console.log('============================');
  console.log(`Using email: ${testEmail}`);
  console.log(`API URL: ${apiUrl}`);
  console.log('============================\n');
  
  try {
    // Run the test email endpoint first - simplest test
    await testSimpleTestEmail();
    
    // Then try a specific email type
    await testPasswordReset();
    
    console.log('\n============================');
    console.log('📋 All tests completed');
  } catch (error) {
    console.error('\n❌ Test runner error:', error);
  }
};

// Execute tests
runTests();