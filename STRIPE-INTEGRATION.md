# Benchlot Stripe Integration Guide

This comprehensive guide explains the Stripe integration for Benchlot, including architecture, setup process, implementation details, and usage instructions.

## Overview

The Stripe integration in Benchlot uses Firebase Functions as a secure backend for handling Stripe API calls and payment processing. This architecture separates the client-side UI components from the server-side payment processing logic, ensuring security and compliance with payment best practices.

## Architecture

The Stripe integration uses a combination of client-side and server-side components:

1. **Client-Side Components**
   - `StripeCheckout.js`: Renders Stripe Elements for secure card input
   - Uses React Stripe.js library to handle payment flow
   - Communicates with Firebase Functions for secure processing

2. **Server-Side Components**
   - Firebase Function (`stripeApi`): Deployed at https://stripeapi-sed2e4p6ua-uc.a.run.app
   - Securely communicates with Stripe API
   - Creates payment intents
   - Processes payments
   - Handles order creation in Firestore
   - Sets up connected accounts for marketplace sellers

## Configuration

### Environment Variables

- **Client-Side (.env file)**
  ```
  REACT_APP_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
  REACT_APP_FIREBASE_API_URL=https://stripeapi-sed2e4p6ua-uc.a.run.app
  ```

- **Server-Side (Firebase Functions)**
  ```bash
  firebase functions:config:set stripe.secret="YOUR_SECRET_KEY" stripe.webhook_secret="YOUR_WEBHOOK_SECRET" app.url="YOUR_APP_URL"
  ```

## API Endpoints

The Firebase Function exposes the following endpoints:

1. **Status Check**
   - URL: `https://stripeapi-sed2e4p6ua-uc.a.run.app/`
   - Method: GET
   - Returns: Basic status information to verify the API is working
   - Example response:
     ```json
     {
       "status": "ok",
       "timestamp": "2025-04-13T07:13:29.382Z",
       "version": "1.0.0"
     }
     ```

2. **Create Payment Intent**
   - URL: `https://stripeapi-sed2e4p6ua-uc.a.run.app/create-payment-intent`
   - Method: POST
   - Payload: 
     ```json
     {
       "cartId": "cart-id-from-firestore",
       "userId": "authenticated-user-id"
     }
     ```
   - Returns: Client secret for Stripe.js
   - Example response:
     ```json
     {
       "clientSecret": "pi_3Nh4sXPJSOllkrGg1gl70Iwi_secret_OV37frZ8dEPKCAmCGxNjwkdAk"
     }
     ```

3. **Confirm Payment**
   - URL: `https://stripeapi-sed2e4p6ua-uc.a.run.app/confirm-payment`
   - Method: POST
   - Payload:
     ```json
     {
       "paymentIntentId": "stripe-payment-intent-id",
       "cartId": "cart-id-from-firestore"
     }
     ```
   - Returns: Order ID and success status
   - Example response:
     ```json
     {
       "success": true,
       "orderId": "firestore-generated-order-id"
     }
     ```

4. **Create Connected Account** (for marketplace sellers)
   - URL: `https://stripeapi-sed2e4p6ua-uc.a.run.app/create-connected-account`
   - Method: POST
   - Payload:
     ```json
     {
       "userId": "authenticated-user-id",
       "email": "seller-email@example.com"
     }
     ```
   - Returns: Account link URL for onboarding
   - Example response:
     ```json
     {
       "url": "https://connect.stripe.com/setup/s/..."
     }
     ```

## Firestore Data Model

The Stripe integration uses the following Firestore collections:

1. **Carts**
   - Stores the user's shopping cart information
   - Contains an array of cart items
   - Tracks total amounts and item counts
   - Used to calculate payment amounts

2. **Orders**
   - Created after successful payments
   - Contains purchased items, amounts, and status
   - Links to the payment intent ID from Stripe
   - Used for order history and reporting

## Testing

To test the Stripe integration, use Stripe's test cards:

- **Success**: `4242 4242 4242 4242`
- **Requires Authentication**: `4000 0025 0000 3155`
- **Decline**: `4000 0000 0000 0002`

All test cards work with any future expiration date, any 3-digit CVC, and any postal code.

## Deployment Status

### Server-Side Deployment (Completed)

The Firebase Function has been successfully deployed and is available at:
```
https://stripeapi-sed2e4p6ua-uc.a.run.app
```

This was accomplished by:

1. Setting environment variables in Firebase Functions
2. Deploying Firebase Functions to Google Cloud
3. Configuring the Cloud Run service to be publicly accessible

### Client-Side Integration (Completed)

The client-side code has been updated to use the deployed Firebase Function:

1. `StripeCheckout.js` now uses the Firebase Function endpoint for all payment operations
2. Error handling has been implemented for network issues and payment failures
3. Environment variables are properly configured for flexibility

## Implementation Status (Updated 4/13/2025)

### Completed
- ✅ Firebase Functions successfully deployed and accessible
- ✅ API endpoints for payment processing implemented
- ✅ Client-side StripeCheckout component integrated with Firebase Functions
- ✅ Basic error handling for payment processing

### Next Steps
1. **Set up Stripe webhooks** for asynchronous payment event handling
2. **Implement Stripe Connect** for sellers and marketplace functionality
3. **Add subscription support** for premium features
4. **Enhance error handling** for better recovery from payment failures
5. **Implement more comprehensive reporting** for shop owners
6. **Set up monitoring and alerts** for payment processing issues

## Troubleshooting

If you encounter issues with the Stripe integration:

1. **Check browser console** for detailed error messages
2. **Verify the Firebase Function is accessible** by visiting the status endpoint
3. **Check Firebase Function logs** in Google Cloud Console for backend errors
4. **Ensure proper Stripe API keys** are configured in both client and server
5. **Verify CORS settings** if you encounter cross-origin issues

## Security Considerations

The Firebase Function is configured with appropriate CORS headers to allow cross-origin requests from your application domains. All sensitive Stripe operations happen server-side, which:

1. Keeps your Stripe secret key secure
2. Prevents tampering with payment amounts
3. Provides audit trails for transactions
4. Follows payment industry best practices