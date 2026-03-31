/**
 * Test script for Benchlot SendGrid email integration
 * 
 * This script tests all the email endpoints implemented in the Firebase Functions.
 * It makes direct HTTP requests to the deployed Firebase Functions endpoints.
 */

const axios = require('axios');

// Configuration
const testEmail = process.argv[2] || 'test@benchlot.com'; // Use email from command line or default
const apiUrl = 'https://api-sed2e4p6ua-uc.a.run.app'; // Deployed Firebase Function URL

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

// Test functions
const testWelcomeEmail = async () => {
  const result = await callEndpoint('send-welcome-email', {
    email: testEmail,
    firstName: 'Test User'
  });
  logResult('Welcome Email', result.success, result.error);
  return result;
};

const testPasswordResetEmail = async () => {
  const result = await callEndpoint('send-password-reset', {
    email: testEmail,
    resetLink: 'https://benchlot.com/reset-password?token=sample-token'
  });
  logResult('Password Reset Email', result.success, result.error);
  return result;
};

const testListingPublishedEmail = async () => {
  const result = await callEndpoint('send-listing-published', {
    email: testEmail,
    listingDetails: {
      id: 'test-listing-123',
      title: 'Milwaukee M18 Drill',
      price: 99.99,
      image: 'https://firebasestorage.googleapis.com/v0/b/benchlot.appspot.com/o/test-image.jpg'
    }
  });
  logResult('Listing Published Email', result.success, result.error);
  return result;
};

const testMessageNotificationEmail = async () => {
  const result = await callEndpoint('send-message-notification', {
    email: testEmail,
    messageDetails: {
      senderName: 'John Buyer',
      messageText: 'Hi, I am interested in your drill. Is it still available?',
      senderId: 'user-123'
    }
  });
  logResult('Message Notification Email', result.success, result.error);
  return result;
};

const testOfferNotificationEmail = async () => {
  const result = await callEndpoint('send-offer-notification', {
    email: testEmail,
    offerDetails: {
      buyerName: 'Jane Buyer',
      listingTitle: 'Milwaukee M18 Drill',
      offerAmount: 75.00,
      listingPrice: 99.99,
      offerId: 'offer-123'
    }
  });
  logResult('Offer Notification Email', result.success, result.error);
  return result;
};

const testSimpleTestEmail = async () => {
  const result = await callEndpoint('send-test-email', {
    email: testEmail
  });
  logResult('Simple Test Email', result.success, result.error);
  return result;
};

// Run all tests
const runAllTests = async () => {
  console.log('🚀 Starting Benchlot SendGrid Email Tests');
  console.log('=========================================');
  console.log(`Using email: ${testEmail}`);
  console.log(`API URL: ${apiUrl}`);
  console.log('=========================================\n');
  
  try {
    await testSimpleTestEmail();
    await testWelcomeEmail();
    await testPasswordResetEmail();
    await testListingPublishedEmail();
    await testMessageNotificationEmail();
    await testOfferNotificationEmail();
    
    console.log('\n=========================================');
    console.log('📋 All tests completed');
  } catch (error) {
    console.error('\n❌ Test runner error:', error);
  }
};

// Run a single test
const runSingleTest = async (testName) => {
  console.log(`🚀 Running test: ${testName}`);
  console.log('=========================================');
  console.log(`Using email: ${testEmail}`);
  console.log(`API URL: ${apiUrl}`);
  console.log('=========================================\n');
  
  try {
    switch (testName) {
      case 'welcome':
        await testWelcomeEmail();
        break;
      case 'password-reset':
        await testPasswordResetEmail();
        break;
      case 'listing':
        await testListingPublishedEmail();
        break;
      case 'message':
        await testMessageNotificationEmail();
        break;
      case 'offer':
        await testOfferNotificationEmail();
        break;
      case 'test':
      default:
        await testSimpleTestEmail();
        break;
    }
    
    console.log('\n=========================================');
    console.log(`📋 Test "${testName}" completed`);
  } catch (error) {
    console.error('\n❌ Test runner error:', error);
  }
};

// Execute tests
const testType = process.argv[3];
if (testType) {
  runSingleTest(testType);
} else {
  runAllTests();
}