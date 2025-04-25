/**
 * SendGrid Email Service for Benchlot
 * Handles all transactional email notifications via SendGrid API
 * 
 * This service supports the following email types:
 * - Account creation (welcome emails)
 * - Password reset
 * - Listing publications
 * - Message notifications
 * - Offer notifications
 */
const sgMail = require('@sendgrid/mail');
const functions = require('firebase-functions');

// API key is set within each function call to ensure it's available
// This pattern works reliably with Firebase Functions

// Template IDs from SendGrid
const TEMPLATE_IDS = {
  OFFER_RECEIVED: 'd-daa56a7c83dd49cc9ad18f47db974f11',
  PASSWORD_RESET: 'd-7d448b96ded74ce0a278267611e7ac4c',
  ACCOUNT_CREATION: 'd-280057e931044ee2ac3cce7d54a216e3',
  LISTING_PUBLISHED: 'd-55c66b37ad7243c4a2a0ee6630b01922',
  MESSAGE_RECEIVED: 'd-0f5098870f9b45b695e9d63274c65e54',
  SELLER_ONBOARDING_COMPLETE: 'd-daa56a7c83dd49cc9ad18f47db974f11', // Reusing template ID until a specific one is created
  SELLER_PAYOUT_SENT: 'd-daa56a7c83dd49cc9ad18f47db974f11', // Reusing template ID until a specific one is created
  ORDER_RECEIVED: 'd-daa56a7c83dd49cc9ad18f47db974f11' // Reusing template ID until a specific one is created
};

// Export template IDs for reference
exports.TEMPLATE_IDS = TEMPLATE_IDS;

/**
 * Base email sender function
 * @param {string} to - Recipient email
 * @param {string} templateId - SendGrid template ID
 * @param {Object} dynamicTemplateData - Template data
 * @param {string} from - Sender email (default: notifications@benchlot.com)
 * @returns {Promise<Object>} - Success status and any error details
 */
// Helper function to get config with fallbacks
const getConfig = (key, envVarName, defaultValue) => {
  // Try environment variable
  if (process.env[envVarName]) {
    return process.env[envVarName];
  }
  
  // Fall back to default
  return defaultValue;
};

const sendEmail = async (to, templateId, dynamicTemplateData, from = 'notifications@benchlot.com') => {
  // Timestamp for logging
  console.log(`[${new Date().toISOString()}] Sending email to ${to} using template ${templateId}`);
  
  try {
    // Get SendGrid API key from config or environment
    const apiKey = getConfig('sendgrid.api_key', 'SENDGRID_API_KEY', null);
    
    if (!apiKey) {
      console.error('ERROR: SendGrid API key not found in Firebase config or environment variables');
      return { success: false, error: { message: 'API key not configured' } };
    }
    
    sgMail.setApiKey(apiKey);
    
    // Validate inputs
    if (!templateId) {
      console.error('ERROR: Template ID is missing');
      return { success: false, error: { message: 'Missing template ID' } };
    }
    
    if (!to || typeof to !== 'string' || !to.includes('@')) {
      console.error('ERROR: Invalid recipient email address:', to);
      return { success: false, error: { message: 'Invalid recipient email' } };
    }
    
    const msg = {
      to,
      from,
      templateId,
      dynamicTemplateData
    };
    
    // Log message details (without sensitive data)
    console.log('Sending email with:', {
      to: msg.to,
      from: msg.from,
      templateId: msg.templateId,
      dataKeys: Object.keys(msg.dynamicTemplateData)
    });
    
    // Send email
    const response = await sgMail.send(msg);
    
    // Log success details
    console.log(`✅ Email sent successfully to ${to}`);
    console.log('SendGrid response status:', response[0].statusCode);
    
    // Return success result
    return { 
      success: true,
      statusCode: response[0].statusCode 
    };
  } catch (error) {
    // Enhanced error logging
    console.error(`❌ SendGrid email error when sending to ${to}:`, error.toString());
    
    if (error.response) {
      console.error('SendGrid API response details:');
      console.error('- Status code:', error.response.statusCode);
      console.error('- Body:', JSON.stringify(error.response.body));
      console.error('- Headers:', JSON.stringify(error.response.headers));
    }
    
    // Check for common issues
    if (error.message && error.message.includes('unauthorized')) {
      console.error('AUTHORIZATION ERROR: SendGrid API key may be invalid');
    }
    
    if (error.message && error.message.includes('template')) {
      console.error(`TEMPLATE ERROR: Template ID ${templateId} may be invalid`);
    }
    
    // Return structured error
    return { 
      success: false, 
      error: {
        message: error.message,
        statusCode: error.response?.statusCode,
        details: error.response?.body
      } 
    };
  }
};

