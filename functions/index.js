/**
 * Firebase Functions for Benchlot
 * Handles Stripe integration, payment processing, and email notifications
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const rateLimit = require('express-rate-limit');
const allowedOrigins = [
  'https://benchlot.com',
  'https://www.benchlot.com',
  'https://benchlot-6d64e.web.app',
  'https://benchlot-6d64e.firebaseapp.com',
  'http://localhost:3000',
];
const cors = require('cors')({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, server-to-server, Stripe webhooks)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
});

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
    return process.env[envVarName];
  }

  // Fall back to default
  return defaultValue;
};

// Initialize Firebase Admin with explicit service account credentials
try {
  const serviceAccount = require('./service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error('Error initializing with service account, falling back to default:', error);
  // Fall back to default credentials
  admin.initializeApp();
}

const db = admin.firestore();

// Import the new Resend-based email module (replaces emailService.js)
const { sendEmail } = require('./email');

/**
 * Format a Stripe shipping address object into a multi-line string.
 * Returns '' if no usable fields.
 */
function formatShippingAddressString(addr) {
  if (!addr || typeof addr !== 'object') return '';
  const lines = [];
  if (addr.name) lines.push(addr.name);
  if (addr.line1) lines.push(addr.line1);
  if (addr.line2) lines.push(addr.line2);
  const cityLine = [addr.city, addr.state, addr.postal_code].filter(Boolean).join(', ');
  if (cityLine) lines.push(cityLine);
  if (addr.country && addr.country !== 'US') lines.push(addr.country);
  return lines.join('\n');
}

/**
 * Format a numeric value as a USD price string.
 */
function formatPriceUsd(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string' && value.startsWith('$')) return value;
  const n = typeof value === 'number' ? value : parseFloat(value);
  if (Number.isNaN(n)) return '';
  return `$${n.toFixed(2)}`;
}

/**
 * Pull a usable image URL from a cart item, regardless of which legacy
 * field it lives in.
 */
function imageUrlFromItem(item) {
  if (!item) return '';
  if (item.imageUrl) return item.imageUrl;
  if (item.image) return item.image;
  if (Array.isArray(item.images) && item.images[0]?.url) return item.images[0].url;
  return '';
}

/**
 * Send Template 5 (buyer order confirmation) and one Template 6 per seller
 * (new-order notification) for a freshly created order.
 *
 * Failures of individual sends are logged but never rethrown — order creation
 * has already succeeded by the time this is called.
 *
 * @param {Object} opts
 * @param {string} opts.orderId
 * @param {number} opts.orderTotal
 * @param {Array}  opts.items - cart/order line items
 * @param {Object} opts.shippingAddress - Stripe address object
 * @param {string} opts.buyerEmail
 * @param {string} opts.buyerName
 */
async function sendOrderEmails({ orderId, orderTotal, items, shippingAddress, buyerEmail, buyerName }) {
  const baseUrl = process.env.BENCHLOT_BASE_URL || 'https://benchlot.com';
  const orderUrl = `${baseUrl}/account/orders/${orderId}`;
  const shippingAddressString = formatShippingAddressString(shippingAddress);

  // Buyer email — Template 5. For multi-item orders we use the first item as
  // the representative tool. TODO: build a multi-item variant when needed.
  const firstItem = Array.isArray(items) && items.length > 0 ? items[0] : null;
  if (firstItem) {
    let sellerName = '';
    if (firstItem.sellerId) {
      try {
        const s = await db.collection('users').doc(firstItem.sellerId).get();
        if (s.exists) {
          const sd = s.data();
          sellerName = sd.sellerName || sd.displayName || '';
        }
      } catch (err) {
        console.warn(`[order-emails] could not look up seller ${firstItem.sellerId}: ${err.message}`);
      }
    }

    await sendEmail({
      templateId: '05-order-confirmation-buyer',
      to: buyerEmail,
      vars: {
        buyerName,
        toolTitle: firstItem.name || firstItem.title || '',
        toolImageUrl: imageUrlFromItem(firstItem),
        orderTotal: formatPriceUsd(orderTotal),
        shippingAddress: shippingAddressString,
        orderUrl,
        sellerName: sellerName || 'the seller',
        messageSellerUrl: `${baseUrl}/messages`,
      },
    });
  }

  // Seller emails — Template 6, one per item.
  for (const item of items || []) {
    if (!item.sellerId) continue;
    try {
      const sellerDoc = await db.collection('users').doc(item.sellerId).get();
      if (!sellerDoc.exists) continue;
      const seller = sellerDoc.data();
      const sellerEmail = seller.email || seller.contactEmail;
      if (!sellerEmail) continue;

      const itemTotal = (item.price || 0) * (item.quantity || 1);
      const payout = itemTotal * 0.88; // 12% marketplace fee — see Template 6 spec

      await sendEmail({
        templateId: '06-new-order-seller',
        to: sellerEmail,
        vars: {
          sellerName: seller.profile?.firstName || seller.sellerName || seller.displayName || '',
          toolTitle: item.name || item.title || '',
          toolImageUrl: imageUrlFromItem(item),
          salePrice: formatPriceUsd(itemTotal),
          yourPayout: formatPriceUsd(payout),
          buyerName,
          shippingAddress: shippingAddressString,
          orderUrl: `${baseUrl}/seller/orders/${orderId}`,
          messageBuyerUrl: `${baseUrl}/messages`,
        },
      });
    } catch (sellerEmailError) {
      console.error(`[order-emails] error notifying seller ${item.sellerId}:`, sellerEmailError.message);
    }
  }
}

