/**
 * SendGrid Email Test Function for Benchlot
 * 
 * This is a minimal, dedicated function for testing SendGrid email integration
 * with Firebase Functions.
 */
const functions = require('firebase-functions');
const sgMail = require('@sendgrid/mail');

/**
 * Simple email test function
 * This function isolates the SendGrid integration for testing purposes
 */
exports.sendEmailTest = functions.https.onCall(async (data, context) => {
  // Step 1: Log environment details for debugging
  console.log("Function invoked with email:", data.email);
  console.log("Environment check - SENDGRID_API_KEY exists:", !!process.env.SENDGRID_API_KEY);
  console.log("Environment check - SENDGRID_API_KEY length:", process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.length : 0);
  
  try {
    // Use hard-coded API key for testing
    // IMPORTANT: Replace with the actual API key value we know works from our direct test
    const apiKey = process.env.SENDGRID_API_KEY || "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";
    
    if (!apiKey) {
      console.error("SendGrid API key not available");
      return { 
        success: false, 
        error: "API key not configured",
        errorType: "configuration"
      };
    }

    sgMail.setApiKey(apiKey);
    console.log("SendGrid initialized with API key");
    
    // Step 3: Send a simple email without templates
    const recipient = data.email || 'test@benchlot.com';
    
    const msg = {
      to: recipient,
      from: 'notifications@benchlot.com',
      subject: 'Benchlot Firebase Functions Test',
      text: 'This is a test email from Benchlot Firebase Functions',
      html: '<strong>This is a test email from Benchlot Firebase Functions</strong>'
    };
    
    console.log(`Attempting to send email to ${recipient}`);
    
    // Step 4: Send the email and handle the response
    const response = await sgMail.send(msg);
    console.log("Email sent successfully:", response[0].statusCode);
    
    return { 
      success: true,
      statusCode: response[0].statusCode,
      message: `Email sent successfully to ${recipient}`
    };
  } catch (error) {
    // Step 5: Detailed error logging
    console.error("Error sending email:", error.message);
    
    // Enhanced error logging
    if (error.response) {
      console.error("API Response Status:", error.response.statusCode);
      console.error("API Response Headers:", JSON.stringify(error.response.headers));
      console.error("API Response Body:", JSON.stringify(error.response.body));
    }
    
    // Return structured error for debugging
    return { 
      success: false, 
      errorMessage: error.message,
      errorType: error.code || "unknown",
      statusCode: error.response?.statusCode,
      responseBody: error.response?.body
    };
  }
});

/**
 * Callable HTTP endpoint for testing SendGrid without requiring Firebase SDK
 */
exports.sendEmailTestHttp = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    // Handle preflight requests
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
    return;
  }
  
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Extract email from request body
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Log environment details for debugging
    console.log("HTTP function invoked with email:", email);
    console.log("Environment check - SENDGRID_API_KEY exists:", !!process.env.SENDGRID_API_KEY);
    
    // Use hard-coded API key for testing
    const apiKey = process.env.SENDGRID_API_KEY || "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";
    
    if (!apiKey) {
      console.error("SendGrid API key not available");
      return res.status(500).json({
        error: "API key not configured",
        errorType: "configuration"
      });
    }
    
    sgMail.setApiKey(apiKey);
    
    // Send a simple email
    const msg = {
      to: email,
      from: 'notifications@benchlot.com',
      subject: 'Benchlot Firebase Functions Test (HTTP)',
      text: 'This is a test email from Benchlot Firebase Functions (HTTP endpoint)',
      html: '<strong>This is a test email from Benchlot Firebase Functions (HTTP endpoint)</strong>'
    };
    
    console.log(`Attempting to send email to ${email} via HTTP endpoint`);
    
    const response = await sgMail.send(msg);
    console.log("Email sent successfully via HTTP endpoint:", response[0].statusCode);
    
    return res.status(200).json({
      success: true,
      statusCode: response[0].statusCode,
      message: `Email sent successfully to ${email}`
    });
  } catch (error) {
    console.error("Error in HTTP email function:", error.message);
    
    if (error.response) {
      console.error("API Response Body:", JSON.stringify(error.response.body));
    }
    
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.body
    });
  }
});