/**
 * Firebase Functions for Benchlot
 * Handles Stripe integration, payment processing, and email notifications
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors')({ origin: true });
const emailService = require('./emailService');

/**
 * Utility function to get config values with fallbacks
 * Uses environment variables or falls back to default values
 * 
 * Note: Firebase Functions v2 no longer supports functions.config()
 * All configuration is set using environment variables in firebase.json
 */
const getConfig = (key, envVarName, defaultValue) => {
  // Try environment variable
  if (process.env[envVarName]) {
    console.log(`Using ${envVarName} from environment variables`);
    return process.env[envVarName];
  }
  
  // Fall back to default
  console.log(`Using default value for ${key}`);
  return defaultValue;
};

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
  // Get Stripe key from environment variables
  const stripeKey = process.env.STRIPE_SECRET || 
                    process.env.STRIPE_SECRET_KEY;
  
  if (stripeKey) {
    console.log('Using Stripe key from config');
    
    // Log key type (live or test) for verification
    console.log('Key type:', stripeKey.startsWith('sk_live') ? 'LIVE MODE' : 'TEST MODE');
    console.log('Key prefix:', stripeKey.substring(0, 10) + '...');
    
    // Force live key for production
    if (process.env.NODE_ENV === 'production' && !stripeKey.startsWith('sk_live')) {
      console.warn('⚠️ WARNING: Not using a live key in production!');
    }
    
    stripe = require('stripe')(stripeKey);
  } 
  // Last resort fallback - this should only happen in development
  else {
    console.warn('⚠️ No Stripe key found in environment, falling back to hardcoded test key');
    console.warn('Available env vars:', Object.keys(process.env).filter(k => k.includes('STRIPE')).join(', '));
    stripe = require('stripe')('sk_test_51R42hePJSOllkrGgAhjsqqLDv8tYbuW6dcrKfOMjfv2QfnhWC5KZ1EZpf4bKITGpeLdozy6yN6B7tvB51YfgKZz90015yqqPnS');
  }
} catch (error) {
  console.error('Error initializing Stripe:', error);
  console.warn('⚠️ FALLING BACK TO TEST MODE - THIS SHOULD NOT HAPPEN IN PRODUCTION');
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
    // Log the full request body for debugging
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { cartId, userId, isGuestCheckout, cartItems, cartTotal, mockCart } = req.body;
    
    // Handle the "mockCart" case from the client-side fix
    if (mockCart && cartId === 'guest-cart') {
      console.log('Using mockCart from request');
      return res.json({
        clientSecret: `pi_mockCart${Date.now()}_secret_${mockCart.id}`,
        isMarketplace: false
      });
    }
    
    // Log extracted values
    console.log('Extracted values:');
    console.log(`- cartId: ${cartId}`);
    console.log(`- userId: ${userId}`);
    console.log(`- isGuestCheckout: ${isGuestCheckout}`);
    console.log(`- cartItems present: ${Boolean(cartItems)}`);
    console.log(`- cartTotal: ${cartTotal}`);
    
    if (!cartId || !userId) {
      return res.status(400).json({ error: 'Missing cartId or userId' });
    }
    
    console.log(`Attempting to process cart ${cartId} for user ${userId}`);
    console.log(`Guest checkout: ${isGuestCheckout ? 'Yes' : 'No'}`);
    
    let cart;
    
    // Convert isGuestCheckout to boolean if it's a string
    const isGuestCheckoutBool = isGuestCheckout === true || isGuestCheckout === 'true';
    console.log(`isGuestCheckout converted to boolean: ${isGuestCheckoutBool}`);
    
    // Handle guest checkout with cart data in request
    if (isGuestCheckoutBool && cartId === 'guest-cart' && cartItems && cartTotal) {
      console.log('Processing guest cart from request payload');
      console.log('Guest cart items:', JSON.stringify(cartItems, null, 2));
      console.log('Guest cart total:', cartTotal);
      
      // For guest checkout, create a payment intent directly without lookup
      // This bypasses the need to have a cart in Firestore
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(cartTotal * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          cartId: 'guest-cart',
          userId: 'guest',
          isGuestCheckout: 'true',
          guestEmail: req.body.guestEmail || ''
        }
      });
      
      console.log(`Created direct payment intent for guest checkout: ${paymentIntent.id}`);
      
      // Return the client secret to the client
      return res.json({
        clientSecret: paymentIntent.client_secret,
        isMarketplace: false
      });
    } else {
      try {
        // Get the cart from Firestore for authenticated users
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
        
        // Verify the cart belongs to the user (skip for guest checkout)
        if (!isGuestCheckout && cart.userId !== userId) {
          return res.status(403).json({ error: 'Unauthorized' });
        }
      } catch (firestoreError) {
        console.error('Detailed Firestore error:', firestoreError);
        console.error('Error code:', firestoreError.code);
        console.error('Error message:', firestoreError.message);
        if (firestoreError.details) {
          console.error('Error details:', firestoreError.details);
        }
        throw firestoreError; // Re-throw to be caught by the outer catch block
      }
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
    const { 
      paymentIntentId, 
      cartId, 
      isGuestCheckout, 
      guestEmail, 
      cartItems, 
      cartTotal, 
      shippingAddress, 
      billingAddress 
    } = req.body;
    
    if (!paymentIntentId || !cartId) {
      return res.status(400).json({ error: 'Missing paymentIntentId or cartId' });
    }
    
    console.log(`Retrieving payment intent from Stripe: ${paymentIntentId}`);
    
    // Verify the payment intent with Stripe
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      console.log(`Retrieved payment intent with status: ${paymentIntent.status}`);
    } catch (stripeError) {
      console.error(`Stripe error retrieving payment intent ${paymentIntentId}:`, stripeError);
      return res.status(400).json({ 
        error: `Payment verification failed: ${stripeError.message}`,
        code: stripeError.code || 'unknown_error'
      });
    }
    
    if (paymentIntent.status !== 'succeeded') {
      console.log(`Payment intent ${paymentIntentId} has status ${paymentIntent.status}, not succeeded`);
      return res.status(400).json({ 
        error: `Payment has not succeeded. Current status: ${paymentIntent.status}`,
        code: 'payment_not_succeeded'
      });
    }
    
    console.log(`Confirming payment for intent ${paymentIntentId}, cart ${cartId}`);
    console.log(`Guest checkout: ${isGuestCheckout ? 'Yes' : 'No'}`);
    
    // Convert isGuestCheckout to boolean if it's a string
    const isGuestCheckoutBool = isGuestCheckout === true || isGuestCheckout === 'true';
    console.log(`isGuestCheckout converted to boolean: ${isGuestCheckoutBool}`);

    // Process guest cart directly from the request payload
    if (isGuestCheckoutBool && cartId === 'guest-cart' && cartItems) {
      try {
        console.log('Processing guest cart order');
        console.log('Guest cart items:', JSON.stringify(cartItems, null, 2));
        console.log('Guest cart total:', cartTotal);
        
        // Verify payment intent metadata matches guest checkout
        const paymentMetadata = paymentIntent.metadata || {};
        console.log('Payment intent metadata:', JSON.stringify(paymentMetadata, null, 2));
        
        if (paymentMetadata.isGuestCheckout === 'true' && paymentMetadata.cartId === 'guest-cart') {
          console.log('Payment intent metadata confirms this is a guest checkout');
        } else {
          console.log('Adding guest checkout info to payment intent metadata');
          // Update payment intent with guest metadata if not already present
          await stripe.paymentIntents.update(paymentIntentId, {
            metadata: {
              ...paymentMetadata,
              isGuestCheckout: 'true',
              cartId: 'guest-cart',
              guestEmail: guestEmail || ''
            }
          });
        }
        
        // Create order in Firestore with guest information
        console.log('Creating guest order in Firestore');
        const orderRef = await db.collection('orders').add({
          userId: 'guest',
          userEmail: guestEmail || 'guest@example.com',
          items: cartItems,
          totalAmount: cartTotal || 0,
          status: 'paid',
          paymentIntentId,
          isGuestOrder: true,
          shippingAddress: shippingAddress || {},
          billingAddress: billingAddress || shippingAddress || {},
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Guest order created successfully with ID: ${orderRef.id}`);
        
        // Send order confirmation email to guest buyer
        try {
          if (guestEmail) {
            console.log(`Sending order confirmation email to guest: ${guestEmail}`);
            const purchaseDetails = {
              orderId: orderRef.id,
              totalAmount: cartTotal || 0,
              items: cartItems,
              isGuestOrder: true,
              shippingAddress: shippingAddress || {},
              billingAddress: billingAddress || shippingAddress || {},
              paymentMethod: 'Credit Card'
            };
            
            const emailResult = await emailService.sendOrderConfirmationEmail(
              guestEmail,
              purchaseDetails
            );
            
            console.log(`Order confirmation email sent to guest (${guestEmail}): ${emailResult.success ? 'Success' : 'Failed'}`);
            
            // Also send payment receipt email
            try {
              const paymentDetails = {
                orderId: orderRef.id,
                totalAmount: cartTotal || 0,
                isGuestOrder: true,
                buyerName: guestEmail.split('@')[0],
                paymentIntentId: paymentIntentId,
                paymentMethod: 'Credit Card'
              };
              
              await emailService.sendPaymentReceiptEmail(
                guestEmail,
                paymentDetails
              );
              
              console.log(`Payment receipt email sent to guest (${guestEmail})`);
            } catch (paymentEmailError) {
              console.error('Error sending payment receipt email to guest:', paymentEmailError);
            }
            
            // Send notifications to sellers for each item in the order
            for (const item of cartItems) {
              if (item.sellerId) {
                try {
                  const sellerDoc = await db.collection('users').doc(item.sellerId).get();
                  
                  if (sellerDoc.exists) {
                    const sellerEmail = sellerDoc.data().email || sellerDoc.data().contactEmail;
                    
                    if (sellerEmail) {
                      const orderDetails = {
                        orderId: orderRef.id,
                        sellerId: item.sellerId,
                        amount: item.price * (item.quantity || 1),
                        buyerName: guestEmail.split('@')[0] || 'Guest Customer',
                        toolName: item.name || item.title,
                        items: [item],
                        shippingAddress: shippingAddress || {}
                      };
                      
                      await emailService.sendOrderReceivedEmail(
                        sellerEmail,
                        orderDetails
                      );
                      
                      console.log(`Order notification email sent to seller ${item.sellerId} (${sellerEmail})`);
                    }
                  }
                } catch (sellerEmailError) {
                  console.error(`Error sending order notification to seller ${item.sellerId}:`, sellerEmailError);
                }
              }
            }
          } else {
            console.log('No guest email provided, skipping order confirmation email');
          }
        } catch (emailError) {
          console.error('Error sending order confirmation email to guest:', emailError);
          // Don't fail the API call if email fails
        }
        
        // Return success with order ID
        return res.json({ success: true, orderId: orderRef.id });
      } catch (guestOrderError) {
        console.error('Error creating guest order:', guestOrderError);
        throw guestOrderError;
      }
    }
    
    // For authenticated users, get the cart from Firestore
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
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        shippingAddress: shippingAddress || {},
        billingAddress: billingAddress || shippingAddress || {}
      });
      
      console.log(`Order created successfully with ID: ${orderRef.id}`);
      
      // Send order confirmation and payment receipt emails to buyer
      try {
        // Get user email from Firestore
        const userDoc = await db.collection('users').doc(cart.userId).get();
        if (userDoc.exists) {
          const userEmail = userDoc.data().email;
          const userName = userDoc.data().displayName || userDoc.data().firstName || userDoc.data().lastName;
          
          if (userEmail) {
            console.log(`Sending order confirmation email to user: ${userEmail}`);
            const purchaseDetails = {
              orderId: orderRef.id,
              userId: cart.userId,
              totalAmount: cart.totalAmount,
              items: cart.items,
              isGuestOrder: false,
              buyerName: userName,
              shippingAddress: shippingAddress || {},
              billingAddress: billingAddress || shippingAddress || {},
              paymentMethod: 'Credit Card'
            };
            
            const emailResult = await emailService.sendOrderConfirmationEmail(
              userEmail,
              purchaseDetails
            );
            
            console.log(`Order confirmation email sent to user (${userEmail}): ${emailResult.success ? 'Success' : 'Failed'}`);
            
            // Also send payment receipt email
            try {
              const paymentDetails = {
                orderId: orderRef.id,
                userId: cart.userId,
                totalAmount: cart.totalAmount,
                isGuestOrder: false,
                buyerName: userName,
                paymentIntentId: paymentIntentId,
                paymentMethod: 'Credit Card'
              };
              
              await emailService.sendPaymentReceiptEmail(
                userEmail,
                paymentDetails
              );
              
              console.log(`Payment receipt email sent to user (${userEmail})`);
            } catch (paymentEmailError) {
              console.error('Error sending payment receipt email to user:', paymentEmailError);
            }
            
            // Send notifications to sellers for each item in the order
            for (const item of cart.items) {
              if (item.sellerId) {
                try {
                  const sellerDoc = await db.collection('users').doc(item.sellerId).get();
                  
                  if (sellerDoc.exists) {
                    const sellerEmail = sellerDoc.data().email || sellerDoc.data().contactEmail;
                    
                    if (sellerEmail) {
                      const orderDetails = {
                        orderId: orderRef.id,
                        sellerId: item.sellerId,
                        amount: item.price * (item.quantity || 1),
                        buyerName: userName || 'Customer',
                        toolName: item.name || item.title,
                        items: [item],
                        shippingAddress: shippingAddress || {}
                      };
                      
                      await emailService.sendOrderReceivedEmail(
                        sellerEmail,
                        orderDetails
                      );
                      
                      console.log(`Order notification email sent to seller ${item.sellerId} (${sellerEmail})`);
                    }
                  }
                } catch (sellerEmailError) {
                  console.error(`Error sending order notification to seller ${item.sellerId}:`, sellerEmailError);
                }
              }
            }
          } else {
            console.log(`No email found for user ${cart.userId}, skipping order confirmation email`);
          }
        } else {
          console.log(`User ${cart.userId} not found, skipping order confirmation email`);
        }
      } catch (emailError) {
        console.error('Error sending emails to user:', emailError);
        // Don't fail the API call if email fails
      }
      
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
    const { 
      userId, 
      email, 
      firstName, 
      lastName,
      sellerName, 
      sellerType, 
      location, 
      contactEmail, 
      contactPhone, 
      sellerBio 
    } = req.body;
    
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
        const appUrl = process.env.APP_URL || 'https://benchlot.com';
        const accountLink = await stripe.accountLinks.create({
          account: userDoc.data().stripeAccountId,
          refresh_url: `${appUrl}/seller/onboarding/refresh`,
          return_url: `${appUrl}/seller/onboarding/complete`,
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
    
    // Define common account parameters
    const accountParams = {
      email,
      metadata: {
        userId,
        location,
        sellerName
      },
      // Use the newer controller parameters instead of the legacy type parameter
      // The controller parameters provide more control and are the recommended approach
      controller: {
        stripe_dashboard: { type: 'none' },        // No access to Stripe Dashboard
        fees: { payer: 'application' },            // Platform pays the fees
        losses: { payments: 'application' },       // Platform covers any losses
        requirement_collection: 'application'      // Platform collects all required info
      },
      // Set business type - note we don't set 'type' parameter anymore
      business_type: sellerType === 'business' ? 'company' : 'individual'
    };
    
    // Explicitly accept TOS on behalf of all sellers - CRITICAL to skip TOS screen
    accountParams.tos_acceptance = {
      date: Math.floor(Date.now() / 1000),
      ip: req.ip || '127.0.0.1'  // Use request IP or fallback
      // Letting Stripe default to "full" service agreement for US-to-US transfers
    };
    
    // Only request the transfers capability - minimum needed for our use case
    // We don't need card_payments since all charges go through our platform account
    accountParams.capabilities = {
      transfers: { requested: true }
    };
    
    // Specify platform-controlled payouts schedule - applies to all sellers
    accountParams.settings = {
      payouts: {
        schedule: {
          interval: 'manual'  // Platform completely controls when sellers get paid
        }
      }
    };
    
    // Set verification requirements to minimum for all sellers
    if (sellerType === 'individual') {
      // Get first and last name with fallbacks
      const firstNameValue = firstName || (sellerName ? sellerName.split(' ')[0] : null) || email.split('@')[0] || "User";
      const lastNameValue = lastName || (sellerName && sellerName.split(' ').length > 1 ? sellerName.split(' ').slice(1).join(' ') : "User");
      
      // For individuals - use the standard nested format that Stripe's Node.js library expects
      // The library will convert this to the proper format when making the API request
      accountParams.individual = {
        first_name: firstNameValue,
        last_name: lastNameValue
      };
      
      // Add empty verification document (optional but mimics successful request)
      if (process.env.NODE_ENV !== 'production') { // Only in non-production environments
        accountParams.individual.verification = {
          document: {
            back: "",
            front: ""
          }
        };
      }
      
      // Add URL to business profile (required before first transfer)
      accountParams.business_profile = {
        ...accountParams.business_profile,
        url: `https://benchlot.com/sellers/${userId}`
      };
      
      // Add the optional but helpful DOB fields if we have them
      // (these are required for accounts over $3,000 anyway)
      if (false) { // Placeholder for when DOB is available
        accountParams.individual.dob = {
          day: 1,  // Replace with actual values when available
          month: 1,
          year: 1980
        };
      }
      
      // Log the exact data being sent for debugging
      console.log('Setting account parameters with individual data:', JSON.stringify({
        business_type: accountParams.business_type,
        'business_profile.url': accountParams.business_profile.url,
        'tos_acceptance.date': accountParams.tos_acceptance?.date,
        'tos_acceptance.ip': accountParams.tos_acceptance?.ip,
        'individual.first_name': accountParams.individual.first_name,
        'individual.last_name': accountParams.individual.last_name
      }, null, 2));
    } else {
      // For businesses
      accountParams.company = {
        verification: {
          document: {
            back: "",
            front: ""
          }
        }
      };
    }
    
    // Explicitly set US as country to reduce international compliance requirements
    accountParams.country = 'US';
    
    // Explicitly mark as destination only (receiving transfers only)
    accountParams.metadata.purpose = 'destination_only';
    
    // Add business_profile.url for all accounts to satisfy Stripe requirements
    accountParams.business_profile = {
      url: `https://benchlot.com/sellers/${userId}`
    };
    
    // IMPORTANT NOTE: We're using a "full" service agreement (default) with only the "transfers" capability.
    // Even with a full agreement, these accounts are still configured to only receive transfers, not process payments directly,
    // by only requesting the "transfers" capability and not the "card_payments" capability.
    // This is the correct configuration for a US-based marketplace platform where the platform handles all payments
    // and sellers only receive their share of the funds.
    
    console.log('Account parameters:', JSON.stringify(accountParams, null, 2));
    const account = await stripe.accounts.create(accountParams);
    
    console.log(`Stripe account created with ID: ${account.id}`);
    console.log('Full account response:', JSON.stringify(account, null, 2));
    
    // Step 2: Explicitly update the Person (representative) with required information
    try {
      console.log('Starting person creation/update process');
      
      // Extract the person ID from the account
      console.log('Account individual:', account.individual);
      const personId = account.individual?.id;
      console.log('Extracted personId:', personId);
      
      // Get first and last name with fallbacks
      const firstNameValue = firstName || (sellerName ? sellerName.split(' ')[0] : null) || email.split('@')[0] || "User";
      const lastNameValue = lastName || (sellerName && sellerName.split(' ').length > 1 ? sellerName.split(' ').slice(1).join(' ') : "User");
      console.log(`Using name values: firstName=${firstNameValue}, lastName=${lastNameValue}`);
      
      if (personId) {
        console.log(`Found person ID ${personId}, updating with name information...`);
        
        // Update the person with explicit name information
        try {
          const updatedPerson = await stripe.accounts.updatePerson(
            account.id,
            personId,
            {
              first_name: firstNameValue,
              last_name: lastNameValue,
              relationship: {
                representative: true
              }
            }
          );
          
          console.log(`Successfully updated person with name: ${firstNameValue} ${lastNameValue}`);
          console.log('Updated person response:', JSON.stringify(updatedPerson, null, 2));
        } catch (updateError) {
          console.error('Error updating person:', updateError);
          console.log('Falling back to creating a new person');
          // Fall through to person creation as a backup
          const newPerson = await stripe.accounts.createPerson(
            account.id,
            {
              first_name: firstNameValue,
              last_name: lastNameValue,
              relationship: {
                representative: true
              }
            }
          );
          
          console.log(`Created new person after update failure: ${newPerson.id}`);
        }
      } else {
        console.log('Person ID not found in account response, creating new person...');
        
        // Always create a new person with representative relationship
        // This is our fallback when the person ID isn't automatically provided
        console.log(`Creating person with account ID: ${account.id}`);
        console.log('Person data:', JSON.stringify({
          first_name: firstNameValue,
          last_name: lastNameValue,
          relationship: { representative: true }
        }, null, 2));
        
        try {
          const newPerson = await stripe.accounts.createPerson(
            account.id,
            {
              first_name: firstNameValue,
              last_name: lastNameValue,
              relationship: {
                representative: true
              }
            }
          );
          
          console.log(`Created new person with ID: ${newPerson.id} and name: ${firstNameValue} ${lastNameValue}`);
          console.log('New person response:', JSON.stringify(newPerson, null, 2));
        } catch (createError) {
          console.error('Error creating person:', createError);
          console.error('Create person error details:', JSON.stringify(createError, null, 2));
        }
      }
    } catch (personError) {
      console.error('Error in overall person creation/update process:', personError);
      console.error('Error stack:', personError.stack);
      // Continue with the flow - we don't want to fail the whole account creation
      // if updating the person fails
    }
    
    // Store the account ID and seller info in Firestore
    try {
      console.log(`Updating user ${userId} with Stripe account info`);
      
      // Create seller profile data
      const sellerProfile = {
        stripeAccountId: account.id,
        isSeller: true,
        sellerSince: admin.firestore.FieldValue.serverTimestamp(),
        sellerType: sellerType || 'individual',
        firstName: firstName || '',
        lastName: lastName || '',
        sellerName: sellerName || email.split('@')[0],
        location: location || 'Boston, MA',
        contactEmail: contactEmail || email,
        contactPhone: contactPhone || '',
        sellerBio: sellerBio || '',
        stripeStatus: 'pending',
        detailsSubmitted: false,
        payoutsEnabled: false,
        role: 'seller', // Explicitly set role to seller to match Firestore rules
        // Also set seller object with the new data structure
        seller: {
          isSeller: true,
          stripeAccountId: account.id,
          stripeStatus: 'pending',
          sellerType: sellerType || 'individual',
          sellerSince: new Date().toISOString()
        }
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
    
    // Handle account setup for ALL sellers - bypass Stripe hosted onboarding completely
    const appUrl = process.env.APP_URL || 'https://benchlot.com';
    console.log('BYPASSING Stripe hosted onboarding for all sellers');
    console.log(`Using app URL: ${appUrl}`);
    
    // Skip Stripe hosted onboarding completely
    // Route everyone to our bank account collection UI
    const setupResult = {
      url: `${appUrl}/seller/bank-details?accountId=${account.id}`
    };
    
    // Mark this in the user's profile so we know they need to provide bank details directly
    await db.collection('users').doc(userId).update({
      needsBankDetails: true,
      stripeStatus: 'pending_bank_details'
    });
    
    console.log(`Directing user to our custom bank details form: ${setupResult.url}`);
    
    const accountLink = setupResult;
    
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
    const appUrl = process.env.APP_URL || 'https://benchlot.com';
    const accountLink = await stripe.accountLinks.create({
      account: userData.stripeAccountId,
      refresh_url: `${appUrl}/seller/onboarding/refresh`,
      return_url: `${appUrl}/seller/onboarding/complete`,
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
    // Get both webhook secrets from environment variables
    const paymentWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test';
    const connectWebhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET || 'whsec_test';
    
    console.log('Webhook secrets available:', 
      paymentWebhookSecret !== 'whsec_test' ? 'Payment webhook ✓' : 'Payment webhook ✘',
      connectWebhookSecret !== 'whsec_test' ? 'Connect webhook ✓' : 'Connect webhook ✘');
    
    // Try verifying with payment webhook secret first
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody || req.body,
        signature,
        paymentWebhookSecret
      );
      console.log('✅ Webhook verified with payment webhook secret');
    } catch (paymentError) {
      // If that fails, try with connected account webhook secret
      try {
        event = stripe.webhooks.constructEvent(
          req.rawBody || req.body,
          signature,
          connectWebhookSecret
        );
        console.log('✅ Webhook verified with connect webhook secret');
      } catch (connectError) {
        // If both fail, return error
        console.error('❌ Webhook signature verification failed for both secrets');
        console.error('Payment webhook error:', paymentError.message);
        console.error('Connect webhook error:', connectError.message);
        return res.status(400).send(`Webhook Error: ${paymentError.message}`);
      }
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
 * Add a bank account to a Stripe Custom Connect account
 * This is used for individual sellers who skip the Stripe hosted onboarding
 * and provide bank details directly on our platform
 */
app.post('/add-bank-account', async (req, res) => {
  try {
    const { 
      userId, 
      accountNumber, 
      routingNumber, 
      accountHolderName, 
      accountHolderType = 'individual'
    } = req.body;
    
    if (!userId || !accountNumber || !routingNumber || !accountHolderName) {
      return res.status(400).json({ error: 'Missing required bank account details' });
    }
    
    console.log(`Adding bank account for user ${userId}`);
    
    // Get the user from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    if (!userData.stripeAccountId) {
      return res.status(404).json({ error: 'User is not a seller' });
    }
    
    // Create token for bank account
    const bankAccountToken = await stripe.tokens.create({
      bank_account: {
        country: 'US',
        currency: 'usd',
        account_number: accountNumber,
        routing_number: routingNumber,
        account_holder_name: accountHolderName,
        account_holder_type: accountHolderType // 'individual' or 'company'
      }
    });
    
    // Create external account on the Connect account
    const bankAccount = await stripe.accounts.createExternalAccount(
      userData.stripeAccountId,
      {
        external_account: bankAccountToken.id,
        default_for_currency: true
      }
    );
    
    // Update user record
    await db.collection('users').doc(userId).update({
      hasBankAccount: true,
      stripeStatus: 'active',
      payoutsEnabled: true,
      detailsSubmitted: true,
      needsBankDetails: false,
      lastStatusUpdate: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Return success with the last 4 digits
    res.json({
      success: true,
      last4: bankAccount.last4,
      bankName: bankAccount.bank_name,
      status: 'active'
    });
    
  } catch (error) {
    console.error('Error adding bank account:', error);
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

// Send order confirmation email (can be triggered manually)
app.post('/send-order-confirmation', async (req, res) => {
  try {
    const { email, purchaseDetails, orderId } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    
    // If orderId is provided but not purchaseDetails, fetch the order from Firestore
    if (orderId && !purchaseDetails) {
      console.log(`Fetching order ${orderId} for order confirmation email`);
      const orderDoc = await db.collection('orders').doc(orderId).get();
      
      if (!orderDoc.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      const order = orderDoc.data();
      
      let buyerName = '';
      // Get buyer name if not a guest order
      if (!order.isGuestOrder && order.userId) {
        const userDoc = await db.collection('users').doc(order.userId).get();
        if (userDoc.exists) {
          buyerName = userDoc.data().displayName || userDoc.data().firstName || 
                      userDoc.data().lastName || email.split('@')[0];
        }
      }
      
      const details = {
        orderId,
        userId: order.userId || 'guest',
        totalAmount: order.totalAmount || 0,
        items: order.items || [],
        isGuestOrder: order.isGuestOrder || false,
        buyerName,
        shippingAddress: order.shippingAddress || {},
        billingAddress: order.billingAddress || order.shippingAddress || {},
        paymentMethod: order.paymentMethod || 'Credit Card'
      };
      
      console.log(`Sending order confirmation email for order ${orderId} to ${email}`);
      const result = await emailService.sendOrderConfirmationEmail(email, details);
      
      if (result.success) {
        return res.json({ success: true });
      } else {
        console.error('Error sending order confirmation email:', result.error);
        return res.status(500).json({ error: result.error });
      }
    } 
    // If purchase details were provided directly
    else if (purchaseDetails) {
      console.log(`Sending order confirmation email to ${email} with provided details`);
      const result = await emailService.sendOrderConfirmationEmail(email, purchaseDetails);
      
      if (result.success) {
        return res.json({ success: true });
      } else {
        console.error('Error sending order confirmation email:', result.error);
        return res.status(500).json({ error: result.error });
      }
    } else {
      return res.status(400).json({ error: 'Missing purchaseDetails or orderId' });
    }
  } catch (error) {
    console.error('Error in order confirmation email endpoint:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Send payment receipt email
app.post('/send-payment-receipt', async (req, res) => {
  try {
    const { email, paymentDetails, orderId } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    
    // If orderId is provided but not payment details, fetch the order from Firestore
    if (orderId && !paymentDetails) {
      console.log(`Fetching order ${orderId} for payment receipt email`);
      const orderDoc = await db.collection('orders').doc(orderId).get();
      
      if (!orderDoc.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      const order = orderDoc.data();
      
      let buyerName = '';
      // Get buyer name if not a guest order
      if (!order.isGuestOrder && order.userId) {
        const userDoc = await db.collection('users').doc(order.userId).get();
        if (userDoc.exists) {
          buyerName = userDoc.data().displayName || userDoc.data().firstName || 
                      userDoc.data().lastName || email.split('@')[0];
        }
      }
      
      const details = {
        orderId,
        userId: order.userId || 'guest',
        totalAmount: order.totalAmount || 0,
        isGuestOrder: order.isGuestOrder || false,
        buyerName,
        paymentIntentId: order.paymentIntentId,
        paymentMethod: order.paymentMethod || 'Credit Card',
        last4: order.last4 || '****'
      };
      
      console.log(`Sending payment receipt email for order ${orderId} to ${email}`);
      const result = await emailService.sendPaymentReceiptEmail(email, details);
      
      if (result.success) {
        return res.json({ success: true });
      } else {
        console.error('Error sending payment receipt email:', result.error);
        return res.status(500).json({ error: result.error });
      }
    } 
    // If payment details were provided directly
    else if (paymentDetails) {
      console.log(`Sending payment receipt email to ${email} with provided details`);
      const result = await emailService.sendPaymentReceiptEmail(email, paymentDetails);
      
      if (result.success) {
        return res.json({ success: true });
      } else {
        console.error('Error sending payment receipt email:', result.error);
        return res.status(500).json({ error: result.error });
      }
    } else {
      return res.status(400).json({ error: 'Missing paymentDetails or orderId' });
    }
  } catch (error) {
    console.error('Error in payment receipt email endpoint:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Send shipping notification email
app.post('/send-shipping-notification', async (req, res) => {
  try {
    const { email, shippingDetails, orderId } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    
    // If orderId is provided but not shipping details, fetch the order from Firestore
    if (orderId && !shippingDetails) {
      console.log(`Fetching order ${orderId} for shipping notification email`);
      const orderDoc = await db.collection('orders').doc(orderId).get();
      
      if (!orderDoc.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      const order = orderDoc.data();
      
      let buyerName = '';
      // Get buyer name if not a guest order
      if (!order.isGuestOrder && order.userId) {
        const userDoc = await db.collection('users').doc(order.userId).get();
        if (userDoc.exists) {
          buyerName = userDoc.data().displayName || userDoc.data().firstName || 
                      userDoc.data().lastName || email.split('@')[0];
        }
      }
      
      const details = {
        orderId,
        userId: order.userId || 'guest',
        isGuestOrder: order.isGuestOrder || false,
        buyerName,
        shippingAddress: order.shippingAddress || {},
        items: order.items || [],
        carrier: req.body.carrier,
        trackingNumber: req.body.trackingNumber,
        trackingUrl: req.body.trackingUrl,
        estimatedDelivery: req.body.estimatedDelivery
      };
      
      console.log(`Sending shipping notification email for order ${orderId} to ${email}`);
      const result = await emailService.sendShippingNotificationEmail(email, details);
      
      if (result.success) {
        return res.json({ success: true });
      } else {
        console.error('Error sending shipping notification email:', result.error);
        return res.status(500).json({ error: result.error });
      }
    } 
    // If shipping details were provided directly
    else if (shippingDetails) {
      console.log(`Sending shipping notification email to ${email} with provided details`);
      const result = await emailService.sendShippingNotificationEmail(email, shippingDetails);
      
      if (result.success) {
        return res.json({ success: true });
      } else {
        console.error('Error sending shipping notification email:', result.error);
        return res.status(500).json({ error: result.error });
      }
    } else {
      return res.status(400).json({ error: 'Missing shippingDetails or orderId' });
    }
  } catch (error) {
    console.error('Error in shipping notification email endpoint:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Send offer status update email
app.post('/send-offer-status-update', async (req, res) => {
  try {
    const { email, offerDetails, offerId } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    
    // If offerId is provided but not offer details, fetch the offer from Firestore
    if (offerId && !offerDetails) {
      console.log(`Fetching offer ${offerId} for status update email`);
      const offerDoc = await db.collection('offers').doc(offerId).get();
      
      if (!offerDoc.exists) {
        return res.status(404).json({ error: 'Offer not found' });
      }
      
      const offer = offerDoc.data();
      
      // Get buyer details
      let buyerName = '';
      if (offer.buyerId) {
        const buyerDoc = await db.collection('users').doc(offer.buyerId).get();
        if (buyerDoc.exists) {
          buyerName = buyerDoc.data().displayName || buyerDoc.data().firstName || 
                      buyerDoc.data().lastName || email.split('@')[0];
        }
      }
      
      // Get seller details
      let sellerName = 'Seller';
      if (offer.sellerId) {
        const sellerDoc = await db.collection('users').doc(offer.sellerId).get();
        if (sellerDoc.exists) {
          sellerName = sellerDoc.data().displayName || sellerDoc.data().firstName || 
                      sellerDoc.data().lastName || sellerDoc.data().sellerName || 'Seller';
        }
      }
      
      // Get listing details
      let listingTitle = 'the item';
      let listingImage = '';
      if (offer.listingId) {
        const listingDoc = await db.collection('tools').doc(offer.listingId).get();
        if (listingDoc.exists) {
          const listing = listingDoc.data();
          listingTitle = listing.name || listing.title || 'the item';
          listingImage = listing.images?.[0]?.url || listing.image;
        }
      }
      
      const details = {
        offerId,
        buyerId: offer.buyerId,
        buyerName,
        sellerName,
        listingId: offer.listingId,
        listingTitle,
        listingImage,
        offerAmount: offer.amount || offer.offerAmount,
        listingPrice: offer.listingPrice || offer.originalPrice,
        status: offer.status || req.body.status,
        message: req.body.message || offer.sellerMessage
      };
      
      console.log(`Sending offer status update email for offer ${offerId} to ${email}`);
      const result = await emailService.sendOfferStatusUpdateEmail(email, details);
      
      if (result.success) {
        return res.json({ success: true });
      } else {
        console.error('Error sending offer status update email:', result.error);
        return res.status(500).json({ error: result.error });
      }
    } 
    // If offer details were provided directly
    else if (offerDetails) {
      console.log(`Sending offer status update email to ${email} with provided details`);
      const result = await emailService.sendOfferStatusUpdateEmail(email, offerDetails);
      
      if (result.success) {
        return res.json({ success: true });
      } else {
        console.error('Error sending offer status update email:', result.error);
        return res.status(500).json({ error: result.error });
      }
    } else {
      return res.status(400).json({ error: 'Missing offerDetails or offerId' });
    }
  } catch (error) {
    console.error('Error in offer status update email endpoint:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Send review request email
app.post('/send-review-request', async (req, res) => {
  try {
    const { email, reviewDetails, orderId } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    
    // If orderId is provided but not review details, fetch the order from Firestore
    if (orderId && !reviewDetails) {
      console.log(`Fetching order ${orderId} for review request email`);
      const orderDoc = await db.collection('orders').doc(orderId).get();
      
      if (!orderDoc.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      const order = orderDoc.data();
      
      let buyerName = '';
      // Get buyer name if not a guest order
      if (!order.isGuestOrder && order.userId) {
        const buyerDoc = await db.collection('users').doc(order.userId).get();
        if (buyerDoc.exists) {
          buyerName = buyerDoc.data().displayName || buyerDoc.data().firstName || 
                      buyerDoc.data().lastName || email.split('@')[0];
        }
      }
      
      // Get item details from the order
      const itemName = order.items && order.items.length > 0 ? 
        (order.items[0].name || order.items[0].title) : 
        'your purchase';
      
      const itemImage = order.items && order.items.length > 0 ? 
        (order.items[0].imageUrl || order.items[0].image || order.items[0].images?.[0]?.url) : 
        null;
      
      // Format delivery date if available
      const deliveryDate = order.deliveredAt ? 
        new Date(order.deliveredAt.toDate ? order.deliveredAt.toDate() : order.deliveredAt).toLocaleDateString() : 
        'recently';
      
      const details = {
        orderId,
        userId: order.userId || 'guest',
        isGuestOrder: order.userId === 'guest',
        buyerName,
        itemName,
        itemImage,
        deliveryDate,
        reviewDaysLeft: 14 // Two weeks to leave a review
      };
      
      console.log(`Sending review request email for order ${orderId} to ${email}`);
      const result = await emailService.sendReviewRequestEmail(email, details);
      
      if (result.success) {
        // Mark that review request has been sent
        await db.collection('orders').doc(orderId).update({
          reviewRequestSent: true,
          reviewRequestSentAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        return res.json({ success: true });
      } else {
        console.error('Error sending review request email:', result.error);
        return res.status(500).json({ error: result.error });
      }
    } 
    // If review details were provided directly
    else if (reviewDetails) {
      console.log(`Sending review request email to ${email} with provided details`);
      const result = await emailService.sendReviewRequestEmail(email, reviewDetails);
      
      if (result.success) {
        return res.json({ success: true });
      } else {
        console.error('Error sending review request email:', result.error);
        return res.status(500).json({ error: result.error });
      }
    } else {
      return res.status(400).json({ error: 'Missing reviewDetails or orderId' });
    }
  } catch (error) {
    console.error('Error in review request email endpoint:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Send listing expiration reminder email
app.post('/send-listing-expiration-reminder', async (req, res) => {
  try {
    const { email, listingDetails, listingId } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    
    // If listingId is provided but not listing details, fetch the listing from Firestore
    if (listingId && !listingDetails) {
      console.log(`Fetching listing ${listingId} for expiration reminder email`);
      const listingDoc = await db.collection('tools').doc(listingId).get();
      
      if (!listingDoc.exists) {
        return res.status(404).json({ error: 'Listing not found' });
      }
      
      const listing = listingDoc.data();
      const sellerId = listing.userId || listing.sellerId;
      
      // Get seller details
      let sellerName = '';
      if (sellerId) {
        const sellerDoc = await db.collection('users').doc(sellerId).get();
        if (sellerDoc.exists) {
          sellerName = sellerDoc.data().displayName || sellerDoc.data().firstName || 
                      sellerDoc.data().lastName || sellerDoc.data().sellerName || email.split('@')[0];
        }
      }
      
      // Format expiration date if available
      const expirationDate = listing.expiresAt ? 
        new Date(listing.expiresAt.toDate ? listing.expiresAt.toDate() : listing.expiresAt).toLocaleDateString() : 
        'soon';
      
      // Format listing date if available
      const listingDate = listing.createdAt ? 
        new Date(listing.createdAt.toDate ? listing.createdAt.toDate() : listing.createdAt).toLocaleDateString() : 
        'recently';
      
      const details = {
        sellerId,
        sellerName,
        listingId,
        itemName: listing.name || listing.title,
        expirationDate,
        price: listing.price,
        itemImage: listing.images?.[0]?.url || listing.image,
        listingDate,
        viewCount: listing.viewCount || 0,
        watchCount: listing.watchCount || 0,
        offerCount: listing.offerCount || 0
      };
      
      console.log(`Sending listing expiration reminder email for listing ${listingId} to ${email}`);
      const result = await emailService.sendListingExpirationReminderEmail(email, details);
      
      if (result.success) {
        return res.json({ success: true });
      } else {
        console.error('Error sending listing expiration reminder email:', result.error);
        return res.status(500).json({ error: result.error });
      }
    } 
    // If listing details were provided directly
    else if (listingDetails) {
      console.log(`Sending listing expiration reminder email to ${email} with provided details`);
      const result = await emailService.sendListingExpirationReminderEmail(email, listingDetails);
      
      if (result.success) {
        return res.json({ success: true });
      } else {
        console.error('Error sending listing expiration reminder email:', result.error);
        return res.status(500).json({ error: result.error });
      }
    } else {
      return res.status(400).json({ error: 'Missing listingDetails or listingId' });
    }
  } catch (error) {
    console.error('Error in listing expiration reminder email endpoint:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Send shipping reminder email
app.post('/send-shipping-reminder', async (req, res) => {
  try {
    const { email, reminderDetails, orderId } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    
    // If orderId is provided but not reminder details, fetch the order from Firestore
    if (orderId && !reminderDetails) {
      console.log(`Fetching order ${orderId} for shipping reminder email`);
      const orderDoc = await db.collection('orders').doc(orderId).get();
      
      if (!orderDoc.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      const order = orderDoc.data();
      
      // Determine seller(s) with items in the order
      const sellerIds = new Set();
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          if (item.sellerId) {
            sellerIds.add(item.sellerId);
          }
        }
      }
      
      if (sellerIds.size === 0) {
        return res.status(400).json({ error: 'No sellers found for this order' });
      }
      
      // For simplicity, we'll only support sending to a single seller at a time
      const sellerId = email ? email : Array.from(sellerIds)[0];
      
      // Get seller details if email is a seller ID
      let sellerEmail = email;
      let sellerName = '';
      
      if (email.includes('@')) {
        // Email is provided directly
        sellerEmail = email;
      } else {
        // Email is a seller ID, get their email
        const sellerDoc = await db.collection('users').doc(email).get();
        
        if (!sellerDoc.exists) {
          return res.status(404).json({ error: 'Seller not found' });
        }
        
        sellerEmail = sellerDoc.data().email || sellerDoc.data().contactEmail;
        sellerName = sellerDoc.data().displayName || sellerDoc.data().firstName || 
                    sellerDoc.data().lastName || sellerDoc.data().sellerName;
        
        if (!sellerEmail) {
          return res.status(400).json({ error: 'Seller has no email address' });
        }
      }
      
      // Get buyer details
      let buyerName = 'Customer';
      if (order.userId && order.userId !== 'guest') {
        const buyerDoc = await db.collection('users').doc(order.userId).get();
        if (buyerDoc.exists) {
          buyerName = buyerDoc.data().displayName || buyerDoc.data().firstName || 
                      order.userEmail?.split('@')[0] || 'Customer';
        }
      } else if (order.userEmail) {
        buyerName = order.userEmail.split('@')[0];
      }
      
      // Format order date
      const orderDate = order.createdAt ? 
        new Date(order.createdAt.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleDateString() : 
        'recently';
      
      // Calculate days since order
      const now = new Date();
      const orderCreatedAt = order.createdAt ? 
        new Date(order.createdAt.toDate ? order.createdAt.toDate() : order.createdAt) : 
        new Date(now - 86400000 * 2); // Default to 2 days ago
      
      const daysSinceOrder = Math.floor((now - orderCreatedAt) / (1000 * 60 * 60 * 24));
      
      // Find an item from this seller
      let itemName = 'ordered item';
      if (order.items && order.items.length > 0) {
        const sellerItem = order.items.find(item => item.sellerId === sellerId);
        if (sellerItem) {
          itemName = sellerItem.name || sellerItem.title || 'ordered item';
        }
      }
      
      const details = {
        sellerId,
        sellerName,
        orderId,
        orderDate,
        daysSinceOrder,
        buyerName,
        itemName,
        shippingCutOff: '3 days'
      };
      
      console.log(`Sending shipping reminder email for order ${orderId} to ${sellerEmail}`);
      const result = await emailService.sendShippingReminderEmail(sellerEmail, details);
      
      if (result.success) {
        return res.json({ success: true });
      } else {
        console.error('Error sending shipping reminder email:', result.error);
        return res.status(500).json({ error: result.error });
      }
    } 
    // If reminder details were provided directly
    else if (reminderDetails) {
      console.log(`Sending shipping reminder email to ${email} with provided details`);
      const result = await emailService.sendShippingReminderEmail(email, reminderDetails);
      
      if (result.success) {
        return res.json({ success: true });
      } else {
        console.error('Error sending shipping reminder email:', result.error);
        return res.status(500).json({ error: result.error });
      }
    } else {
      return res.status(400).json({ error: 'Missing reminderDetails or orderId' });
    }
  } catch (error) {
    console.error('Error in shipping reminder email endpoint:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Send payout notification email
app.post('/send-payout-notification', async (req, res) => {
  try {
    const { email, payoutDetails, payoutId } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    
    // If payoutId is provided but not payout details, fetch the payout from Stripe
    if (payoutId && !payoutDetails) {
      console.log(`Fetching payout ${payoutId} from Stripe`);
      try {
        const payout = await stripe.payouts.retrieve(payoutId);
        
        if (!payout) {
          return res.status(404).json({ error: 'Payout not found' });
        }
        
        // Get seller details if available
        let sellerId = '';
        let sellerName = '';
        
        if (payout.metadata && payout.metadata.sellerId) {
          sellerId = payout.metadata.sellerId;
          
          const sellerDoc = await db.collection('users').doc(sellerId).get();
          if (sellerDoc.exists) {
            sellerName = sellerDoc.data().displayName || sellerDoc.data().firstName || 
                          sellerDoc.data().lastName || sellerDoc.data().sellerName || email.split('@')[0];
          }
        }
        
        const details = {
          sellerId,
          sellerName,
          amount: payout.amount / 100, // Convert from cents to dollars
          created: payout.created,
          arrival_date: payout.arrival_date,
          bankLast4: payout.destination ? payout.destination.slice(-4) : '****',
          orderCount: payout.metadata?.orderCount || 1,
          transactionId: payout.id
        };
        
        console.log(`Sending payout notification email for payout ${payoutId} to ${email}`);
        const result = await emailService.sendPayoutNotificationEmail(email, details);
        
        if (result.success) {
          return res.json({ success: true });
        } else {
          console.error('Error sending payout notification email:', result.error);
          return res.status(500).json({ error: result.error });
        }
      } catch (stripeError) {
        console.error('Error retrieving payout from Stripe:', stripeError);
        return res.status(500).json({ error: stripeError.message });
      }
    } 
    // If payout details were provided directly
    else if (payoutDetails) {
      console.log(`Sending payout notification email to ${email} with provided details`);
      const result = await emailService.sendPayoutNotificationEmail(email, payoutDetails);
      
      if (result.success) {
        return res.json({ success: true });
      } else {
        console.error('Error sending payout notification email:', result.error);
        return res.status(500).json({ error: result.error });
      }
    } else {
      return res.status(400).json({ error: 'Missing payoutDetails or payoutId' });
    }
  } catch (error) {
    console.error('Error in payout notification email endpoint:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Send monthly sales summary email
app.post('/send-monthly-sales-summary', async (req, res) => {
  try {
    const { email, summaryDetails, sellerId, month, year } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    
    // If sellerId, month, and year are provided but not summary details, 
    // generate the summary data
    if (sellerId && month && year && !summaryDetails) {
      console.log(`Generating sales summary for seller ${sellerId} for ${month}/${year}`);
      try {
        // Get seller details
        const sellerDoc = await db.collection('users').doc(sellerId).get();
        
        if (!sellerDoc.exists) {
          return res.status(404).json({ error: 'Seller not found' });
        }
        
        const seller = sellerDoc.data();
        const sellerName = seller.displayName || seller.firstName || 
                          seller.lastName || seller.sellerName || email.split('@')[0];
        
        // Set date range for the specified month
        const startDate = new Date(year, month - 1, 1); // Month is 0-indexed in JS Date
        const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month
        
        // Get month name
        const monthName = startDate.toLocaleString('default', { month: 'long' });
        
        // Get orders for this seller in the specified month
        const ordersSnapshot = await db.collection('orders')
          .where('items', 'array-contains', { sellerId: sellerId })
          .where('createdAt', '>=', startDate)
          .where('createdAt', '<=', endDate)
          .where('status', 'in', ['paid', 'shipped', 'delivered', 'completed'])
          .get();
        
        console.log(`Found ${ordersSnapshot.docs.length} orders for seller ${sellerId} in ${monthName}`);
        
        // Calculate sales metrics
        let totalSales = 0;
        let totalFees = 0;
        const soldItems = [];
        const itemSalesCount = {};
        
        for (const orderDoc of ordersSnapshot.docs) {
          const order = orderDoc.data();
          
          // Find this seller's items in the order
          for (const item of order.items) {
            if (item.sellerId === sellerId) {
              const itemTotal = (item.price * (item.quantity || 1));
              totalSales += itemTotal;
              totalFees += (itemTotal * 0.05); // 5% platform fee
              
              soldItems.push(item);
              
              // Track item sales for finding top performing item
              const itemId = item.id || item.itemId;
              if (itemId) {
                if (!itemSalesCount[itemId]) {
                  itemSalesCount[itemId] = {
                    count: 0,
                    revenue: 0,
                    name: item.name || item.title
                  };
                }
                
                itemSalesCount[itemId].count += (item.quantity || 1);
                itemSalesCount[itemId].revenue += itemTotal;
              }
            }
          }
        }
        
        // Calculate net earnings
        const netEarnings = totalSales - totalFees;
        
        // Determine top performing item
        let topPerformingItem = 'None';
        let maxRevenue = 0;
        
        for (const itemId in itemSalesCount) {
          if (itemSalesCount[itemId].revenue > maxRevenue) {
            maxRevenue = itemSalesCount[itemId].revenue;
            topPerformingItem = itemSalesCount[itemId].name;
          }
        }
        
        // Get view statistics (placeholder method)
        const viewsCount = await getViewsCount(sellerId, startDate, endDate);
        
        const details = {
          sellerId,
          sellerName,
          monthName,
          year,
          totalSales,
          totalFees,
          netEarnings,
          orderCount: ordersSnapshot.docs.length,
          viewsCount,
          topPerformingItem
        };
        
        console.log(`Sending monthly sales summary email for ${monthName} ${year} to ${email}`);
        const result = await emailService.sendMonthlySalesSummaryEmail(email, details);
        
        if (result.success) {
          return res.json({ success: true });
        } else {
          console.error('Error sending monthly sales summary email:', result.error);
          return res.status(500).json({ error: result.error });
        }
      } catch (error) {
        console.error('Error generating sales summary:', error);
        return res.status(500).json({ error: error.message });
      }
    } 
    // If summary details were provided directly
    else if (summaryDetails) {
      console.log(`Sending monthly sales summary email to ${email} with provided details`);
      const result = await emailService.sendMonthlySalesSummaryEmail(email, summaryDetails);
      
      if (result.success) {
        return res.json({ success: true });
      } else {
        console.error('Error sending monthly sales summary email:', result.error);
        return res.status(500).json({ error: result.error });
      }
    } else {
      return res.status(400).json({ error: 'Missing summaryDetails or sellerId/month/year' });
    }
  } catch (error) {
    console.error('Error in monthly sales summary email endpoint:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Update a Stripe Connect account with required information
 * This helps fix restricted accounts that are missing required fields
 * Added: Now supports fixing first_name, last_name, and business_profile.url
 */
app.post('/update-connect-account', async (req, res) => {
  try {
    const { 
      userId, 
      firstName, 
      lastName,
      websiteUrl
    } = req.body;
    
    console.log(`Updating connected account for user ${userId}`);
    
    if (!userId) {
      console.log('Missing userId');
      return res.status(400).json({ error: 'Missing userId' });
    }
    
    // Get user's Stripe account ID from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log(`User ${userId} not found`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    if (!userData.stripeAccountId) {
      console.log(`User ${userId} does not have a Stripe account`);
      return res.status(400).json({ error: 'User does not have a Stripe account' });
    }
    
    // Create update parameters
    const updateParams = {};
    
    if (userData.sellerType === 'individual') {
      updateParams.individual = {};
      
      // Add first and last name if provided
      if (firstName) {
        updateParams.individual.first_name = firstName;
      }
      
      if (lastName) {
        updateParams.individual.last_name = lastName;
      }
    }
    
    // Add business profile URL - use a placeholder Benchlot URL if not provided
    const effectiveUrl = websiteUrl || `https://benchlot.com/sellers/${userId}`;
    updateParams.business_profile = {
      url: effectiveUrl
    };
    
    console.log(`Updating Stripe account ${userData.stripeAccountId} with:`, JSON.stringify(updateParams, null, 2));
    
    // Update the Stripe account
    const updatedAccount = await stripe.accounts.update(userData.stripeAccountId, updateParams);
    
    console.log(`Stripe account updated successfully:`, {
      id: updatedAccount.id,
      requirements: updatedAccount.requirements?.currently_due || []
    });
    
    // Update user record in Firestore with updated Stripe status
    const userUpdates = {
      firstName: firstName || userData.firstName,
      lastName: lastName || userData.lastName,
      lastStatusUpdate: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('users').doc(userId).update(userUpdates);
    console.log(`User ${userId} updated with first/last name`);
    
    res.json({ 
      success: true, 
      requirements: updatedAccount.requirements?.currently_due || []
    });
  } catch (error) {
    console.error('Error updating connected account:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Payment Method Management Endpoints
 * 
 * These endpoints handle customer creation, payment method management,
 * and the SetupIntent API for saving payment methods without making a payment.
 */

/**
 * Create a new Stripe customer or return an existing one
 */
app.post('/create-customer', async (req, res) => {
  try {
    const { userId, email, name } = req.body;
    
    if (!userId || !email) {
      return res.status(400).json({ error: 'Missing userId or email' });
    }
    
    console.log(`Creating/retrieving customer for user ${userId} with email ${email}`);
    
    // First, check if the user already has a Stripe customer ID in Firestore
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists && userDoc.data().stripeCustomerId) {
        console.log(`User ${userId} already has a Stripe customer: ${userDoc.data().stripeCustomerId}`);
        
        // Check if the customer still exists in Stripe
        try {
          const customer = await stripe.customers.retrieve(userDoc.data().stripeCustomerId);
          
          if (customer && !customer.deleted) {
            console.log(`Found existing Stripe customer: ${customer.id}`);
            return res.json({ customerId: customer.id });
          }
        } catch (stripeError) {
          console.error(`Error retrieving customer from Stripe: ${stripeError.message}`);
          // If the customer doesn't exist in Stripe, we'll create a new one below
        }
      }
    } catch (firestoreError) {
      console.error(`Error checking user in Firestore: ${firestoreError.message}`);
      // Continue with creating a new customer
    }
    
    // Create a new customer in Stripe
    const customer = await stripe.customers.create({
      email,
      name: name || email.split('@')[0],
      metadata: {
        userId,
        firestoreId: userId
      }
    });
    
    console.log(`Created new Stripe customer: ${customer.id}`);
    
    // Update the user record in Firestore with the Stripe customer ID
    await db.collection('users').doc(userId).update({
      stripeCustomerId: customer.id,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ customerId: customer.id });
  } catch (error) {
    console.error('Error creating/retrieving customer:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create a SetupIntent for saving a payment method
 */
app.post('/create-setup-intent', async (req, res) => {
  try {
    const { customerId } = req.body;
    
    if (!customerId) {
      return res.status(400).json({ error: 'Missing customerId' });
    }
    
    console.log(`Creating SetupIntent for customer ${customerId}`);
    
    // Create a SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session' // Allow the payment method to be used for future off-session payments
    });
    
    console.log(`Created SetupIntent: ${setupIntent.id}`);
    
    res.json({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    console.error('Error creating SetupIntent:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all payment methods for a customer
 */
app.post('/get-payment-methods', async (req, res) => {
  try {
    const { customerId } = req.body;
    
    if (!customerId) {
      return res.status(400).json({ error: 'Missing customerId' });
    }
    
    console.log(`Getting payment methods for customer ${customerId}`);
    
    // Get all payment methods for the customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    });
    
    console.log(`Found ${paymentMethods.data.length} payment methods`);
    
    // Get the customer to check for default payment method
    const customer = await stripe.customers.retrieve(customerId);
    const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;
    
    // Mark default payment method
    const formattedPaymentMethods = paymentMethods.data.map(method => ({
      ...method,
      isDefault: method.id === defaultPaymentMethodId
    }));
    
    res.json({ paymentMethods: formattedPaymentMethods });
  } catch (error) {
    console.error('Error getting payment methods:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update a payment method (set as default or update metadata)
 */
app.post('/update-payment-method', async (req, res) => {
  try {
    const { customerId, paymentMethodId, isDefault, nickname } = req.body;
    
    if (!customerId || !paymentMethodId) {
      return res.status(400).json({ error: 'Missing customerId or paymentMethodId' });
    }
    
    console.log(`Updating payment method ${paymentMethodId} for customer ${customerId}`);
    console.log(`isDefault: ${isDefault}, nickname: ${nickname}`);
    
    // Update payment method metadata if a nickname is provided
    if (nickname) {
      await stripe.paymentMethods.update(paymentMethodId, {
        metadata: {
          nickname
        }
      });
      console.log(`Updated payment method metadata with nickname: ${nickname}`);
    }
    
    // Set as default payment method if requested
    if (isDefault) {
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });
      console.log(`Set payment method ${paymentMethodId} as default for customer ${customerId}`);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating payment method:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Detach a payment method from a customer
 */
app.post('/detach-payment-method', async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    
    if (!paymentMethodId) {
      return res.status(400).json({ error: 'Missing paymentMethodId' });
    }
    
    console.log(`Detaching payment method ${paymentMethodId}`);
    
    // Retrieve the payment method to get the customer ID
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    const customerId = paymentMethod.customer;
    
    // Detach the payment method
    const detachedPaymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
    console.log(`Detached payment method ${detachedPaymentMethod.id}`);
    
    // Check if this was the default payment method
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        
        // If this was the default payment method, try to set a new default
        if (customer.invoice_settings?.default_payment_method === paymentMethodId) {
          console.log(`Detached payment method was the default, finding a new default...`);
          
          // Get remaining payment methods
          const paymentMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: 'card'
          });
          
          if (paymentMethods.data.length > 0) {
            // Set the first remaining payment method as default
            await stripe.customers.update(customerId, {
              invoice_settings: {
                default_payment_method: paymentMethods.data[0].id
              }
            });
            console.log(`Set new default payment method: ${paymentMethods.data[0].id}`);
          } else {
            console.log(`No remaining payment methods to set as default`);
          }
        }
      } catch (customerError) {
        console.error(`Error updating customer after detaching payment method: ${customerError.message}`);
        // Continue with the response even if this fails
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error detaching payment method:', error);
    res.status(500).json({ error: error.message });
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

/**
 * Scheduled Functions for email notifications
 */

// Send listing expiration reminders (Daily at 9 AM)
exports.sendListingExpirationReminders = functions.pubsub
  .schedule('0 9 * * *')
  .onRun(async (context) => {
    console.log('Running scheduled listing expiration reminders');
    
    try {
      // Get listings expiring in 3 days
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      
      // Format date to end of day
      threeDaysFromNow.setHours(23, 59, 59, 999);
      
      // Get listings that expire within the next 3 days
      const listingsSnapshot = await db.collection('tools')
        .where('status', '==', 'active')
        .where('expiresAt', '<=', threeDaysFromNow)
        .limit(100) // Process in batches
        .get();
      
      console.log(`Found ${listingsSnapshot.docs.length} listings expiring soon`);
      
      // Send notifications for each listing
      for (const doc of listingsSnapshot.docs) {
        const listing = doc.data();
        const sellerId = listing.userId || listing.sellerId;
        
        if (!sellerId) {
          console.log(`Listing ${doc.id} has no seller ID, skipping`);
          continue;
        }
        
        try {
          // Get seller details
          const sellerDoc = await db.collection('users').doc(sellerId).get();
          
          if (!sellerDoc.exists) {
            console.log(`Seller ${sellerId} not found, skipping`);
            continue;
          }
          
          const seller = sellerDoc.data();
          const sellerEmail = seller.email || seller.contactEmail;
          
          if (!sellerEmail) {
            console.log(`Seller ${sellerId} has no email, skipping`);
            continue;
          }
          
          // Format expiration date
          const expirationDate = listing.expiresAt ? 
            new Date(listing.expiresAt.toDate ? listing.expiresAt.toDate() : listing.expiresAt).toLocaleDateString() : 
            'soon';
          
          // Format listing date
          const listingDate = listing.createdAt ? 
            new Date(listing.createdAt.toDate ? listing.createdAt.toDate() : listing.createdAt).toLocaleDateString() : 
            'recently';
          
          // Send email notification
          const emailResult = await emailService.sendListingExpirationReminderEmail(
            sellerEmail,
            {
              sellerId,
              sellerName: seller.displayName || seller.firstName || seller.sellerName,
              listingId: doc.id,
              itemName: listing.name || listing.title,
              expirationDate,
              price: listing.price,
              itemImage: listing.images?.[0]?.url || listing.image,
              listingDate,
              viewCount: listing.viewCount || 0,
              watchCount: listing.watchCount || 0,
              offerCount: listing.offerCount || 0
            }
          );
          
          console.log(`Expiration reminder email for listing ${doc.id} sent to ${sellerEmail}: ${emailResult.success ? 'Success' : 'Failed'}`);
          
          // Add a small delay to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (sellerError) {
          console.error(`Error processing seller ${sellerId} for listing ${doc.id}:`, sellerError);
          continue;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error sending listing expiration reminders:', error);
      return null;
    }
  });

// Send shipping reminders to sellers (Daily at 10 AM)
exports.sendShippingReminders = functions.pubsub
  .schedule('0 10 * * *')
  .onRun(async (context) => {
    console.log('Running scheduled shipping reminders');
    
    try {
      // Get orders that are 2 days old and not shipped yet
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      // Format date to beginning of day
      twoDaysAgo.setHours(0, 0, 0, 0);
      
      // Get orders that were placed 2 days ago and are still in 'paid' status
      const ordersSnapshot = await db.collection('orders')
        .where('status', '==', 'paid')
        .where('createdAt', '<=', twoDaysAgo)
        .limit(100) // Process in batches
        .get();
      
      console.log(`Found ${ordersSnapshot.docs.length} unshipped orders from 2+ days ago`);
      
      // Send reminders for each order
      for (const doc of ordersSnapshot.docs) {
        const order = doc.data();
        
        // Skip if no items
        if (!order.items || order.items.length === 0) {
          console.log(`Order ${doc.id} has no items, skipping`);
          continue;
        }
        
        // Process each seller's items in the order
        const sellerItems = {};
        
        // Group items by seller
        for (const item of order.items) {
          const sellerId = item.sellerId || item.userId;
          
          if (!sellerId) {
            console.log(`Item ${item.id} in order ${doc.id} has no seller ID, skipping`);
            continue;
          }
          
          if (!sellerItems[sellerId]) {
            sellerItems[sellerId] = [];
          }
          
          sellerItems[sellerId].push(item);
        }
        
        // Process each seller
        for (const sellerId in sellerItems) {
          try {
            // Get seller details
            const sellerDoc = await db.collection('users').doc(sellerId).get();
            
            if (!sellerDoc.exists) {
              console.log(`Seller ${sellerId} not found, skipping`);
              continue;
            }
            
            const seller = sellerDoc.data();
            const sellerEmail = seller.email || seller.contactEmail;
            
            if (!sellerEmail) {
              console.log(`Seller ${sellerId} has no email, skipping`);
              continue;
            }
            
            // Get buyer details
            let buyerName = 'Customer';
            if (order.userId && order.userId !== 'guest') {
              const buyerDoc = await db.collection('users').doc(order.userId).get();
              if (buyerDoc.exists) {
                const buyer = buyerDoc.data();
                buyerName = buyer.displayName || buyer.firstName || order.userEmail?.split('@')[0] || 'Customer';
              }
            } else if (order.userEmail) {
              buyerName = order.userEmail.split('@')[0];
            }
            
            // Format order date
            const orderDate = order.createdAt ? 
              new Date(order.createdAt.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleDateString() : 
              'recently';
            
            // Calculate days since order
            const now = new Date();
            const orderCreatedAt = order.createdAt ? 
              new Date(order.createdAt.toDate ? order.createdAt.toDate() : order.createdAt) : 
              new Date(now - 86400000 * 2); // Default to 2 days ago
            
            const daysSinceOrder = Math.floor((now - orderCreatedAt) / (1000 * 60 * 60 * 24));
            
            // Send shipping reminder email
            const emailResult = await emailService.sendShippingReminderEmail(
              sellerEmail,
              {
                sellerId,
                sellerName: seller.displayName || seller.firstName || seller.sellerName,
                orderId: doc.id,
                orderDate,
                daysSinceOrder,
                buyerName,
                itemName: sellerItems[sellerId][0].name || sellerItems[sellerId][0].title || 'ordered item',
                shippingCutOff: '3 days'
              }
            );
            
            console.log(`Shipping reminder email for order ${doc.id} sent to seller ${sellerId} (${sellerEmail}): ${emailResult.success ? 'Success' : 'Failed'}`);
            
            // Add a small delay to prevent rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } catch (sellerError) {
            console.error(`Error processing seller ${sellerId} for order ${doc.id}:`, sellerError);
            continue;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error sending shipping reminders:', error);
      return null;
    }
  });

// Send review request emails (Daily at 11 AM, for items delivered 3 days ago)
exports.sendReviewRequests = functions.pubsub
  .schedule('0 11 * * *')
  .onRun(async (context) => {
    console.log('Running scheduled review request emails');
    
    try {
      // Get orders that were delivered 3 days ago
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      // Format date to beginning of day
      threeDaysAgo.setHours(0, 0, 0, 0);
      
      const dayAfterThreeDaysAgo = new Date(threeDaysAgo);
      dayAfterThreeDaysAgo.setDate(dayAfterThreeDaysAgo.getDate() + 1);
      
      // Get orders that were marked as delivered around 3 days ago
      const ordersSnapshot = await db.collection('orders')
        .where('status', '==', 'delivered')
        .where('deliveredAt', '>=', threeDaysAgo)
        .where('deliveredAt', '<', dayAfterThreeDaysAgo)
        .limit(100) // Process in batches
        .get();
      
      console.log(`Found ${ordersSnapshot.docs.length} orders delivered 3 days ago`);
      
      // Send review requests for each order
      for (const doc of ordersSnapshot.docs) {
        const order = doc.data();
        
        // Skip guest orders if no email
        if (order.userId === 'guest' && !order.userEmail) {
          console.log(`Guest order ${doc.id} has no email, skipping`);
          continue;
        }
        
        try {
          // Get buyer details and email
          let buyerEmail = order.userEmail;
          let buyerName = 'Customer';
          
          if (order.userId && order.userId !== 'guest') {
            const buyerDoc = await db.collection('users').doc(order.userId).get();
            if (buyerDoc.exists) {
              const buyer = buyerDoc.data();
              buyerEmail = buyer.email || order.userEmail;
              buyerName = buyer.displayName || buyer.firstName || buyerEmail?.split('@')[0] || 'Customer';
            }
          } else if (order.userEmail) {
            buyerName = order.userEmail.split('@')[0];
          }
          
          if (!buyerEmail) {
            console.log(`Order ${doc.id} has no buyer email, skipping`);
            continue;
          }
          
          // Get item details
          const itemName = order.items && order.items.length > 0 ? 
            (order.items[0].name || order.items[0].title) : 
            'your purchase';
          
          const itemImage = order.items && order.items.length > 0 ? 
            (order.items[0].imageUrl || order.items[0].image || order.items[0].images?.[0]?.url) : 
            null;
          
          // Format delivery date
          const deliveryDate = order.deliveredAt ? 
            new Date(order.deliveredAt.toDate ? order.deliveredAt.toDate() : order.deliveredAt).toLocaleDateString() : 
            'recently';
          
          // Send review request email
          const emailResult = await emailService.sendReviewRequestEmail(
            buyerEmail,
            {
              userId: order.userId,
              isGuestOrder: order.userId === 'guest',
              buyerName,
              orderId: doc.id,
              itemName,
              itemImage,
              deliveryDate,
              reviewDaysLeft: 14 // Two weeks to leave a review
            }
          );
          
          console.log(`Review request email for order ${doc.id} sent to ${buyerEmail}: ${emailResult.success ? 'Success' : 'Failed'}`);
          
          // Mark that review request has been sent
          await db.collection('orders').doc(doc.id).update({
            reviewRequestSent: true,
            reviewRequestSentAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          // Add a small delay to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (orderError) {
          console.error(`Error processing review request for order ${doc.id}:`, orderError);
          continue;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error sending review requests:', error);
      return null;
    }
  });

// Send monthly sales summary to sellers (1st day of each month at 5 AM)
exports.sendMonthlySalesSummaries = functions.pubsub
  .schedule('0 5 1 * *')
  .onRun(async (context) => {
    console.log('Running scheduled monthly sales summary emails');
    
    try {
      // Get the previous month details
      const now = new Date();
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      
      const monthName = previousMonth.toLocaleString('default', { month: 'long' });
      const year = previousMonth.getFullYear();
      
      console.log(`Generating sales summaries for ${monthName} ${year}`);
      
      // Get all sellers
      const sellersSnapshot = await db.collection('users')
        .where('isSeller', '==', true)
        .limit(500) // Process in batches
        .get();
      
      console.log(`Found ${sellersSnapshot.docs.length} sellers to process`);
      
      // Process each seller
      for (const sellerDoc of sellersSnapshot.docs) {
        const sellerId = sellerDoc.id;
        const seller = sellerDoc.data();
        
        try {
          const sellerEmail = seller.email || seller.contactEmail;
          
          if (!sellerEmail) {
            console.log(`Seller ${sellerId} has no email, skipping`);
            continue;
          }
          
          // Get completed orders for this seller in the previous month
          const ordersSnapshot = await db.collection('orders')
            .where('items', 'array-contains', { sellerId: sellerId })
            .where('createdAt', '>=', previousMonth)
            .where('createdAt', '<=', previousMonthEnd)
            .where('status', 'in', ['paid', 'shipped', 'delivered', 'completed'])
            .get();
          
          console.log(`Found ${ordersSnapshot.docs.length} orders for seller ${sellerId} in ${monthName}`);
          
          // Skip if no orders
          if (ordersSnapshot.docs.length === 0) {
            console.log(`No orders for seller ${sellerId} in ${monthName}, skipping`);
            continue;
          }
          
          // Calculate total sales, fees, and other metrics
          let totalSales = 0;
          let totalFees = 0;
          const soldItems = [];
          const itemSalesCount = {};
          
          for (const orderDoc of ordersSnapshot.docs) {
            const order = orderDoc.data();
            
            // Find this seller's items in the order
            for (const item of order.items) {
              if (item.sellerId === sellerId) {
                const itemTotal = (item.price * (item.quantity || 1));
                totalSales += itemTotal;
                totalFees += (itemTotal * 0.05); // 5% platform fee
                
                soldItems.push(item);
                
                // Track item sales for finding top performing item
                const itemId = item.id || item.itemId;
                if (itemId) {
                  if (!itemSalesCount[itemId]) {
                    itemSalesCount[itemId] = {
                      count: 0,
                      revenue: 0,
                      name: item.name || item.title
                    };
                  }
                  
                  itemSalesCount[itemId].count += (item.quantity || 1);
                  itemSalesCount[itemId].revenue += itemTotal;
                }
              }
            }
          }
          
          // Calculate net earnings
          const netEarnings = totalSales - totalFees;
          
          // Determine top performing item
          let topPerformingItem = 'None';
          let maxRevenue = 0;
          
          for (const itemId in itemSalesCount) {
            if (itemSalesCount[itemId].revenue > maxRevenue) {
              maxRevenue = itemSalesCount[itemId].revenue;
              topPerformingItem = itemSalesCount[itemId].name;
            }
          }
          
          // Get view statistics (if you track this data)
          const viewsCount = await getViewsCount(sellerId, previousMonth, previousMonthEnd);
          
          // Send monthly sales summary email
          const emailResult = await emailService.sendMonthlySalesSummaryEmail(
            sellerEmail,
            {
              sellerId,
              sellerName: seller.displayName || seller.firstName || seller.sellerName,
              monthName,
              year,
              totalSales,
              totalFees,
              netEarnings,
              orderCount: ordersSnapshot.docs.length,
              viewsCount,
              topPerformingItem
            }
          );
          
          console.log(`Monthly sales summary for ${monthName} ${year} sent to ${sellerEmail}: ${emailResult.success ? 'Success' : 'Failed'}`);
          
          // Add a small delay to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (sellerError) {
          console.error(`Error processing monthly summary for seller ${sellerId}:`, sellerError);
          continue;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error sending monthly sales summaries:', error);
      return null;
    }
  });

/**
 * Helper function to get views count for a seller's listings
 */
async function getViewsCount(sellerId, startDate, endDate) {
  try {
    // Get all listings for this seller
    const listingsSnapshot = await db.collection('tools')
      .where('userId', '==', sellerId)
      .get();
    
    // If we track views in a separate collection, we could query it here
    // For now, return a placeholder count based on number of listings
    return listingsSnapshot.docs.length * 10; // Placeholder value
  } catch (error) {
    console.error(`Error getting views count for seller ${sellerId}:`, error);
    return 0;
  }
}