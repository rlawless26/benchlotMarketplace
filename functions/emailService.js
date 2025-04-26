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

// Import Firestore for checking user preferences
const admin = require('firebase-admin');
const db = admin.firestore();

// Template IDs from SendGrid
const TEMPLATE_IDS = {
  // Existing templates
  OFFER_RECEIVED: 'd-daa56a7c83dd49cc9ad18f47db974f11',
  PASSWORD_RESET: 'd-7d448b96ded74ce0a278267611e7ac4c',
  ACCOUNT_CREATION: 'd-280057e931044ee2ac3cce7d54a216e3',
  LISTING_PUBLISHED: 'd-55c66b37ad7243c4a2a0ee6630b01922',
  MESSAGE_RECEIVED: 'd-0f5098870f9b45b695e9d63274c65e54',
  
  // Buyer Journey Emails
  ORDER_CONFIRMATION: 'd-1db44f064c0c4b97b38ed58f72c2b90d',
  PAYMENT_RECEIPT: 'd-5c62c9a55be64b10acf7d6fe711c3f16',
  SHIPPING_NOTIFICATION: 'd-514efcb2293949b096a72e495081d3e3',
  OFFER_STATUS_UPDATE: 'd-fc2d1755ce63459d91566804d1417f98',
  REVIEW_REQUEST: 'd-f7466852e0d44f349dd9ed876fdb979b',
  
  // Seller Journey Emails
  SELLER_ONBOARDING_COMPLETE: 'd-5097bd5934584fec81c54fae039571cc',
  LISTING_EXPIRATION_REMINDER: 'd-64485b1a25824cd0a58fb1ba2ab9ff74',
  ORDER_RECEIVED: 'd-fd656bc7ad2a4973bb93222e4be4ba90',
  SHIPPING_REMINDER: 'd-62eef3290eb448e3a1925b9c97b660d8',
  PAYOUT_NOTIFICATION: 'd-8e1cb39bd5114675bbc945e749cf26b6',
  MONTHLY_SALES_SUMMARY: 'd-44f0a6c1b4fa4ccc9b6d7b3d34184307'
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
// Note: Firebase Functions v2 no longer supports functions.config()
const getConfig = (key, envVarName, defaultValue) => {
  // Try environment variable
  if (process.env[envVarName]) {
    return process.env[envVarName];
  }
  
  // Fall back to default
  return defaultValue;
};

/**
 * Check if a user has opted in to receive a specific type of email notification
 * @param {string} userId - User ID to check
 * @param {string} notificationType - Type of notification (orders, messages, wishlist, newsletter)
 * @returns {Promise<boolean>} - Whether the user has opted in
 */
const shouldSendEmailNotification = async (userId, notificationType) => {
  try {
    // For critical emails like password reset, always return true
    if (notificationType === 'critical') {
      return true;
    }
    
    // Get user from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    
    // If user doesn't exist or has no preferences, use default values
    if (!userDoc.exists) {
      // Default preferences - generally opt-in for important notifications
      return ['orders', 'messages', 'wishlist'].includes(notificationType);
    }
    
    const userData = userDoc.data();
    const notificationPrefs = userData.preferences?.notifications?.email;
    
    // If no specific preferences, use default values
    if (!notificationPrefs) {
      return ['orders', 'messages', 'wishlist'].includes(notificationType);
    }
    
    // Check specific notification type
    return notificationPrefs[notificationType] === true;
  } catch (error) {
    console.error(`Error checking notification preferences for ${userId}:`, error);
    // Default to sending for essential notifications
    return ['orders', 'messages'].includes(notificationType);
  }
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
exports.sendListingPublishedEmail = async (to, listingDetails) => {
  console.log('Sending listing published email with details:', listingDetails);
  
  // Check if user has opted in to receive listing notifications (part of wishlist category)
  if (listingDetails.sellerId) {
    const shouldSend = await shouldSendEmailNotification(
      listingDetails.sellerId,
      'wishlist'
    );
    
    if (!shouldSend) {
      console.log(`User ${listingDetails.sellerId} has opted out of listing notifications`);
      return { success: false, optedOut: true };
    }
  }
  
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
exports.sendMessageReceivedEmail = async (to, messageDetails) => {
  // Check if user has opted in to receive message notifications
  if (messageDetails.userId) {
    const shouldSend = await shouldSendEmailNotification(
      messageDetails.userId, 
      'messages'
    );
    
    if (!shouldSend) {
      console.log(`User ${messageDetails.userId} has opted out of message notifications`);
      return { success: false, optedOut: true };
    }
  }
  
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
exports.sendOfferReceivedEmail = async (to, offerDetails) => {
  // Check if user has opted in to receive offer notifications (part of messages category)
  if (offerDetails.sellerId) {
    const shouldSend = await shouldSendEmailNotification(
      offerDetails.sellerId,
      'messages'
    );
    
    if (!shouldSend) {
      console.log(`User ${offerDetails.sellerId} has opted out of offer notifications`);
      return { success: false, optedOut: true };
    }
  }
  
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
      create_listing_url: `${appUrl}/seller/new-listing`,
      account_id: sellerDetails.stripeAccountId || '',
      setup_date: new Date().toLocaleDateString()
    }
  );
};

/**
 * Send notification when a listing is about to expire
 * @param {string} to - Recipient email
 * @param {Object} listingDetails - Details of the listing
 * @returns {Promise<Object>} - Success status and any error details
 */
exports.sendListingExpirationReminderEmail = async (to, listingDetails) => {
  // Check if user has opted in to receive listing notifications
  if (listingDetails.sellerId) {
    const shouldSend = await shouldSendEmailNotification(
      listingDetails.sellerId,
      'listings'
    );
    
    if (!shouldSend) {
      console.log(`User ${listingDetails.sellerId} has opted out of listing notifications`);
      return { success: false, optedOut: true };
    }
  }
  
  const appUrl = getConfig('app.url', 'APP_URL', 'https://benchlot.com');
  
  return sendEmail(
    to, 
    TEMPLATE_IDS.LISTING_EXPIRATION_REMINDER, 
    { 
      seller_name: listingDetails.sellerName || to.split('@')[0],
      item_name: listingDetails.itemName || 'Your listing',
      expiration_date: listingDetails.expirationDate || '3 days from now',
      item_price: listingDetails.price || '$0.00',
      item_image: listingDetails.itemImage || 'https://benchlot.com/images/placeholder-tool.jpg',
      listing_date: listingDetails.listingDate || 'recently',
      view_count: listingDetails.viewCount || 0,
      watch_count: listingDetails.watchCount || 0,
      has_stats: listingDetails.viewCount > 0 || listingDetails.watchCount > 0,
      offer_count: listingDetails.offerCount || 0,
      renew_url: `${appUrl}/seller/listings/${listingDetails.listingId}/renew`,
      edit_url: `${appUrl}/seller/listings/${listingDetails.listingId}/edit`
    }
  );
};

/**
 * Send notification when a seller receives a new order
 * @param {string} to - Recipient email
 * @param {Object} orderDetails - Details of the order
 * @returns {Promise<Object>} - Success status and any error details
 */
exports.sendOrderReceivedEmail = async (to, orderDetails) => {
  // Check if user has opted in to receive order notifications
  if (orderDetails.sellerId) {
    const shouldSend = await shouldSendEmailNotification(
      orderDetails.sellerId,
      'orders'
    );
    
    if (!shouldSend) {
      console.log(`User ${orderDetails.sellerId} has opted out of order notifications`);
      return { success: false, optedOut: true };
    }
  }
  
  const appUrl = getConfig('app.url', 'APP_URL', 'https://benchlot.com');
  
  // Format amounts
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(orderDetails.amount);
  
  // Prepare items for email template
  const itemsFormatted = orderDetails.items ? orderDetails.items.map(item => ({
    name: item.name || item.title || 'Item',
    price: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(item.price),
    quantity: item.quantity || 1,
    image_url: item.imageUrl || item.image || item.images?.[0]?.url || 'https://benchlot.com/images/placeholder-tool.jpg'
  })) : [];
  
  return sendEmail(
    to, 
    TEMPLATE_IDS.ORDER_RECEIVED, 
    { 
      order_amount: formattedAmount,
      order_date: new Date().toLocaleDateString(),
      buyer_name: orderDetails.buyerName || 'A customer',
      order_url: `${appUrl}/seller/orders/${orderDetails.orderId}`,
      item_name: orderDetails.toolName || itemsFormatted[0]?.name || 'Your item',
      items: itemsFormatted,
      items_count: itemsFormatted.length,
      shipping_address: formatAddress(orderDetails.shippingAddress || {}),
      ship_by_date: orderDetails.shipByDate || 'as soon as possible'
    }
  );
};

/**
 * Send shipping reminder email to seller
 * @param {string} to - Recipient email
 * @param {Object} reminderDetails - Details of the shipping reminder
 * @returns {Promise<Object>} - Success status and any error details
 */
exports.sendShippingReminderEmail = async (to, reminderDetails) => {
  // Check if user has opted in to receive order notifications
  if (reminderDetails.sellerId) {
    const shouldSend = await shouldSendEmailNotification(
      reminderDetails.sellerId,
      'orders'
    );
    
    if (!shouldSend) {
      console.log(`User ${reminderDetails.sellerId} has opted out of shipping reminders`);
      return { success: false, optedOut: true };
    }
  }
  
  const appUrl = getConfig('app.url', 'APP_URL', 'https://benchlot.com');
  
  return sendEmail(
    to, 
    TEMPLATE_IDS.SHIPPING_REMINDER, 
    { 
      seller_name: reminderDetails.sellerName || to.split('@')[0],
      order_number: reminderDetails.orderId,
      order_date: reminderDetails.orderDate || 'recently',
      days_since_order: reminderDetails.daysSinceOrder || 2,
      buyer_name: reminderDetails.buyerName || 'A customer',
      order_url: `${appUrl}/seller/orders/${reminderDetails.orderId}`,
      item_name: reminderDetails.itemName || 'The ordered item',
      shipping_cut_off: reminderDetails.shippingCutOff || '3 days', 
      policy_url: `${appUrl}/seller/policies`
    }
  );
};

/**
 * Send notification when a payout is sent to seller
 * @param {string} to - Recipient email
 * @param {Object} payoutDetails - Details of the payout
 * @returns {Promise<Object>} - Success status and any error details
 */
exports.sendPayoutNotificationEmail = async (to, payoutDetails) => {
  // Check if user has opted in to receive payment notifications
  if (payoutDetails.sellerId) {
    const shouldSend = await shouldSendEmailNotification(
      payoutDetails.sellerId,
      'payments'
    );
    
    if (!shouldSend) {
      console.log(`User ${payoutDetails.sellerId} has opted out of payout notifications`);
      return { success: false, optedOut: true };
    }
  }
  
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
    TEMPLATE_IDS.PAYOUT_NOTIFICATION, 
    { 
      seller_name: payoutDetails.sellerName || to.split('@')[0],
      payout_amount: formattedAmount,
      payout_date: new Date(payoutDetails.created * 1000).toLocaleDateString(),
      estimated_arrival: new Date(payoutDetails.arrival_date * 1000).toLocaleDateString(),
      dashboard_url: `${appUrl}/seller/earnings`,
      bank_last4: payoutDetails.bankLast4 || '****',
      order_count: payoutDetails.orderCount || 1,
      transaction_id: payoutDetails.transactionId || ''
    }
  );
};

/**
 * Send monthly sales summary email to seller
 * @param {string} to - Recipient email
 * @param {Object} summaryDetails - Details of the monthly sales summary
 * @returns {Promise<Object>} - Success status and any error details
 */
exports.sendMonthlySalesSummaryEmail = async (to, summaryDetails) => {
  // Check if user has opted in to receive summary notifications
  if (summaryDetails.sellerId) {
    const shouldSend = await shouldSendEmailNotification(
      summaryDetails.sellerId,
      'summaries'
    );
    
    if (!shouldSend) {
      console.log(`User ${summaryDetails.sellerId} has opted out of sales summary notifications`);
      return { success: false, optedOut: true };
    }
  }
  
  const appUrl = getConfig('app.url', 'APP_URL', 'https://benchlot.com');
  
  // Format amounts
  const formattedTotalSales = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(summaryDetails.totalSales);
  
  const formattedTotalFees = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(summaryDetails.totalFees);
  
  const formattedNetEarnings = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(summaryDetails.netEarnings);
  
  return sendEmail(
    to, 
    TEMPLATE_IDS.MONTHLY_SALES_SUMMARY, 
    { 
      seller_name: summaryDetails.sellerName || to.split('@')[0],
      month_name: summaryDetails.monthName || new Date().toLocaleString('default', { month: 'long' }),
      year: summaryDetails.year || new Date().getFullYear(),
      total_sales: formattedTotalSales,
      total_fees: formattedTotalFees,
      net_earnings: formattedNetEarnings,
      order_count: summaryDetails.orderCount || 0,
      views_count: summaryDetails.viewsCount || 0,
      top_performing_item: summaryDetails.topPerformingItem || 'None',
      dashboard_url: `${appUrl}/seller/dashboard`,
      analytics_url: `${appUrl}/seller/analytics`
    }
  );
};

/**
 * Send notification when a seller receives a new order
 * @param {string} to - Recipient email
 * @param {Object} orderDetails - Details of the order
 * @returns {Promise<Object>} - Success status and any error details
 */
exports.sendOrderReceivedEmail = async (to, orderDetails) => {
  // Check if user has opted in to receive order notifications
  if (orderDetails.sellerId) {
    const shouldSend = await shouldSendEmailNotification(
      orderDetails.sellerId,
      'orders'
    );
    
    if (!shouldSend) {
      console.log(`User ${orderDetails.sellerId} has opted out of order notifications`);
      return { success: false, optedOut: true };
    }
  }
  
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

/**
 * Send order confirmation email to buyer
 * @param {string} to - Recipient email
 * @param {Object} purchaseDetails - Details of the purchase
 * @returns {Promise<Object>} - Success status and any error details
 */
exports.sendOrderConfirmationEmail = async (to, purchaseDetails) => {
  // Check if user has opted in to receive order notifications
  if (purchaseDetails.userId && !purchaseDetails.isGuestOrder) {
    const shouldSend = await shouldSendEmailNotification(
      purchaseDetails.userId,
      'orders'
    );
    
    if (!shouldSend) {
      console.log(`User ${purchaseDetails.userId} has opted out of purchase notifications`);
      return { success: false, optedOut: true };
    }
  }
  
  const appUrl = getConfig('app.url', 'APP_URL', 'https://benchlot.com');
  
  // Format amounts
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(purchaseDetails.totalAmount);
  
  // Prepare items for email template
  const itemsFormatted = purchaseDetails.items.map(item => ({
    name: item.name || item.title || 'Item',
    price: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(item.price),
    quantity: item.quantity || 1,
    image_url: item.imageUrl || item.image || item.images?.[0]?.url || 'https://benchlot.com/images/placeholder-tool.jpg'
  }));
  
  return sendEmail(
    to, 
    TEMPLATE_IDS.ORDER_CONFIRMATION, 
    { 
      order_number: purchaseDetails.orderId,
      order_date: new Date().toLocaleDateString(),
      total_amount: formattedAmount,
      order_url: `${appUrl}/orders/${purchaseDetails.orderId}`,
      buyer_name: purchaseDetails.buyerName || to.split('@')[0],
      items: itemsFormatted,
      shipping_address: formatAddress(purchaseDetails.shippingAddress),
      billing_address: formatAddress(purchaseDetails.billingAddress || purchaseDetails.shippingAddress),
      payment_method: purchaseDetails.paymentMethod || 'Credit Card'
    }
  );
};

/**
 * Send payment receipt email to buyer
 * @param {string} to - Recipient email
 * @param {Object} paymentDetails - Details of the payment
 * @returns {Promise<Object>} - Success status and any error details
 */
exports.sendPaymentReceiptEmail = async (to, paymentDetails) => {
  // Check if user has opted in to receive order notifications
  if (paymentDetails.userId && !paymentDetails.isGuestOrder) {
    const shouldSend = await shouldSendEmailNotification(
      paymentDetails.userId,
      'orders'
    );
    
    if (!shouldSend) {
      console.log(`User ${paymentDetails.userId} has opted out of payment notifications`);
      return { success: false, optedOut: true };
    }
  }
  
  const appUrl = getConfig('app.url', 'APP_URL', 'https://benchlot.com');
  
  // Format amounts
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(paymentDetails.totalAmount);
  
  return sendEmail(
    to, 
    TEMPLATE_IDS.PAYMENT_RECEIPT, 
    { 
      order_number: paymentDetails.orderId,
      payment_date: new Date().toLocaleDateString(),
      payment_amount: formattedAmount,
      order_url: `${appUrl}/orders/${paymentDetails.orderId}`,
      buyer_name: paymentDetails.buyerName || to.split('@')[0],
      payment_method: paymentDetails.paymentMethod || 'Credit Card',
      last4: paymentDetails.last4 || '****',
      transaction_id: paymentDetails.transactionId || paymentDetails.paymentIntentId || '',
      receipt_url: paymentDetails.receiptUrl || ''
    }
  );
};

/**
 * Send shipping notification email to buyer
 * @param {string} to - Recipient email
 * @param {Object} shippingDetails - Details of the shipping
 * @returns {Promise<Object>} - Success status and any error details
 */
exports.sendShippingNotificationEmail = async (to, shippingDetails) => {
  // Check if user has opted in to receive order notifications
  if (shippingDetails.userId && !shippingDetails.isGuestOrder) {
    const shouldSend = await shouldSendEmailNotification(
      shippingDetails.userId,
      'orders'
    );
    
    if (!shouldSend) {
      console.log(`User ${shippingDetails.userId} has opted out of shipping notifications`);
      return { success: false, optedOut: true };
    }
  }
  
  const appUrl = getConfig('app.url', 'APP_URL', 'https://benchlot.com');
  
  return sendEmail(
    to, 
    TEMPLATE_IDS.SHIPPING_NOTIFICATION, 
    { 
      order_number: shippingDetails.orderId,
      buyer_name: shippingDetails.buyerName || to.split('@')[0],
      order_url: `${appUrl}/orders/${shippingDetails.orderId}`,
      shipping_date: new Date().toLocaleDateString(),
      carrier: shippingDetails.carrier || 'Shipping Carrier',
      tracking_number: shippingDetails.trackingNumber || 'N/A',
      tracking_url: shippingDetails.trackingUrl || '',
      estimated_delivery: shippingDetails.estimatedDelivery || 'Not available',
      shipping_address: formatAddress(shippingDetails.shippingAddress),
      item_name: shippingDetails.items?.[0]?.name || 'Your order',
      items_count: shippingDetails.items?.length > 1 ? 
        `and ${shippingDetails.items.length - 1} other item${shippingDetails.items.length > 2 ? 's' : ''}` : ''
    }
  );
};

/**
 * Send offer status update email to buyer
 * @param {string} to - Recipient email
 * @param {Object} offerDetails - Details of the offer
 * @returns {Promise<Object>} - Success status and any error details
 */
exports.sendOfferStatusUpdateEmail = async (to, offerDetails) => {
  // Check if user has opted in to receive offer notifications
  if (offerDetails.buyerId) {
    const shouldSend = await shouldSendEmailNotification(
      offerDetails.buyerId,
      'messages'
    );
    
    if (!shouldSend) {
      console.log(`User ${offerDetails.buyerId} has opted out of offer notifications`);
      return { success: false, optedOut: true };
    }
  }
  
  const appUrl = getConfig('app.url', 'APP_URL', 'https://benchlot.com');
  
  // Format amounts
  const formattedOfferAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(offerDetails.offerAmount);
  
  const formattedListingPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(offerDetails.listingPrice);
  
  return sendEmail(
    to, 
    TEMPLATE_IDS.OFFER_STATUS_UPDATE, 
    { 
      buyer_name: offerDetails.buyerName || to.split('@')[0],
      seller_name: offerDetails.sellerName || 'The seller',
      item_name: offerDetails.listingTitle || 'this item',
      offer_amount: formattedOfferAmount,
      listing_price: formattedListingPrice,
      status: offerDetails.status || 'updated',
      message: offerDetails.message || '',
      has_message: Boolean(offerDetails.message),
      offers_url: `${appUrl}/offers`,
      listing_url: `${appUrl}/tools/${offerDetails.listingId}`,
      item_image: offerDetails.listingImage || 'https://benchlot.com/images/placeholder-tool.jpg'
    }
  );
};

/**
 * Send review request email to buyer
 * @param {string} to - Recipient email
 * @param {Object} reviewDetails - Details for the review request
 * @returns {Promise<Object>} - Success status and any error details
 */
exports.sendReviewRequestEmail = async (to, reviewDetails) => {
  // Check if user has opted in to receive review request notifications
  if (reviewDetails.userId && !reviewDetails.isGuestOrder) {
    const shouldSend = await shouldSendEmailNotification(
      reviewDetails.userId,
      'reviews'
    );
    
    if (!shouldSend) {
      console.log(`User ${reviewDetails.userId} has opted out of review request notifications`);
      return { success: false, optedOut: true };
    }
  }
  
  const appUrl = getConfig('app.url', 'APP_URL', 'https://benchlot.com');
  
  return sendEmail(
    to, 
    TEMPLATE_IDS.REVIEW_REQUEST, 
    { 
      buyer_name: reviewDetails.buyerName || to.split('@')[0],
      order_number: reviewDetails.orderId,
      item_name: reviewDetails.itemName || 'your purchase',
      item_image: reviewDetails.itemImage || 'https://benchlot.com/images/placeholder-tool.jpg',
      delivery_date: reviewDetails.deliveryDate || 'recently',
      order_url: `${appUrl}/orders/${reviewDetails.orderId}`,
      review_url: `${appUrl}/orders/${reviewDetails.orderId}/review`,
      review_days_left: reviewDetails.reviewDaysLeft || 14
    }
  );
};

/**
 * Helper function to format address for email templates
 * @param {Object} address - Address object
 * @returns {string} - Formatted address string
 */
function formatAddress(address) {
  if (!address) return 'No address provided';
  
  const parts = [
    address.name,
    address.line1,
    address.line2,
    `${address.city}, ${address.state} ${address.postal_code}`,
    address.country
  ].filter(Boolean); // Remove empty/undefined values
  
  return parts.join('<br>');
}

module.exports = {
  ...exports,
  sendEmail
};