// Authentication Emails

/**
 * Send password reset email
 * @param {string} to - Recipient email
 * @param {string} resetLink - Password reset link
 * @returns {Promise<Object>} - Success status and any error details
 */
exports.sendPasswordResetEmail = (to, resetLink) => {
  return sendEmail(
    to, 
    TEMPLATE_IDS.PASSWORD_RESET, 
    { 
      reset_link: resetLink,
      username: to.split('@')[0]
    }
  );
};

/**
 * Send account creation (welcome) email
 * @param {string} to - Recipient email
 * @param {string} firstName - User's first name
 * @returns {Promise<Object>} - Success status and any error details
 */
exports.sendAccountCreationEmail = (to, firstName) => {
  return sendEmail(
    to, 
    TEMPLATE_IDS.ACCOUNT_CREATION, 
    { 
      first_name: firstName || to.split('@')[0],
      login_link: `${process.env.APP_URL || 'https://benchlot.com'}/login`
    }
  );
};

// Listing Emails

/**
 * Send notification when a listing is published
 * @param {string} to - Recipient email
 * @param {Object} listingDetails - Details of the published listing
 * @returns {Promise<Object>} - Success status and any error details
 */
exports.sendListingPublishedEmail = (to, listingDetails) => {
  console.log('Sending listing published email with details:', listingDetails);
  
  // Add fallback image if not provided
  const imageUrl = listingDetails.image || listingDetails.images?.[0]?.url || 'https://benchlot.com/images/placeholder-tool.jpg';
  
  // Create the listing URL
  const appUrl = getConfig('app.url', 'APP_URL', 'https://benchlot.com');
  const listingUrl = `${appUrl}/tools/${listingDetails.id}`;
  
  // Prepare listing price with proper formatting
  const price = typeof listingDetails.price === 'number' 
    ? listingDetails.price 
    : (listingDetails.current_price || 0);
  
  // Format the price with dollar sign
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(price);
  
  // Send the email with template data
  return sendEmail(
    to, 
    TEMPLATE_IDS.LISTING_PUBLISHED, 
    { 
      listing_title: listingDetails.name || listingDetails.title,
      listing_price: formattedPrice,
      listing_image: imageUrl,
      listing_url: listingUrl
    }
  );
};

// Messaging Emails

/**
 * Send notification when a user receives a message
 * @param {string} to - Recipient email
 * @param {Object} messageDetails - Details of the received message
 * @returns {Promise<Object>} - Success status and any error details
 */
exports.sendMessageReceivedEmail = (to, messageDetails) => {
  const appUrl = getConfig('app.url', 'APP_URL', 'https://benchlot.com');
  
  return sendEmail(
    to, 
    TEMPLATE_IDS.MESSAGE_RECEIVED, 
    { 
      sender_name: messageDetails.senderName,
      message_preview: messageDetails.messageText.substring(0, 100) + (messageDetails.messageText.length > 100 ? '...' : ''),
      message_url: `${appUrl}/messages?contact=${messageDetails.senderId}`
    }
  );
};

// Offer Emails

/**
 * Send notification when a seller receives an offer
 * @param {string} to - Recipient email
 * @param {Object} offerDetails - Details of the received offer
 * @returns {Promise<Object>} - Success status and any error details
 */
