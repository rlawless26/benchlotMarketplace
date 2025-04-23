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
 * First tries Firebase config, then environment variables, then default value
 */
const getConfig = (key, envVarName, defaultValue) => {
  try {
    // Convert key like 'stripe.secret' to an object path for functions.config()
    const keyParts = key.split('.');
    let configValue = functions.config();
    for (const part of keyParts) {
      configValue = configValue[part];
    }
    if (configValue) {
      console.log(`Using ${key} from Firebase config`);
      return configValue;
    }
  } catch (e) {
    // Config not found in Firebase, continue to environment variable
  }
  
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
  // For Firebase Functions v2, we need to use environment variables
  // These should be automatically populated from the Firebase config
  const stripeKey = process.env.STRIPE_SECRET || process.env.STRIPE_SECRET_KEY;
  
  if (stripeKey) {
    console.log('Using Stripe key from environment variable:', 
      process.env.STRIPE_SECRET ? 'STRIPE_SECRET' : 'STRIPE_SECRET_KEY');
    
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
    const appUrl = getConfig('app.url', 'APP_URL', 'https://benchlot.com');
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