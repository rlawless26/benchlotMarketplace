/**
 * Direct test for SendGrid API
 * This script tests the SendGrid API directly without going through Firebase Functions
 */

// Import the SendGrid mail client
const sgMail = require('@sendgrid/mail');

// Set your SendGrid API key directly
// IMPORTANT: Replace with your actual SendGrid API key
const SENDGRID_API_KEY = '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';
sgMail.setApiKey(SENDGRID_API_KEY);

// Get the test email from command line args or use default
const testEmail = process.argv[2] || 'test@example.com';

// Create a simple test message
const msg = {
  to: testEmail,
  from: 'notifications@benchlot.com', // Replace with your verified sender
  subject: 'SendGrid Direct Test',
  text: 'This is a direct test of the SendGrid API',
  html: '<strong>This is a direct test of the SendGrid API</strong>',
};

console.log(`Sending direct test email to ${testEmail}...`);

// Send the email
sgMail
  .send(msg)
  .then(() => {
    console.log('✅ Email sent successfully');
  })
  .catch((error) => {
    console.error('❌ Error sending email:');
    console.error(error);
    
    // Check for specific SendGrid errors
    if (error.response) {
      console.error('SendGrid API response:');
      console.error(error.response.body);
    }
  });