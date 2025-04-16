/**
 * Firebase Functions for Benchlot
 * Handles Stripe integration, payment processing, and email notifications
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors')({ origin: true });
const emailService = require('./emailService');

// Initialize Firebase Admin with explicit service account credentials
try {
  const serviceAccount = require('./service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('Initialized Firebase Admin with explicit service account credentials');
} catch (error) {
  console.error('Error initializing with service account, falling back to default:', error);
  // Fall back to default credentials
  admin.initializeApp();
  console.log('Initialized Firebase Admin with default credentials');
}

const db = admin.firestore();

// Initialize Stripe with error handling
let stripe;
try {
  const stripeSecret = process.env.STRIPE_SECRET;
  if (!stripeSecret) {
    console.error('Stripe secret key not found in environment variables. Falling back to a placeholder for testing only.');
    stripe = require('stripe')('sk_test_51R42hePJSOllkrGgAhjsqqLDv8tYbuW6dcrKfOMjfv2QfnhWC5KZ1EZpf4bKITGpeLdozy6yN6B7tvB51YfgKZz90015yqqPnS');
  } else {
    stripe = require('stripe')(stripeSecret);
  }
} catch (error) {
  console.error('Error initializing Stripe:', error);
  stripe = require('stripe')('sk_test_51R42hePJSOllkrGgAhjsqqLDv8tYbuW6dcrKfOMjfv2QfnhWC5KZ1EZpf4bKITGpeLdozy6yN6B7tvB51YfgKZz90015yqqPnS');
}

// Express app for API endpoints
const app = express();
app.use(cors);
app.use(express.json());

/**
 * Create a payment intent
 * This is the first step in the payment process
 * For marketplace purchases, this also includes application fee calculations
 */
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { cartId, userId } = req.body;
    
    if (!cartId || !userId) {
      return res.status(400).json({ error: 'Missing cartId or userId' });
    }
    
    console.log(`Attempting to get cart ${cartId} for user ${userId}`);
    
    let cart;
    try {
      // Get the cart from Firestore
      const cartRef = db.collection('carts').doc(cartId);
      console.log('Cart reference created:', cartRef.path);
      
      const cartDoc = await cartRef.get();
      console.log('Cart document fetch attempt completed');
      
      if (!cartDoc.exists) {
        console.log(`Cart ${cartId} not found`);
        return res.status(404).json({ error: 'Cart not found' });
      }
      
      console.log(`Cart ${cartId} found successfully`);
      cart = cartDoc.data();
      console.log('Cart data:', JSON.stringify(cart, null, 2));
    } catch (firestoreError) {
      console.error('Detailed Firestore error:', firestoreError);
      console.error('Error code:', firestoreError.code);
      console.error('Error message:', firestoreError.message);
      if (firestoreError.details) {
        console.error('Error details:', firestoreError.details);
      }
      throw firestoreError; // Re-throw to be caught by the outer catch block
    }
    
    // Verify the cart belongs to the user
    if (cart.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Calculate the total amount
    const amount = cart.totalAmount;
    
    // Check if this is a marketplace purchase (multiple sellers)
    if (cart.items && cart.items.length > 0) {
      // Group items by seller
      const sellerItems = {};
      let hasSeller = false;
      
      for (const item of cart.items) {
        if (item.sellerId) {
          hasSeller = true;
          if (!sellerItems[item.sellerId]) {
            sellerItems[item.sellerId] = [];
          }
          sellerItems[item.sellerId].push(item);
        }
      }
      
      // If there are seller items, process as marketplace purchase
      if (hasSeller) {
        console.log('Processing as marketplace purchase');
        
        // For each seller, verify their account is active
        for (const sellerId in sellerItems) {
          const sellerDoc = await db.collection('users').doc(sellerId).get();
          
          if (!sellerDoc.exists) {
            return res.status(400).json({ 
              error: 'One or more sellers are no longer active',
              details: 'A seller in your cart is no longer available. Please remove their items and try again.'
            });
          }
          
          const seller = sellerDoc.data();
          
          if (!seller.stripeAccountId) {
            return res.status(400).json({ 
              error: 'One or more sellers are not fully onboarded',
              details: 'A seller in your cart is not fully onboarded with Stripe. Please remove their items and try again.'
            });
          }
          
          // Optional: verify seller account is in good standing
          // This would require an API call to Stripe for each seller
        }
        
        // Create a payment intent with application fee
        // The fee will be applied during the webhook processing
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Stripe expects amounts in cents
          currency: 'usd',
          metadata: {
            cartId,
            userId,
            isMarketplace: 'true',
            itemCount: cart.items.length.toString(),
            sellerCount: Object.keys(sellerItems).length.toString(),
            platformFeePercent: '5' // 5% platform fee
          }
        });
        
        // Return the client secret to the client
        res.json({ 
          clientSecret: paymentIntent.client_secret,
          isMarketplace: true
        });
        return;
      }
    }
    
    // If not a marketplace purchase, create a standard payment intent
    console.log('Processing as standard purchase');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects amounts in cents
      currency: 'usd',
      metadata: {
        cartId,
        userId
      }
    });
    
    // Return the client secret to the client
    res.json({ 
      clientSecret: paymentIntent.client_secret,
      isMarketplace: false
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Confirm a payment was successful
 * Updates order status in Firestore
 */
app.post('/confirm-payment', async (req, res) => {
  try {
    const { paymentIntentId, cartId } = req.body;
    
    if (!paymentIntentId || !cartId) {
      return res.status(400).json({ error: 'Missing paymentIntentId or cartId' });
    }
    
    // Verify the payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment has not succeeded' });
    }
    
    console.log(`Confirming payment for intent ${paymentIntentId}, cart ${cartId}`);
    
    // Get the cart from Firestore
    let cart;
    try {
      console.log(`Attempting to get cart ${cartId}`);
      const cartRef = db.collection('carts').doc(cartId);
      console.log('Cart reference created:', cartRef.path);
      
      const cartDoc = await cartRef.get();
      console.log('Cart document fetch completed');
      
      if (!cartDoc.exists) {
        console.log(`Cart ${cartId} not found`);
        return res.status(404).json({ error: 'Cart not found for payment confirmation' });
      }
      
      console.log(`Cart ${cartId} found successfully`);
      cart = cartDoc.data();
      console.log('Cart data:', JSON.stringify(cart, null, 2));
    } catch (firestoreError) {
      console.error('Detailed Firestore error:', firestoreError);
      console.error('Error code:', firestoreError.code);
      console.error('Error message:', firestoreError.message);
      if (firestoreError.details) {
        console.error('Error details:', firestoreError.details);
      }
      throw firestoreError; // Re-throw to be caught by the outer catch block
    }
    
    // Create an order in Firestore
    try {
      console.log('Creating order in Firestore');
      const orderRef = await db.collection('orders').add({
        userId: cart.userId,
        items: cart.items,
        totalAmount: cart.totalAmount,
        status: 'paid',
        paymentIntentId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`Order created successfully with ID: ${orderRef.id}`);
      
      // Update the cart status and clear its contents
      console.log(`Updating cart ${cartId} status to completed and clearing items`);
      const cartRef = db.collection('carts').doc(cartId);
      await cartRef.update({
        status: 'completed',
        orderId: orderRef.id,
        items: [],
        itemCount: 0,
        totalAmount: 0
      });
      
      // Also clear the items subcollection
      console.log(`Clearing items subcollection for cart ${cartId}`);
      const itemsSnapshot = await db.collection('carts').doc(cartId).collection('items').get();
      const batch = db.batch();
      itemsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      console.log(`Cart ${cartId} updated successfully`);
      
      // Return success
      res.json({ success: true, orderId: orderRef.id });
    } catch (dbError) {
      console.error('Error creating order or updating cart:', dbError);
      console.error('Error code:', dbError.code);
      console.error('Error message:', dbError.message);
      throw dbError; // Re-throw to be caught by the outer catch block
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Stripe Connected Accounts API
 * 
 * These endpoints handle seller account creation, onboarding, 
 * and management for the Benchlot marketplace.
 */

/**
 * Create a connected account for a seller
 * This is the first step in the seller onboarding process.
 */
app.post('/create-connected-account', async (req, res) => {
  try {
    const { userId, email, sellerName, sellerType, location, contactEmail, contactPhone, sellerBio } = req.body;
    
    console.log(`Creating connected account for user ${userId} with email ${email}`);
    
    if (!userId || !email) {
      console.log('Missing userId or email');
      return res.status(400).json({ error: 'Missing userId or email' });
    }
    
    // Check if user already has a Stripe account
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists && userDoc.data().stripeAccountId) {
        console.log(`User ${userId} already has a Stripe account: ${userDoc.data().stripeAccountId}`);
        
        // Create a new account link for continuing onboarding
        const accountLink = await stripe.accountLinks.create({
          account: userDoc.data().stripeAccountId,
          refresh_url: `${process.env.APP_URL || 'https://benchlot.com'}/seller/onboarding/refresh`,
          return_url: `${process.env.APP_URL || 'https://benchlot.com'}/seller/onboarding/complete`,
          type: 'account_onboarding'
        });
        
        return res.json({ 
          url: accountLink.url,
          accountId: userDoc.data().stripeAccountId,
          exists: true
        });
      }
    } catch (checkError) {
      console.error('Error checking existing Stripe account:', checkError);
      // Continue with account creation
    }
    
    // Create a connected account with Stripe
    console.log('Creating Stripe connected account');
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      business_type: sellerType === 'business' ? 'company' : 'individual',
      metadata: {
        userId,
        location,
        sellerName
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      }
    });
    
    console.log(`Stripe account created with ID: ${account.id}`);
    
    // Store the account ID and seller info in Firestore
    try {
      console.log(`Updating user ${userId} with Stripe account info`);
      
      // Create seller profile data
      const sellerProfile = {
        stripeAccountId: account.id,
        isSeller: true,
        sellerSince: admin.firestore.FieldValue.serverTimestamp(),
        sellerType: sellerType || 'individual',
        sellerName: sellerName || email.split('@')[0],
        location: location || 'Boston, MA',
        contactEmail: contactEmail || email,
        contactPhone: contactPhone || '',
        sellerBio: sellerBio || '',
        stripeStatus: 'pending',
        detailsSubmitted: false,
        payoutsEnabled: false
      };
      
      // Update user record
      await db.collection('users').doc(userId).update(sellerProfile);
      console.log('User updated successfully with seller profile');
    } catch (firestoreError) {
      console.error('Error updating user in Firestore:', firestoreError);
      console.error('Error code:', firestoreError.code);
      console.error('Error message:', firestoreError.message);
      throw firestoreError;
    }
    
    // Create an account link for onboarding
    console.log('Creating account link for onboarding');
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.APP_URL || 'https://benchlot.com'}/seller/onboarding/refresh`,
      return_url: `${process.env.APP_URL || 'https://benchlot.com'}/seller/onboarding/complete`,
      type: 'account_onboarding'
    });
    
    console.log('Account link created successfully');
    
    // Return the account link URL and new account ID
    res.json({ 
      url: accountLink.url,
      accountId: account.id,
      exists: false
    });
  } catch (error) {
    console.error('Error creating connected account:', error);
    console.error('Error details:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get the status of a Stripe connected account
 * Checks if the seller has completed onboarding and is eligible to receive payments
 */
app.get('/get-account-status', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }
    
    console.log(`Getting account status for user ${userId}`);
    
    // Get the user from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    if (!userData.stripeAccountId) {
      return res.status(404).json({ error: 'User is not a seller' });
    }
    
    // Get the account from Stripe
    const account = await stripe.accounts.retrieve(userData.stripeAccountId);
    
    // Return comprehensive account status
    const accountStatus = {
      accountId: account.id,
      status: account.requirements.disabled_reason ? 'restricted' : 'active',
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled,
      requirementsDisabledReason: account.requirements.disabled_reason,
      requirements: account.requirements,
      chargesEnabled: account.charges_enabled
    };
    
    // Update the user's account status in Firestore
    await db.collection('users').doc(userId).update({
      stripeStatus: accountStatus.status,
      detailsSubmitted: accountStatus.detailsSubmitted,
      payoutsEnabled: accountStatus.payoutsEnabled,
      lastStatusUpdate: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json(accountStatus);
  } catch (error) {
    console.error('Error getting account status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create or refresh an account link for onboarding
 * Used when the original onboarding link expires or when the seller needs to update their information
 */
app.get('/refresh-account-link', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }
    
    console.log(`Refreshing account link for user ${userId}`);
    
    // Get the user from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    if (!userData.stripeAccountId) {
      return res.status(404).json({ error: 'User is not a seller' });
    }
    
    // Create a new account link
    const accountLink = await stripe.accountLinks.create({
      account: userData.stripeAccountId,
      refresh_url: `${process.env.APP_URL || 'https://benchlot.com'}/seller/onboarding/refresh`,
      return_url: `${process.env.APP_URL || 'https://benchlot.com'}/seller/onboarding/complete`,
      type: 'account_onboarding'
    });
    
    res.json({ url: accountLink.url });
  } catch (error) {
    console.error('Error refreshing account link:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate a link to the Stripe Dashboard for a connected account
 * Allows sellers to access their Stripe dashboard to view payments, update information, etc.
 */
app.get('/get-dashboard-link', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }
    
    console.log(`Creating dashboard link for user ${userId}`);
    
    // Get the user from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    if (!userData.stripeAccountId) {
      return res.status(404).json({ error: 'User is not a seller' });
    }
    
    // Create a dashboard link
    const dashboardLink = await stripe.accounts.createLoginLink(
      userData.stripeAccountId
    );
    
    res.json({ url: dashboardLink.url });
  } catch (error) {
    console.error('Error creating dashboard link:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Handle Stripe webhooks for events
 * This endpoint receives and processes Stripe webhook events
 * including payment confirmations, account updates, and more.
 */
app.post('/stripe-webhook', async (req, res) => {
  const signature = req.headers['stripe-signature'];
  let event;

  console.log('Received webhook from Stripe');
  
  try {
    // Verify the webhook signature
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test';
    
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody || req.body,
        signature,
        endpointSecret
      );
    } catch (signatureError) {
      console.error('Webhook signature verification failed:', signatureError.message);
      return res.status(400).send(`Webhook signature verification failed: ${signatureError.message}`);
    }
    
    console.log(`Webhook event type: ${event.type}`);
    
    // Process different event types
    switch (event.type) {
      // Connected account events
      case 'account.updated': {
        const account = event.data.object;
        console.log(`Account ${account.id} was updated`);
        
        // Find the user by Stripe account ID
        const usersSnapshot = await db.collection('users')
          .where('stripeAccountId', '==', account.id)
          .limit(1)
          .get();
          
        if (usersSnapshot.empty) {
          console.log(`No user found for account ${account.id}`);
          break;
        }
        
        const userId = usersSnapshot.docs[0].id;
        console.log(`Found user ${userId} for account ${account.id}`);
        
        // Update account status in Firestore
        await db.collection('users').doc(userId).update({
          stripeStatus: account.requirements.disabled_reason ? 'restricted' : 'active',
          detailsSubmitted: account.details_submitted,
          payoutsEnabled: account.payouts_enabled,
          lastStatusUpdate: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Updated user ${userId} account status`);
        
        // If onboarding is now complete, send an email notification
        if (account.details_submitted && account.payouts_enabled) {
          const userData = usersSnapshot.docs[0].data();
          try {
            await emailService.sendSellerOnboardingCompleteEmail(
              userData.contactEmail || userData.email,
              { sellerName: userData.sellerName || 'Seller' }
            );
            console.log(`Sent onboarding complete email to ${userData.contactEmail || userData.email}`);
          } catch (emailError) {
            console.error('Error sending onboarding complete email:', emailError);
          }
        }
        
        break;
      }
      
      // Payment success events
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log(`Payment intent ${paymentIntent.id} succeeded`);
        
        // Check if this is for a marketplace payment with transfers
        if (paymentIntent.metadata && paymentIntent.metadata.cartId) {
          // Process marketplace payment
          try {
            const cartId = paymentIntent.metadata.cartId;
            const cartRef = db.collection('carts').doc(cartId);
            const cartDoc = await cartRef.get();
            
            if (!cartDoc.exists) {
              console.log(`Cart ${cartId} not found for successful payment`);
              break;
            }
            
            const cart = cartDoc.data();
            
            // Create transfers to sellers if there are multiple sellers
            // This is a simple implementation - in a full system we'd track
            // individual seller items and their prices
            if (cart.items && cart.items.length > 0) {
              console.log(`Processing transfers for ${cart.items.length} items`);
              
              // Group items by seller
              const sellerItems = {};
              
              for (const item of cart.items) {
                if (item.sellerId) {
                  if (!sellerItems[item.sellerId]) {
                    sellerItems[item.sellerId] = [];
                  }
                  sellerItems[item.sellerId].push(item);
                }
              }
              
              // Create transfers for each seller
              for (const sellerId in sellerItems) {
                const sellerDoc = await db.collection('users').doc(sellerId).get();
                
                if (!sellerDoc.exists) {
                  console.log(`Seller ${sellerId} not found for transfer`);
                  continue;
                }
                
                const seller = sellerDoc.data();
                
                if (!seller.stripeAccountId) {
                  console.log(`Seller ${sellerId} has no Stripe account ID`);
                  continue;
                }
                
                // Calculate seller's total (simplified)
                const sellerTotal = sellerItems[sellerId].reduce(
                  (total, item) => total + (item.price * item.quantity), 0
                );
                
                // Calculate platform fee (5%)
                const platformFee = Math.round(sellerTotal * 0.05 * 100);
                const sellerAmount = Math.round(sellerTotal * 0.95 * 100);
                
                // Create transfer
                try {
                  const transfer = await stripe.transfers.create({
                    amount: sellerAmount, // in cents
                    currency: 'usd',
                    destination: seller.stripeAccountId,
                    source_transaction: paymentIntent.charges.data[0].id,
                    description: `Transfer for order related to cart ${cartId}`,
                    metadata: {
                      cartId,
                      sellerId,
                      platformFee,
                      sellerAmount,
                      items: JSON.stringify(sellerItems[sellerId].map(i => i.id))
                    }
                  });
                  
                  console.log(`Created transfer ${transfer.id} to seller ${sellerId} for ${sellerAmount/100}`);
                  
                  // Record the transfer in Firestore
                  await db.collection('transfers').add({
                    transferId: transfer.id,
                    sellerId,
                    paymentIntentId: paymentIntent.id,
                    cartId,
                    amount: sellerAmount / 100,
                    platformFee: platformFee / 100,
                    status: transfer.status,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                  });
                  
                } catch (transferError) {
                  console.error(`Error creating transfer to seller ${sellerId}:`, transferError);
                }
              }
            }
          } catch (cartError) {
            console.error('Error processing marketplace payment:', cartError);
          }
        }
        
        break;
      }
      
      // Other event types can be added here as needed
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    // Return success
    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Simple API status endpoint
 */
app.get('/', (req, res) => {
  try {
    console.log('Status endpoint called');
    const response = {
      status: 'ok',
      timestamp: new Date().toISOString()
    };
    res.json(response);
  } catch (error) {
    console.error('Status endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Email endpoints
 */

// Send password reset email
app.post('/send-password-reset', async (req, res) => {
  try {
    const { email, resetLink } = req.body;
    
    if (!email || !resetLink) {
      return res.status(400).json({ error: 'Missing email or resetLink' });
    }
    
    console.log(`Sending password reset email to ${email}`);
    const result = await emailService.sendPasswordResetEmail(email, resetLink);
    
    if (result.success) {
      return res.json({ success: true });
    } else {
      console.error('Error sending password reset email:', result.error);
      return res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error in password reset email endpoint:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Send account creation welcome email
app.post('/send-welcome-email', async (req, res) => {
  try {
    const { email, firstName } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    
    console.log(`Sending welcome email to ${email}`);
    const result = await emailService.sendAccountCreationEmail(email, firstName);
    
    if (result.success) {
      return res.json({ success: true });
    } else {
      console.error('Error sending welcome email:', result.error);
      return res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error in welcome email endpoint:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Send listing published email
app.post('/send-listing-published', async (req, res) => {
  try {
    const { email, listingDetails } = req.body;
    
    if (!email || !listingDetails) {
      return res.status(400).json({ error: 'Missing email or listingDetails' });
    }
    
    console.log(`Sending listing published email to ${email}`, listingDetails);
    const result = await emailService.sendListingPublishedEmail(email, listingDetails);
    
    if (result.success) {
      return res.json({ success: true });
    } else {
      console.error('Error sending listing published email:', result.error);
      return res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error in listing published email endpoint:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Send message received email
app.post('/send-message-notification', async (req, res) => {
  try {
    const { email, messageDetails } = req.body;
    
    if (!email || !messageDetails) {
      return res.status(400).json({ error: 'Missing email or messageDetails' });
    }
    
    console.log(`Sending message notification email to ${email}`);
    const result = await emailService.sendMessageReceivedEmail(email, messageDetails);
    
    if (result.success) {
      return res.json({ success: true });
    } else {
      console.error('Error sending message notification email:', result.error);
      return res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error in message notification email endpoint:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Send offer received email
app.post('/send-offer-notification', async (req, res) => {
  try {
    const { email, offerDetails } = req.body;
    
    if (!email || !offerDetails) {
      return res.status(400).json({ error: 'Missing email or offerDetails' });
    }
    
    console.log(`Sending offer notification email to ${email}`);
    const result = await emailService.sendOfferReceivedEmail(email, offerDetails);
    
    if (result.success) {
      return res.json({ success: true });
    } else {
      console.error('Error sending offer notification email:', result.error);
      return res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error in offer notification email endpoint:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Send test email (for verification purposes)
app.post('/send-test-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    
    console.log(`Sending test email to ${email}`);
    const result = await emailService.sendTestEmail(email);
    
    if (result.success) {
      return res.json({ success: true });
    } else {
      console.error('Error sending test email:', result.error);
      return res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error in test email endpoint:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Export the API as a Firebase Function with public access
exports.api = functions.https.onRequest((req, res) => {
    // Enable CORS for all origins
    res.set('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'OPTIONS') {
      // Handle preflight requests
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.set('Access-Control-Max-Age', '3600');
      res.status(204).send('');
      return;
    }
    
    // Pass the request to the Express app
    return app(req, res);
  });

// Maintain backward compatibility with previous stripeApi endpoint
exports.stripeApi = exports.api;

// Note: Email test functions have been removed after successful testing