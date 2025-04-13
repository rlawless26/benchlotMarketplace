/**
 * Firebase Functions for Benchlot
 * Handles Stripe integration and payment processing
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors')({ origin: true });

// Initialize Firebase Admin
admin.initializeApp();
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
    
    // Get the cart from Firestore
    const cartRef = db.collection('carts').doc(cartId);
    const cartDoc = await cartRef.get();
    
    if (!cartDoc.exists) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    
    const cart = cartDoc.data();
    
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
    
    // Get the cart from Firestore
    const cartRef = db.collection('carts').doc(cartId);
    const cart = (await cartRef.get()).data();
    
    // Create an order in Firestore
    const orderRef = await db.collection('orders').add({
      userId: cart.userId,
      items: cart.items,
      totalAmount: cart.totalAmount,
      status: 'paid',
      paymentIntentId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Update the cart status
    await cartRef.update({
      status: 'completed',
      orderId: orderRef.id
    });
    
    // Return success
    res.json({ success: true, orderId: orderRef.id });
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
    
    if (!userId || !email) {
      return res.status(400).json({ error: 'Missing userId or email' });
    }
    
    // Create a connected account with Stripe
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      }
    });
    
    // Store the account ID in Firestore
    await db.collection('users').doc(userId).update({
      stripeAccountId: account.id,
      isSeller: true
    });
    
    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${functions.config().app.url}/seller/onboarding/refresh`,
      return_url: `${functions.config().app.url}/seller/onboarding/complete`,
      type: 'account_onboarding'
    });
    
    // Return the account link URL
    res.json({ url: accountLink.url });
  } catch (error) {
    console.error('Error creating connected account:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API status endpoint
 */
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
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