// Client-side email service that forwards requests to Firebase Functions
// This handles all email-related functionality for the Benchlot frontend

// Base API URL - default to production but can be overridden by environment variable
const API_URL = process.env.REACT_APP_API_URL || 'https://api-sed2e4p6ua-uc.a.run.app';

// Generic request helper function
const sendRequest = async (endpoint, data) => {
  try {
    console.log(`Sending email request to ${endpoint}:`, data);
    
    const response = await fetch(`${API_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error(`Email error (${endpoint}):`, result);
      throw new Error(result.error?.message || 'Failed to send email');
    }
    
    console.log(`Email sent successfully via ${endpoint}`);
    return { success: true, data: result };
  } catch (error) {
    console.error(`Error in ${endpoint}:`, error);
    return { success: false, error };
  }
};

// Authentication Emails

/**
 * Sends a verification email to a user
 * @param {string} to - The email address to send to
 * @param {string} verificationLink - The verification link
 * @returns {Promise<Object>} - Success status and any error details
 */
export const sendVerificationEmail = (to, verificationLink) => {
  return sendRequest('send-password-reset', { 
    email: to, 
    resetLink: verificationLink 
  });
};

/**
 * Sends a password reset email to a user
 * @param {string} to - The email address to send to
 * @param {string} resetLink - The password reset link
 * @returns {Promise<Object>} - Success status and any error details
 */
export const sendPasswordResetEmail = (to, resetLink) => {
  return sendRequest('send-password-reset', { 
    email: to, 
    resetLink 
  });
};

/**
 * Sends a welcome email to a new user
 * @param {string} to - The email address to send to
 * @param {string} firstName - The user's first name
 * @returns {Promise<Object>} - Success status and any error details
 */
export const sendAccountCreationEmail = (to, firstName) => {
  return sendRequest('send-welcome-email', { 
    email: to, 
    firstName: firstName || to.split('@')[0]
  });
};

// Listing Emails

/**
 * Sends a notification email when a listing is published
 * @param {string} to - The email address to send to
 * @param {Object} listingDetails - Details of the published listing
 * @returns {Promise<Object>} - Success status and any error details
 */
export const sendListingPublishedEmail = (to, listingDetails) => {
  return sendRequest('send-listing-published', {
    email: to,
    listingDetails: {
      id: listingDetails.id,
      title: listingDetails.title || listingDetails.name,
      name: listingDetails.name || listingDetails.title,
      price: listingDetails.price || listingDetails.current_price,
      image: listingDetails.image || (listingDetails.images && listingDetails.images.length > 0 
        ? listingDetails.images[0].url : null)
    }
  });
};

/**
 * Sends a notification email when a user receives a message
 * @param {string} to - The email address to send to
 * @param {Object} messageDetails - Details of the message
 * @returns {Promise<Object>} - Success status and any error details
 */
export const sendMessageReceivedEmail = (to, messageDetails) => {
  return sendRequest('send-message-notification', {
    email: to,
    messageDetails: {
      senderName: messageDetails.senderName,
      messageText: messageDetails.messageText,
      senderId: messageDetails.senderId
    }
  });
};

/**
 * Sends a notification email when a seller receives an offer
 * @param {string} to - The email address to send to
 * @param {Object} offerDetails - Details of the offer
 * @returns {Promise<Object>} - Success status and any error details
 */
export const sendOfferReceivedEmail = (to, offerDetails) => {
  return sendRequest('send-offer-notification', {
    email: to,
    offerDetails: {
      buyerName: offerDetails.buyerName,
      listingTitle: offerDetails.listingTitle,
      offerAmount: offerDetails.offerAmount,
      listingPrice: offerDetails.listingPrice,
      offerId: offerDetails.offerId
    }
  });
};

/**
 * Sends a test email (for testing only)
 * @param {string} to - The email address to send to
 * @returns {Promise<Object>} - Success status and any error details
 */
export const sendTestEmail = (to) => {
  return sendRequest('send-test-email', { email: to });
};

/**
 * Sends a notification when seller onboarding is complete
 * @param {string} to - The email address to send to
 * @param {Object} sellerDetails - Details of the seller
 * @returns {Promise<Object>} - Success status and any error details
 */
export const sendSellerOnboardingCompleteEmail = (to, sellerDetails) => {
  return sendRequest('send-seller-onboarding-complete', {
    email: to,
    sellerDetails: {
      sellerName: sellerDetails.sellerName || to.split('@')[0]
    }
  });
};

/**
 * Sends a notification when a payout is sent to the seller
 * @param {string} to - The email address to send to
 * @param {Object} payoutDetails - Details of the payout
 * @returns {Promise<Object>} - Success status and any error details
 */
export const sendPayoutNotificationEmail = (to, payoutDetails) => {
  return sendRequest('send-payout-notification', {
    email: to,
    payoutDetails: {
      amount: payoutDetails.amount,
      created: payoutDetails.created,
      arrival_date: payoutDetails.arrival_date
    }
  });
};

/**
 * Sends a notification when a seller receives a new order
 * @param {string} to - The email address to send to
 * @param {Object} orderDetails - Details of the order
 * @returns {Promise<Object>} - Success status and any error details
 */
export const sendOrderReceivedEmail = (to, orderDetails) => {
  return sendRequest('send-order-notification', {
    email: to,
    orderDetails: {
      amount: orderDetails.amount,
      buyerName: orderDetails.buyerName,
      orderId: orderDetails.orderId,
      toolName: orderDetails.toolName
    }
  });
};

// Default export for backward compatibility
export default {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAccountCreationEmail,
  sendListingPublishedEmail,
  sendMessageReceivedEmail,
  sendOfferReceivedEmail,
  sendTestEmail,
  sendSellerOnboardingCompleteEmail,
  sendPayoutNotificationEmail,
  sendOrderReceivedEmail
};