// Initialize Stripe with error handling
let stripe;
try {
  // Get Stripe key from environment variables
  const stripeKey = process.env.STRIPE_SECRET || 
                    process.env.STRIPE_SECRET_KEY;
  
  if (stripeKey) {
    console.log('Stripe initialized in', stripeKey.startsWith('sk_live') ? 'LIVE' : 'TEST', 'mode');
    stripe = require('stripe')(stripeKey);
  } else {
    console.error('❌ STRIPE_SECRET environment variable is not set. Stripe will not work.');
    console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('STRIPE')).join(', '));
    // Do not initialize stripe — endpoints will return errors if called without it
    stripe = null;
  }
} catch (error) {
  console.error('Error initializing Stripe:', error);
  stripe = null;
}

// Express app for API endpoints
const app = express();
app.use(cors);
app.use(express.json());

/**
 * Middleware to verify Firebase ID token from Authorization header.
 * Attaches decoded token to req.user on success.
 */
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  try {
    const idToken = authHeader.split('Bearer ')[1];
    req.user = await admin.auth().verifyIdToken(idToken);
    next();
  } catch (error) {
    console.error('Auth token verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
};

// Optional auth — sets req.user if token present, but doesn't block
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const idToken = authHeader.split('Bearer ')[1];
      req.user = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      // Token invalid — proceed without user
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
};

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false }, // Disable IP validation for Firebase emulator compatibility
  message: { error: 'Too many requests, please try again later.' }
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false }, // Disable IP validation for Firebase emulator compatibility
  message: { error: 'Too many requests, please try again later.' }
});

// Apply general rate limit to all routes
app.use(generalLimiter);

// Apply strict limits to sensitive endpoints
app.use('/create-payment-intent', strictLimiter);
app.use('/confirm-payment', strictLimiter);
app.use('/create-connected-account', strictLimiter);
app.use('/create-customer', strictLimiter);
app.use('/send-password-reset', strictLimiter);

// Limit request body size
app.use(express.json({ limit: '1mb' }));

/**
 * Create a payment intent
 * This is the first step in the payment process
 * For marketplace purchases, this also includes application fee calculations
 */
