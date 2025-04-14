/**
 * Firebase Functions for Benchlot
 * Handles Stripe integration and payment processing
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors')({ origin: true });

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
  const stripeSecret = functions.config().stripe?.secret;
  if (!stripeSecret) {
    console.error('Stripe secret key not found in config. Falling back to a placeholder for testing only.');
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
    
    // Create a payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects amounts in cents
      currency: 'usd',
      metadata: {
        cartId,
        userId
      }
    });
    
    // Return the client secret to the client
    res.json({ clientSecret: paymentIntent.client_secret });
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
      
      // Update the cart status
      console.log(`Updating cart ${cartId} status to completed`);
      const cartRef = db.collection('carts').doc(cartId);
      await cartRef.update({
        status: 'completed',
        orderId: orderRef.id
      });
      
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
 * Create a connected account for a seller
 */
app.post('/create-connected-account', async (req, res) => {
  try {
    const { userId, email } = req.body;
    
    console.log(`Creating connected account for user ${userId} with email ${email}`);
    
    if (!userId || !email) {
      console.log('Missing userId or email');
      return res.status(400).json({ error: 'Missing userId or email' });
    }
    
    // Create a connected account with Stripe
    console.log('Creating Stripe connected account');
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      }
    });
    
    console.log(`Stripe account created with ID: ${account.id}`);
    
    // Store the account ID in Firestore
    try {
      console.log(`Updating user ${userId} with Stripe account info`);
      await db.collection('users').doc(userId).update({
        stripeAccountId: account.id,
        isSeller: true
      });
      console.log('User updated successfully');
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
      refresh_url: `${functions.config().app.url}/seller/onboarding/refresh`,
      return_url: `${functions.config().app.url}/seller/onboarding/complete`,
      type: 'account_onboarding'
    });
    
    console.log('Account link created successfully');
    
    // Return the account link URL
    res.json({ url: accountLink.url });
  } catch (error) {
    console.error('Error creating connected account:', error);
    console.error('Error details:', error);
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

// Export the API as a Firebase Function with public access
exports.stripeApi = functions
  .https
  .onRequest((req, res) => {
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