exports.sendOfferReceivedEmail = (to, offerDetails) => {
  // Calculate discount percentage if applicable
  let discountPercentage = 0;
  
  if (offerDetails.listingPrice && offerDetails.offerAmount) {
    discountPercentage = Math.round(((offerDetails.listingPrice - offerDetails.offerAmount) / offerDetails.listingPrice) * 100);
    discountPercentage = Math.max(0, discountPercentage); // Ensure non-negative
  }
  
  const appUrl = getConfig('app.url', 'APP_URL', 'https://benchlot.com');
  
  return sendEmail(
    to, 
    TEMPLATE_IDS.OFFER_RECEIVED, 
    { 
      buyer_name: offerDetails.buyerName,
      listing_title: offerDetails.listingTitle,
      offer_amount: offerDetails.offerAmount,
      listing_price: offerDetails.listingPrice,
      discount_percentage: discountPercentage.toString(),
      offer_url: `${appUrl}/seller/offers/${offerDetails.offerId}`
    }
  );
};

// Test function for verifying SendGrid setup
exports.sendTestEmail = (to) => {
  const appUrl = getConfig('app.url', 'APP_URL', 'https://benchlot.com');
  
  return sendEmail(
    to,
    TEMPLATE_IDS.ACCOUNT_CREATION,
    {
      first_name: 'Test User',
      login_link: `${appUrl}/login`
    }
  );
};

/**
 * Send notification when a seller completes onboarding
 * @param {string} to - Recipient email
 * @param {Object} sellerDetails - Details of the seller
 * @returns {Promise<Object>} - Success status and any error details
 */
exports.sendSellerOnboardingCompleteEmail = (to, sellerDetails) => {
  const appUrl = getConfig('app.url', 'APP_URL', 'https://benchlot.com');
  
  return sendEmail(
    to, 
    TEMPLATE_IDS.SELLER_ONBOARDING_COMPLETE, 
    { 
      seller_name: sellerDetails.sellerName || to.split('@')[0],
      dashboard_url: `${appUrl}/seller/dashboard`,
      create_listing_url: `${appUrl}/seller/new-listing`
    }
  );
};

/**
 * Send notification when a payout is sent to seller
 * @param {string} to - Recipient email
 * @param {Object} payoutDetails - Details of the payout
 * @returns {Promise<Object>} - Success status and any error details
 */
exports.sendPayoutNotificationEmail = (to, payoutDetails) => {
  const appUrl = getConfig('app.url', 'APP_URL', 'https://benchlot.com');
  
  // Format amounts
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(payoutDetails.amount);
  
  return sendEmail(
    to, 
    TEMPLATE_IDS.SELLER_PAYOUT_SENT, 
    { 
      payout_amount: formattedAmount,
      payout_date: new Date(payoutDetails.created * 1000).toLocaleDateString(),
      estimated_arrival: new Date(payoutDetails.arrival_date * 1000).toLocaleDateString(),
      dashboard_url: `${appUrl}/seller/earnings`
    }
  );
};

/**
 * Send notification when a seller receives a new order
 * @param {string} to - Recipient email
 * @param {Object} orderDetails - Details of the order
 * @returns {Promise<Object>} - Success status and any error details
 */
exports.sendOrderReceivedEmail = (to, orderDetails) => {
  const appUrl = getConfig('app.url', 'APP_URL', 'https://benchlot.com');
  
  // Format amounts
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(orderDetails.amount);
  
  return sendEmail(
    to, 
    TEMPLATE_IDS.ORDER_RECEIVED, 
    { 
      order_amount: formattedAmount,
      order_date: new Date().toLocaleDateString(),
      buyer_name: orderDetails.buyerName || 'A customer',
      order_url: `${appUrl}/seller/orders/${orderDetails.orderId}`,
      tool_name: orderDetails.toolName || 'Your item'
    }
  );
};

module.exports = {
  ...exports,
  sendEmail
};