app.post('/create-payment-intent', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe is not configured. Please set the STRIPE_SECRET environment variable.' });
    }

    const { cartId, userId, isGuestCheckout, cartItems, cartTotal } = req.body;

    if (!cartId || !userId) {
      return res.status(400).json({ error: 'Missing cartId or userId' });
    }

    console.log(`create-payment-intent: cart=${cartId}, user=${userId}, guest=${!!isGuestCheckout}`);

    let cart;

    // Convert isGuestCheckout to boolean if it's a string
    const isGuestCheckoutBool = isGuestCheckout === true || isGuestCheckout === 'true';
    
    // Handle guest checkout with cart data in request
    if (isGuestCheckoutBool && cartId === 'guest-cart' && cartItems && cartTotal) {

      // Validate cart items against actual prices in Firestore
      let verifiedTotal = 0;
      for (const item of cartItems) {
        if (!item.toolId) {
          return res.status(400).json({ error: 'Cart item missing toolId' });
        }
        const toolDoc = await db.collection('tools').doc(item.toolId).get();
        if (!toolDoc.exists) {
          return res.status(400).json({ error: `Tool ${item.toolId} not found` });
        }
        const tool = toolDoc.data();
        const quantity = item.quantity || 1;
        verifiedTotal += (tool.current_price || tool.price) * quantity;
      }

      // Reject if client total doesn't match verified total (allow small rounding tolerance)
      if (Math.abs(verifiedTotal - cartTotal) > 0.01) {
        console.error(`Price mismatch: client sent $${cartTotal}, verified $${verifiedTotal}`);
        return res.status(400).json({ error: 'Cart total does not match current prices. Please refresh and try again.' });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(verifiedTotal * 100), // Use verified total, not client total
        currency: 'usd',
        metadata: {
          cartId: 'guest-cart',
          userId: 'guest',
          isGuestCheckout: 'true',
          guestEmail: req.body.guestEmail || ''
        }
      });

      console.log(`Created guest payment intent: ${paymentIntent.id}`);

      return res.json({
        clientSecret: paymentIntent.client_secret,
        isMarketplace: false
      });
    } else {
      try {
        // Get the cart from Firestore for authenticated users
        const cartRef = db.collection('carts').doc(cartId);
        const cartDoc = await cartRef.get();

        if (!cartDoc.exists) {
          return res.status(404).json({ error: 'Cart not found' });
        }

        cart = cartDoc.data();
        
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
    
    // Verify the payment intent with Stripe
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (stripeError) {
      console.error(`Stripe error retrieving payment intent ${paymentIntentId}:`, stripeError);
      return res.status(400).json({ 
        error: `Payment verification failed: ${stripeError.message}`,
        code: stripeError.code || 'unknown_error'
      });
    }
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        error: `Payment has not succeeded. Current status: ${paymentIntent.status}`,
        code: 'payment_not_succeeded'
      });
    }
    
    console.log(`confirm-payment: intent=${paymentIntentId}, cart=${cartId}, guest=${!!isGuestCheckout}`);

    // Convert isGuestCheckout to boolean if it's a string
    const isGuestCheckoutBool = isGuestCheckout === true || isGuestCheckout === 'true';

    // Process guest cart directly from the request payload
    if (isGuestCheckoutBool && cartId === 'guest-cart' && cartItems) {
      try {
        // Verify payment intent metadata matches guest checkout
        const paymentMetadata = paymentIntent.metadata || {};

        if (paymentMetadata.isGuestCheckout === 'true' && paymentMetadata.cartId === 'guest-cart') {
          // Metadata already set
        } else {
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
        
        console.log(`Guest order created: ${orderRef.id}`);

        // Send Templates 5 (buyer) + 6 (one per seller) for the new order.
        try {
          if (guestEmail) {
            await sendOrderEmails({
              orderId: orderRef.id,
              orderTotal: cartTotal || 0,
              items: cartItems,
              shippingAddress: shippingAddress || {},
              buyerEmail: guestEmail,
              buyerName: guestEmail.split('@')[0],
            });
          }
        } catch (emailError) {
          console.error('Error sending order emails (guest):', emailError);
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
      const cartRef = db.collection('carts').doc(cartId);
      const cartDoc = await cartRef.get();

      if (!cartDoc.exists) {
        return res.status(404).json({ error: 'Cart not found for payment confirmation' });
      }

      cart = cartDoc.data();
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
      
      console.log(`Order created: ${orderRef.id}`);

      // Send Templates 5 (buyer) + 6 (one per seller) for the new order.
      try {
        const userDoc = await db.collection('users').doc(cart.userId).get();
        if (userDoc.exists) {
          const userEmail = userDoc.data().email;
          const userName = userDoc.data().displayName || userDoc.data().firstName || '';

          if (userEmail) {
            await sendOrderEmails({
              orderId: orderRef.id,
              orderTotal: cart.totalAmount,
              items: cart.items,
              shippingAddress: shippingAddress || {},
              buyerEmail: userEmail,
              buyerName: userName || userEmail.split('@')[0],
            });
          }
        }
      } catch (emailError) {
        console.error('Error sending order emails (registered user):', emailError);
        // Don't fail the API call if email fails
      }
      
      // Update the cart status and clear its contents
      const cartRef = db.collection('carts').doc(cartId);
      await cartRef.update({
        status: 'completed',
        orderId: orderRef.id,
        items: [],
        itemCount: 0,
        totalAmount: 0
      });
      
      // Also clear the items subcollection
      const itemsSnapshot = await db.collection('carts').doc(cartId).collection('items').get();
      const batch = db.batch();
      itemsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();

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
    
    if (!userId || !email) {
      return res.status(400).json({ error: 'Missing userId or email' });
    }

    console.log(`create-connected-account: user=${userId}`);
    
    // Check if user already has a Stripe account
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists && userDoc.data().stripeAccountId) {
        
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
    
    const account = await stripe.accounts.create(accountParams);
    console.log(`Stripe account created: ${account.id}`);
    
    // Step 2: Explicitly update the Person (representative) with required information
    try {
      // Extract the person ID from the account
      const personId = account.individual?.id;

      // Get first and last name with fallbacks
      const firstNameValue = firstName || (sellerName ? sellerName.split(' ')[0] : null) || email.split('@')[0] || "User";
      const lastNameValue = lastName || (sellerName && sellerName.split(' ').length > 1 ? sellerName.split(' ').slice(1).join(' ') : "User");
      
      if (personId) {
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
          
        } catch (updateError) {
          console.error('Error updating person, falling back to create:', updateError.message);
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
          
        }
      } else {
        // Person ID not found in account response, creating new person
        
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
          
        } catch (createError) {
          console.error('Error creating person:', createError);
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
    } catch (firestoreError) {
      console.error('Error updating user in Firestore:', firestoreError);
      throw firestoreError;
    }
    
    // Handle account setup for ALL sellers - bypass Stripe hosted onboarding completely
    const appUrl = process.env.APP_URL || 'https://benchlot.com';
    
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
    
    const accountLink = setupResult;
    
    // Return the account link URL and new account ID
    res.json({ 
      url: accountLink.url,
      accountId: account.id,
      exists: false
    });
  } catch (error) {
    console.error('Error creating connected account:', error);
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

  try {
    // Get both webhook secrets from environment variables
    const paymentWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const connectWebhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

    if (!paymentWebhookSecret && !connectWebhookSecret) {
      console.error('No webhook secrets configured. Set STRIPE_WEBHOOK_SECRET and/or STRIPE_CONNECT_WEBHOOK_SECRET.');
      return res.status(500).send('Webhook secrets not configured');
    }
    
    // Try verifying with payment webhook secret first
    if (paymentWebhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(
          req.rawBody || req.body,
          signature,
          paymentWebhookSecret
        );
      } catch (paymentError) {
        // Will try connect secret next
      }
    }

    // If not verified yet, try with connected account webhook secret
    if (!event && connectWebhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(
          req.rawBody || req.body,
          signature,
          connectWebhookSecret
        );
      } catch (connectError) {
        // Will fall through to error below
      }
    }

    if (!event) {
      console.error('Webhook signature verification failed');
      return res.status(400).send('Webhook signature verification failed');
    }
    
    console.log(`Webhook event type: ${event.type}`);
    
    // Process different event types
    switch (event.type) {
      // Connected account events
      case 'account.updated': {
        const account = event.data.object;
        
        // Find the user by Stripe account ID
        const usersSnapshot = await db.collection('users')
          .where('stripeAccountId', '==', account.id)
          .limit(1)
          .get();
          
        if (usersSnapshot.empty) {
          break;
        }

        const userId = usersSnapshot.docs[0].id;
        
        // Update account status in Firestore
        await db.collection('users').doc(userId).update({
          stripeStatus: account.requirements.disabled_reason ? 'restricted' : 'active',
          detailsSubmitted: account.details_submitted,
          payoutsEnabled: account.payouts_enabled,
          lastStatusUpdate: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // TODO: seller onboarding complete email — no Resend template exists yet.
        // Previously fired sendSellerOnboardingCompleteEmail here.

        break;
      }
      
      // Payment success events
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        
        // Check if this is for a marketplace payment with transfers
        if (paymentIntent.metadata && paymentIntent.metadata.cartId) {
          // Process marketplace payment
          try {
            const cartId = paymentIntent.metadata.cartId;
            const cartRef = db.collection('carts').doc(cartId);
            const cartDoc = await cartRef.get();
            
            if (!cartDoc.exists) {
              break;
            }
            
            const cart = cartDoc.data();
            
            // Create transfers to sellers if there are multiple sellers
            // This is a simple implementation - in a full system we'd track
            // individual seller items and their prices
            if (cart.items && cart.items.length > 0) {
              
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
                  continue;
                }

                const seller = sellerDoc.data();

                if (!seller.stripeAccountId) {
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
                  
                  console.log(`Transfer ${transfer.id}: $${sellerAmount/100} to seller ${sellerId}`);
                  
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
      
      // Transfer events - track money movement to sellers
      case 'transfer.created': {
        const transfer = event.data.object;

        // Record or update in Firestore
        const existingTransfer = await db.collection('transfers')
          .where('transferId', '==', transfer.id)
          .limit(1)
          .get();

        if (existingTransfer.empty) {
          await db.collection('transfers').add({
            transferId: transfer.id,
            amount: transfer.amount / 100,
            currency: transfer.currency,
            destination: transfer.destination,
            status: 'created',
            description: transfer.description,
            metadata: transfer.metadata || {},
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
        break;
      }

      case 'transfer.reversed': {
        const transfer = event.data.object;

        const transferSnap = await db.collection('transfers')
          .where('transferId', '==', transfer.id)
          .limit(1)
          .get();

        if (!transferSnap.empty) {
          await transferSnap.docs[0].ref.update({
            status: 'reversed',
            reversed: true,
            reversedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
        break;
      }

      // Payout events - money leaving Stripe to seller's bank
      case 'payout.created': {
        const payout = event.data.object;
        const connectedAccountId = event.account; // Connected account that received the payout

        if (connectedAccountId) {
          // Find the seller by Stripe account ID
          const sellerSnap = await db.collection('users')
            .where('stripeAccountId', '==', connectedAccountId)
            .limit(1)
            .get();

          if (!sellerSnap.empty) {
            const sellerId = sellerSnap.docs[0].id;

            await db.collection('payouts').add({
              payoutId: payout.id,
              sellerId,
              stripeAccountId: connectedAccountId,
              amount: payout.amount / 100,
              currency: payout.currency,
              status: payout.status,
              arrivalDate: payout.arrival_date,
              method: payout.method,
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

          }
        }
        break;
      }

      case 'payout.paid': {
        const payout = event.data.object;
        const connectedAccountId = event.account;

        // Update payout status in Firestore
        const payoutSnap = await db.collection('payouts')
          .where('payoutId', '==', payout.id)
          .limit(1)
          .get();

        if (!payoutSnap.empty) {
          await payoutSnap.docs[0].ref.update({
            status: 'paid',
            paidAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // TODO: payout notification email — no Resend template exists yet.
          // Previously fired sendPayoutNotificationEmail here.
        }
        break;
      }

      case 'payout.failed': {
        const payout = event.data.object;
        console.error(`Payout ${payout.id} failed: ${payout.failure_message}`);

        const payoutSnap = await db.collection('payouts')
          .where('payoutId', '==', payout.id)
          .limit(1)
          .get();

        if (!payoutSnap.empty) {
          await payoutSnap.docs[0].ref.update({
            status: 'failed',
            failureMessage: payout.failure_message || 'Unknown failure',
            failedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
        break;
      }

      // Refund events
      case 'charge.refunded': {
        const charge = event.data.object;

        // Find orders associated with this charge's payment intent
        if (charge.payment_intent) {
          const orderSnap = await db.collection('orders')
            .where('paymentIntentId', '==', charge.payment_intent)
            .limit(1)
            .get();

          if (!orderSnap.empty) {
            const isFullRefund = charge.amount_refunded >= charge.amount;
            await orderSnap.docs[0].ref.update({
              status: isFullRefund ? 'refunded' : 'partially_refunded',
              refundAmount: charge.amount_refunded / 100,
              lastRefundAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
        break;
      }

      // Dispute events
      case 'charge.dispute.created': {
        const dispute = event.data.object;

        // Record the dispute
        await db.collection('disputes').add({
          disputeId: dispute.id,
          chargeId: dispute.charge,
          amount: dispute.amount / 100,
          currency: dispute.currency,
          reason: dispute.reason,
          status: dispute.status,
          evidenceDueBy: dispute.evidence_details?.due_by,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Find associated order and update status
        if (dispute.payment_intent) {
          const orderSnap = await db.collection('orders')
            .where('paymentIntentId', '==', dispute.payment_intent)
            .limit(1)
            .get();

          if (!orderSnap.empty) {
            await orderSnap.docs[0].ref.update({
              disputeId: dispute.id,
              disputeStatus: dispute.status,
              disputeReason: dispute.reason
            });
          }
        }

        // Notify platform admin (use platform email)
        console.error(`DISPUTE ALERT: ${dispute.id} - $${dispute.amount / 100} - Reason: ${dispute.reason}`);
        break;
      }

      case 'charge.dispute.closed': {
        const dispute = event.data.object;

        const disputeSnap = await db.collection('disputes')
          .where('disputeId', '==', dispute.id)
          .limit(1)
          .get();

        if (!disputeSnap.empty) {
          await disputeSnap.docs[0].ref.update({
            status: dispute.status,
            closedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        // Update order dispute status
        if (dispute.payment_intent) {
          const orderSnap = await db.collection('orders')
            .where('paymentIntentId', '==', dispute.payment_intent)
            .limit(1)
            .get();

          if (!orderSnap.empty) {
            await orderSnap.docs[0].ref.update({
              disputeStatus: dispute.status
            });
          }
        }
        break;
      }

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
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // Get user's Stripe account ID from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    if (!userData.stripeAccountId) {
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
    
    // Update the Stripe account
    const updatedAccount = await stripe.accounts.update(userData.stripeAccountId, updateParams);
    
    // Update user record in Firestore with updated Stripe status
    const userUpdates = {
      firstName: firstName || userData.firstName,
      lastName: lastName || userData.lastName,
      lastStatusUpdate: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('users').doc(userId).update(userUpdates);
    
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
    
    
    // First, check if the user already has a Stripe customer ID in Firestore
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists && userDoc.data().stripeCustomerId) {
        
        // Check if the customer still exists in Stripe
        try {
          const customer = await stripe.customers.retrieve(userDoc.data().stripeCustomerId);
          
          if (customer && !customer.deleted) {
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
    
    
    // Create a SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session' // Allow the payment method to be used for future off-session payments
    });
    
    
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
    
    
    // Get all payment methods for the customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    });
    
    
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
    
    
    // Update payment method metadata if a nickname is provided
    if (nickname) {
      await stripe.paymentMethods.update(paymentMethodId, {
        metadata: {
          nickname
        }
      });
    }
    
    // Set as default payment method if requested
    if (isDefault) {
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });
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
    
    
    // Retrieve the payment method to get the customer ID
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    const customerId = paymentMethod.customer;
    
    // Detach the payment method
    const detachedPaymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
    
    // Check if this was the default payment method
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        
        // If this was the default payment method, try to set a new default
        if (customer.invoice_settings?.default_payment_method === paymentMethodId) {
          
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
          } else {
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

/**
 * Seller Earnings & Payout Endpoints
 *
 * These endpoints provide sellers with visibility into their
 * earnings, transfer history, and balance information.
 */

/**
 * Get a seller's balance from their Stripe connected account
 * Returns available and pending balance amounts
 */
app.get('/get-seller-balance', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }


    // Get the user from Firestore
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    if (!userData.stripeAccountId) {
      return res.status(404).json({ error: 'User is not a seller' });
    }

    // Get balance from Stripe for the connected account
    const balance = await stripe.balance.retrieve({
      stripeAccount: userData.stripeAccountId
    });

    // Extract USD amounts (default currency)
    const available = balance.available
      .filter(b => b.currency === 'usd')
      .reduce((sum, b) => sum + b.amount, 0);
    const pending = balance.pending
      .filter(b => b.currency === 'usd')
      .reduce((sum, b) => sum + b.amount, 0);

    res.json({
      available: available / 100, // Convert cents to dollars
      pending: pending / 100,
      currency: 'usd'
    });
  } catch (error) {
    console.error('Error getting seller balance:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get transfer history for a seller
 * Returns transfers from the platform to the seller's connected account
 */
app.get('/get-seller-transfers', async (req, res) => {
  try {
    const { userId, limit: queryLimit, startingAfter } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }


    // Get the user from Firestore
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    if (!userData.stripeAccountId) {
      return res.status(404).json({ error: 'User is not a seller' });
    }

    // Fetch transfers from Stripe destined for this connected account
    const transferParams = {
      destination: userData.stripeAccountId,
      limit: Math.min(parseInt(queryLimit) || 25, 100)
    };

    if (startingAfter) {
      transferParams.starting_after = startingAfter;
    }

    const transfers = await stripe.transfers.list(transferParams);

    // Format the transfer data
    const formattedTransfers = transfers.data.map(transfer => ({
      id: transfer.id,
      amount: transfer.amount / 100,
      currency: transfer.currency,
      created: transfer.created,
      description: transfer.description,
      status: transfer.reversed ? 'reversed' : 'completed',
      metadata: transfer.metadata || {}
    }));

    res.json({
      transfers: formattedTransfers,
      hasMore: transfers.has_more
    });
  } catch (error) {
    console.error('Error getting seller transfers:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get orders for a seller
 * Returns orders that contain items from this seller
 */
app.get('/get-seller-orders', async (req, res) => {
  try {
    const { userId, status, limit: queryLimit } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }


    const resultLimit = Math.min(parseInt(queryLimit) || 50, 100);

    // Query orders that have items from this seller
    // Since Firestore can't do array-contains on nested fields,
    // we query all recent orders and filter server-side
    let ordersQuery = db.collection('orders')
      .orderBy('createdAt', 'desc')
      .limit(resultLimit * 3); // Fetch extra to account for filtering

    if (status) {
      ordersQuery = db.collection('orders')
        .where('status', '==', status)
        .orderBy('createdAt', 'desc')
        .limit(resultLimit * 3);
    }

    const ordersSnapshot = await ordersQuery.get();

    // Filter orders that contain items from this seller
    const sellerOrders = [];

    for (const doc of ordersSnapshot.docs) {
      if (sellerOrders.length >= resultLimit) break;

      const order = doc.data();
      const sellerItems = (order.items || []).filter(
        item => item.sellerId === userId
      );

      if (sellerItems.length > 0) {
        // Calculate seller's portion of the order
        const sellerTotal = sellerItems.reduce(
          (sum, item) => sum + (item.price * (item.quantity || 1)), 0
        );
        const platformFee = sellerTotal * 0.05;

        sellerOrders.push({
          id: doc.id,
          status: order.status,
          createdAt: order.createdAt,
          buyerId: order.userId,
          buyerEmail: order.userEmail || null,
          isGuestOrder: order.isGuestOrder || false,
          items: sellerItems,
          sellerTotal,
          platformFee,
          sellerEarnings: sellerTotal - platformFee,
          shippingAddress: order.shippingAddress || null,
          paymentIntentId: order.paymentIntentId
        });
      }
    }

    // Compute aggregate stats
    let totalEarnings = 0;
    let totalFees = 0;
    for (const order of sellerOrders) {
      totalEarnings += order.sellerEarnings;
      totalFees += order.platformFee;
    }

    res.json({
      orders: sellerOrders,
      totalOrders: sellerOrders.length,
      totalEarnings,
      totalFees
    });
  } catch (error) {
    console.error('Error getting seller orders:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Refund Processing
 *
 * Creates a refund for a payment, optionally reversing the
 * transfer to the seller's connected account.
 */
app.post('/create-refund', async (req, res) => {
  try {
    const { orderId, reason, amount } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Missing orderId' });
    }


    // Get the order from Firestore
    const orderDoc = await db.collection('orders').doc(orderId).get();

    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderDoc.data();

    if (!order.paymentIntentId) {
      return res.status(400).json({ error: 'Order has no associated payment' });
    }

    // Build refund params
    const refundParams = {
      payment_intent: order.paymentIntentId,
      reason: reason || 'requested_by_customer',
      metadata: {
        orderId,
        refundedBy: req.body.userId || 'admin'
      }
    };

    // Partial refund if amount specified, otherwise full refund
    if (amount) {
      refundParams.amount = Math.round(amount * 100);
    }

    // Create the refund in Stripe
    const refund = await stripe.refunds.create(refundParams);

    console.log(`Refund created: ${refund.id}, order=${orderId}, amount=$${refund.amount / 100}`);

    // Reverse associated transfers to sellers
    const transfersSnapshot = await db.collection('transfers')
      .where('paymentIntentId', '==', order.paymentIntentId)
      .get();

    const reversals = [];

    for (const transferDoc of transfersSnapshot.docs) {
      const transfer = transferDoc.data();
      try {
        // Calculate reversal amount proportionally if partial refund
        let reversalAmount;
        if (amount && amount < order.totalAmount) {
          const ratio = amount / order.totalAmount;
          reversalAmount = Math.round(transfer.amount * ratio * 100);
        }

        const reversalParams = { metadata: { orderId, refundId: refund.id } };
        if (reversalAmount) {
          reversalParams.amount = reversalAmount;
        }

        const reversal = await stripe.transfers.createReversal(
          transfer.transferId,
          reversalParams
        );


        // Update transfer record
        await transferDoc.ref.update({
          reversed: true,
          reversalId: reversal.id,
          reversalAmount: (reversalAmount || transfer.amount * 100) / 100,
          reversedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        reversals.push({
          transferId: transfer.transferId,
          reversalId: reversal.id,
          sellerId: transfer.sellerId
        });
      } catch (reversalError) {
        console.error(`Error reversing transfer ${transfer.transferId}:`, reversalError);
      }
    }

    // Update order status
    await db.collection('orders').doc(orderId).update({
      status: amount && amount < order.totalAmount ? 'partially_refunded' : 'refunded',
      refundId: refund.id,
      refundAmount: refund.amount / 100,
      refundReason: reason || 'requested_by_customer',
      refundedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // TODO: refund notification email — no Resend template exists yet.
    // Previously this fired sendPaymentReceiptEmail with isRefund: true.
    // When a refund template is added, wire it here.

    res.json({
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status,
      reversals
    });
  } catch (error) {
    console.error('Error creating refund:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── ToolScan Endpoint ───────────────────────────────────────────────────────

const Anthropic = require('@anthropic-ai/sdk');
const { TOOLSCAN_SYSTEM_PROMPT } = require('./toolscan-prompt');

// Rate-limit ToolScan more tightly (costs real money per call)
const toolscanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 scans per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false }, // Disable IP validation for Firebase emulator compatibility
  message: { error: 'Too many scan requests, please try again later.' }
});

/**
 * POST /toolscan
 * Accepts a base64-encoded image (or array of images) and optional context.
 * Returns structured tool identifications via Claude vision.
 *
 * Body: { images: [{ data: "base64...", media_type: "image/jpeg" }], context?: string }
 */
app.post('/toolscan', toolscanLimiter, optionalAuth, async (req, res) => {
  try {
    const { images, context } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'At least one image is required.' });
    }

    if (images.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 images per scan.' });
    }

    // Validate each image
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    for (const img of images) {
      if (!img.data || !img.media_type) {
        return res.status(400).json({ error: 'Each image must have data and media_type fields.' });
      }
      if (!allowedTypes.includes(img.media_type)) {
        return res.status(400).json({ error: `Unsupported image type: ${img.media_type}. Use JPEG, PNG, or WebP.` });
      }
    }

    // Initialize Anthropic client
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      console.error('ANTHROPIC_API_KEY environment variable is not set.');
      return res.status(500).json({ error: 'ToolScan is not configured. Missing API key.' });
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    // Build the user message content: image blocks + optional context
    const content = [];

    for (const img of images) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: img.media_type,
          data: img.data,
        },
      });
    }

    // Add user context if provided
    let userText = 'Identify all hand tools visible in the image(s) and generate listing details.';
    if (context && context.trim()) {
      userText += `\n\nSeller context: "${context.trim()}"`;
    }
    content.push({ type: 'text', text: userText });

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      temperature: 0,
      system: TOOLSCAN_SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    });

    // Extract the text response
    const responseText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Parse JSON from response — Claude may wrap in ```json ... ```
    let parsed;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse ToolScan response:', parseError.message);
      console.error('Raw response:', responseText.substring(0, 500));
      return res.status(500).json({
        error: 'Failed to parse tool identification results.',
        raw: responseText,
      });
    }

    // Store the scan session in Firestore
    const scanSession = {
      userId: req.user?.uid || 'anonymous',
      imageCount: images.length,
      toolCount: parsed.tools ? parsed.tools.length : 0,
      context: context || null,
      results: parsed,
      model: 'claude-sonnet-4-20250514',
      usage: {
        input_tokens: message.usage?.input_tokens || 0,
        output_tokens: message.usage?.output_tokens || 0,
      },
      createdAt: admin.firestore.FieldValue
        ? admin.firestore.FieldValue.serverTimestamp()
        : new Date(),
    };

    let scanRefId;
    try {
      const scanRef = await db.collection('toolscans').add(scanSession);
      scanRefId = scanRef.id;
    } catch (firestoreError) {
      // Don't fail the scan if Firestore write fails — still return results
      console.error('Failed to store scan session:', firestoreError.message);
      scanRefId = null;
    }

    res.json({
      success: true,
      scanId: scanRefId,
      results: parsed,
    });
  } catch (error) {
    console.error('ToolScan error:', error.message || error);
    console.error('ToolScan error stack:', error.stack);

    // Handle Anthropic API errors specifically
    if (error.status === 429) {
      return res.status(429).json({ error: 'AI service rate limit reached. Please try again in a moment.' });
    }
    if (error.status === 400) {
      const detail = error.message || 'Image could not be processed.';
      console.error('Anthropic 400 detail:', detail);
      return res.status(400).json({ error: `Image could not be processed: ${detail}` });
    }

    res.status(500).json({ error: error.message || 'An error occurred during tool scanning.' });
  }
});

// Export the API as a Firebase Function
// CORS is handled by the Express cors middleware configured above
exports.api = functions.https.onRequest(app);

// Maintain backward compatibility with previous stripeApi endpoint
exports.stripeApi = exports.api;

/**
 * POST /send-scan-results
 * Sends Template 1 (Scan Welcome) to a user's email after a successful scan.
 * Public endpoint, rate-limited. Generates a Firebase password reset link
 * server-side so the recipient can claim their pending account.
 *
 * Body: { email, scanResult: { tool_name, maker, model, era, condition, confidence,
 *         suggested_price_low, suggested_price_high, ... } }
 */
app.post('/send-scan-results', toolscanLimiter, async (req, res) => {
  try {
    const { email, scanResult } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required.' });
    }
    if (!scanResult) {
      return res.status(400).json({ error: 'Scan result data is required.' });
    }

    // Generate a password reset link so the recipient can claim their account.
    // Failures here are non-fatal — template will simply omit the secondary CTA.
    let setPasswordUrl;
    try {
      setPasswordUrl = await admin.auth().generatePasswordResetLink(email);
    } catch (linkErr) {
      console.warn(`[scan-results] could not generate password reset link for ${email}:`, linkErr.message);
    }

    // Map ToolScan-shaped fields to Template 1 vars
    const valueLow = scanResult.suggested_price_low ? `$${scanResult.suggested_price_low}` : '';
    const valueHigh = scanResult.suggested_price_high ? `$${scanResult.suggested_price_high}` : '';

    const result = await sendEmail({
      templateId: '01-scan-welcome',
      to: email,
      vars: {
        toolName: scanResult.tool_name || scanResult.suggested_title || '',
        maker: scanResult.maker || '',
        model: scanResult.model || '',
        era: scanResult.era || '',
        condition: scanResult.condition || '',
        valueLow,
        valueHigh,
        confidence: scanResult.confidence || '',
        scanPageUrl: `${process.env.BENCHLOT_BASE_URL || 'https://benchlot.com'}/scan`,
        setPasswordUrl,
      },
    });

    if (result.status === 'sent' || result.status === 'dry-run') {
      res.json({ success: true });
    } else {
      console.error('Failed to send scan results email:', result.error);
      res.status(500).json({ error: 'Failed to send email. Results are still saved.' });
    }
  } catch (error) {
    console.error('Send scan results error:', error.message);
    res.status(500).json({ error: 'Failed to send email.' });
  }
});

// Note: Email test functions have been removed after successful testing

/**
 * Sync new waitlist signups to HubSpot as contacts.
 * Triggers on every new document created in the 'waitlist' collection.
 * Uses firebase-functions v2 Firestore trigger syntax.
 */
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');

exports.syncWaitlistToHubSpot = onDocumentCreated('waitlist/{docId}', async (event) => {
  const snap = event.data;
  if (!snap) {
    console.error('No data in event');
    return null;
  }

  const data = snap.data();
  const email = data.email;

  if (!email) {
    console.error('Waitlist doc missing email:', event.params.docId);
    return null;
  }

  const hubspotApiKey = process.env.HUBSPOT_API_KEY;
  if (!hubspotApiKey) {
    console.error('HUBSPOT_API_KEY not set — skipping HubSpot sync');
    return null;
  }

  const axios = require('axios');

  try {
    await axios.post(
      'https://api.hubapi.com/crm/v3/objects/contacts',
      {
        properties: {
          email: email,
          lifecyclestage: 'subscriber',
          hs_lead_status: 'NEW'
        }
      },
      {
        headers: {
          Authorization: `Bearer ${hubspotApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`HubSpot contact created for ${email}`);
    await snap.ref.update({ hubspot_synced: true });
  } catch (error) {
    // 409 = contact already exists in HubSpot — not an error
    if (error.response && error.response.status === 409) {
      console.log(`HubSpot contact already exists for ${email}`);
      await snap.ref.update({ hubspot_synced: true, hubspot_existing: true });
    } else {
      console.error('HubSpot sync error:', error.response?.data || error.message);
      await snap.ref.update({ hubspot_synced: false, hubspot_error: error.message });
    }
  }

  return null;
});

/**
 * Template 4: Listing Published.
 * Fires when a tool's status transitions to 'active' (first photo uploaded).
 * Looks up the seller's Stripe Connect status to decide whether to render
 * the in-email "Set Up Payouts" warning.
 */
exports.onToolActivated = onDocumentUpdated('tools/{toolId}', async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!before || !after) return null;

  // Only fire on the active transition, not on other updates to active tools.
  if (before.status === 'active' || after.status !== 'active') return null;

  const toolId = event.params.toolId;
  const sellerId = after.user_id;
  if (!sellerId) {
    console.error(`[onToolActivated] tool ${toolId} has no user_id, cannot send email`);
    return null;
  }

  try {
    const sellerSnap = await db.collection('users').doc(sellerId).get();
    if (!sellerSnap.exists) {
      console.error(`[onToolActivated] seller ${sellerId} not found for tool ${toolId}`);
      return null;
    }
    const seller = sellerSnap.data();
    const sellerEmail = seller.email || seller.contactEmail;
    if (!sellerEmail) {
      console.error(`[onToolActivated] seller ${sellerId} has no email`);
      return null;
    }

    const baseUrl = process.env.BENCHLOT_BASE_URL || 'https://benchlot.com';

    // Stripe completion check — see Cloud Function notes in stripe-webhook handler.
    // chargesEnabled is set on users/{uid} by the account.updated webhook.
    const stripeComplete = seller.chargesEnabled === true && seller.payoutsEnabled === true;

    const firstImage = Array.isArray(after.images) && after.images[0] ? after.images[0].url : '';
    const price = after.current_price || after.price;
    const formattedPrice = typeof price === 'number' ? `$${price.toFixed(2)}` : (price || '');

    await sendEmail({
      templateId: '04-listing-published',
      to: sellerEmail,
      vars: {
        sellerName: seller.profile?.firstName || seller.sellerName || seller.displayName || '',
        toolTitle: after.name || '',
        toolPrice: formattedPrice,
        toolUrl: `${baseUrl}/tools/${toolId}`,
        toolImageUrl: firstImage,
        stripeStatus: stripeComplete ? 'complete' : 'incomplete',
        stripeOnboardUrl: `${baseUrl}/seller/onboarding`,
      },
    });
  } catch (err) {
    console.error(`[onToolActivated] error sending listing-published email for tool ${toolId}:`, err.message);
  }
  return null;
});

