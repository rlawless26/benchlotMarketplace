/**
 * Direct test script for Benchlot SendGrid email integration
 * 
 * This script tests the email service functions directly without needing the Firebase Functions emulator.
 */

// Import the email service module
const emailService = require('./emailService');

// Configuration
const testEmail = 'test@benchlot.com'; // Replace with your test email

// Helper function to log test results
const logResult = (testName, result) => {
  console.log(`\n📧 TEST: ${testName}`);
  if (result.success) {
    console.log('✅ PASS');
  } else {
    console.log('❌ FAIL');
    console.log('Error details:', result.error);
  }
};

// Test functions
const testWelcomeEmail = async () => {
  console.log('Testing welcome email...');
  const result = await emailService.sendAccountCreationEmail(testEmail, 'Test User');
  logResult('Welcome Email', result);
  return result;
};

const testPasswordResetEmail = async () => {
  console.log('Testing password reset email...');
  const result = await emailService.sendPasswordResetEmail(
    testEmail, 
    'https://benchlot.com/reset-password?token=sample-token'
  );
  logResult('Password Reset Email', result);
  return result;
};

const testListingPublishedEmail = async () => {
  console.log('Testing listing published email...');
  const result = await emailService.sendListingPublishedEmail(
    testEmail, 
    {
      id: 'test-listing-123',
      title: 'Milwaukee M18 Drill',
      name: 'Milwaukee M18 Drill',
      price: 99.99,
      current_price: 99.99,
      image: 'https://firebasestorage.googleapis.com/v0/b/benchlot.appspot.com/o/test-image.jpg'
    }
  );
  logResult('Listing Published Email', result);
  return result;
};

const testMessageReceivedEmail = async () => {
  console.log('Testing message received email...');
  const result = await emailService.sendMessageReceivedEmail(
    testEmail, 
    {
      senderName: 'John Buyer',
      messageText: 'Hi, I am interested in your drill. Is it still available?',
      senderId: 'user-123'
    }
  );
  logResult('Message Received Email', result);
  return result;
};

const testOfferReceivedEmail = async () => {
  console.log('Testing offer received email...');
  const result = await emailService.sendOfferReceivedEmail(
    testEmail, 
    {
      buyerName: 'Jane Buyer',
      listingTitle: 'Milwaukee M18 Drill',
      offerAmount: 75.00,
      listingPrice: 99.99,
      offerId: 'offer-123'
    }
  );
  logResult('Offer Received Email', result);
  return result;
};

const testSimpleTestEmail = async () => {
  console.log('Testing simple test email...');
  const result = await emailService.sendTestEmail(testEmail);
  logResult('Simple Test Email', result);
  return result;
};

// Run all tests
const runAllTests = async () => {
  console.log('🚀 Starting Benchlot SendGrid Email Direct Tests');
  console.log('==============================================');
  
  try {
    // Test SendGrid API key
    console.log('SendGrid API Key:', process.env.SENDGRID_API_KEY || 'Not set in environment');

    await testSimpleTestEmail();
    await testWelcomeEmail();
    await testPasswordResetEmail();
    await testListingPublishedEmail();
    await testMessageReceivedEmail();
    await testOfferReceivedEmail();
    
    console.log('\n==============================================');
    console.log('📋 All tests completed');
  } catch (error) {
    console.error('\n❌ Test runner error:', error);
  }
};

// Execute tests
runAllTests();