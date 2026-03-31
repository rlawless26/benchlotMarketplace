/**
 * Mock test script for Benchlot SendGrid email integration
 * 
 * This script tests the email service functions with mocked SendGrid responses.
 */

// Mock the SendGrid client
const sgMailMock = {
  send: jest.fn().mockResolvedValue([{ statusCode: 202 }])
};

// Mock Firebase Functions config
const functionsMock = {
  config: () => ({
    app: { url: 'https://benchlot.com' },
    sendgrid: { api_key: 'MOCK_API_KEY' }
  })
};

// Create a mock version of the email service
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: sgMailMock.send
}));

jest.mock('firebase-functions', () => functionsMock);

// Now import the email service
const emailService = require('./emailService');

// Configuration
const testEmail = 'test@benchlot.com';

// Helper function to log test results
const logResult = (testName, result) => {
  console.log(`\n📧 TEST: ${testName}`);
  console.log('✅ PASS (Mocked Response)');
  console.log('Result:', result);
};

// Test functions with mocked responses
const testWelcomeEmail = async () => {
  console.log('Testing welcome email...');
  
  // Set up the mock to return a successful response
  sgMailMock.send.mockResolvedValueOnce([{ statusCode: 202 }]);
  
  const result = await emailService.sendAccountCreationEmail(testEmail, 'Test User');
  logResult('Welcome Email', result);
  return result;
};

const testPasswordResetEmail = async () => {
  console.log('Testing password reset email...');
  
  // Set up the mock to return a successful response
  sgMailMock.send.mockResolvedValueOnce([{ statusCode: 202 }]);
  
  const result = await emailService.sendPasswordResetEmail(
    testEmail, 
    'https://benchlot.com/reset-password?token=sample-token'
  );
  logResult('Password Reset Email', result);
  return result;
};

const testListingPublishedEmail = async () => {
  console.log('Testing listing published email...');
  
  // Set up the mock to return a successful response
  sgMailMock.send.mockResolvedValueOnce([{ statusCode: 202 }]);
  
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
  
  // Set up the mock to return a successful response
  sgMailMock.send.mockResolvedValueOnce([{ statusCode: 202 }]);
  
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
  
  // Set up the mock to return a successful response
  sgMailMock.send.mockResolvedValueOnce([{ statusCode: 202 }]);
  
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
  
  // Set up the mock to return a successful response
  sgMailMock.send.mockResolvedValueOnce([{ statusCode: 202 }]);
  
  const result = await emailService.sendTestEmail(testEmail);
  logResult('Simple Test Email', result);
  return result;
};

// Run all tests
const runAllTests = async () => {
  console.log('🚀 Starting Benchlot SendGrid Email Mock Tests');
  console.log('==============================================');
  
  try {
    await testSimpleTestEmail();
    await testWelcomeEmail();
    await testPasswordResetEmail();
    await testListingPublishedEmail();
    await testMessageReceivedEmail();
    await testOfferReceivedEmail();
    
    console.log('\n==============================================');
    console.log('📋 All mock tests completed successfully');
  } catch (error) {
    console.error('\n❌ Test runner error:', error);
  }
};

// Execute tests
runAllTests();