# Firebase Functions Guide

This document explains the Firebase Functions implementation for Benchlot, with a focus on the Stripe payment processing API.

## Overview

Firebase Functions provide the server-side functionality for Benchlot, handling sensitive operations like payment processing through Stripe. The main function (`stripeApi`) exposes several REST endpoints that the client-side React application can call.

## Deployed Endpoint

The Firebase Function is deployed and accessible at:
```
https://stripeapi-sed2e4p6ua-uc.a.run.app
```

## Function Implementation

The main implementation is in the `functions/index.js` file. It:

1. Initializes Firebase Admin SDK with explicit service account credentials
2. Sets up an Express.js application for API endpoints
3. Configures Stripe with the secret key from Firebase config
4. Exposes several REST endpoints
5. Handles CORS and proper error reporting

## API Endpoints

### Status Endpoint

```
GET /
```

Returns basic status information to verify the API is working.

Example response:
```json
{
  "status": "ok",
  "timestamp": "2025-04-14T03:32:26.442Z"
}
```

### Create Payment Intent

```
POST /create-payment-intent
```

Creates a new Stripe payment intent based on the user's cart.

Request body:
```json
{
  "cartId": "cart-id-from-firestore",
  "userId": "authenticated-user-id"
}
```

Response:
```json
{
  "clientSecret": "stripe-client-secret"
}
```

### Confirm Payment

```
POST /confirm-payment
```

Verifies that a payment was successful and creates an order in Firestore.

Request body:
```json
{
  "paymentIntentId": "stripe-payment-intent-id",
  "cartId": "cart-id-from-firestore"
}
```

Response:
```json
{
  "success": true,
  "orderId": "firestore-order-id"
}
```

### Create Connected Account

```
POST /create-connected-account
```

Creates a Stripe Connect account for a seller.

Request body:
```json
{
  "userId": "authenticated-user-id",
  "email": "seller-email@example.com"
}
```

Response:
```json
{
  "url": "stripe-account-onboarding-url"
}
```

## Configuration

The function uses the following configuration, set with `firebase functions:config:set`:

```
firebase functions:config:set stripe.secret="YOUR_STRIPE_SECRET_KEY" app.url="YOUR_APP_URL"
```

## Deployment

Deploy the function using:

```bash
firebase deploy --only functions
```

## Error Handling

The function includes detailed error logging to help diagnose issues. All endpoints use try/catch blocks and return appropriate HTTP status codes on failure.

## Security Considerations

1. **Authentication**: The function checks that requests are properly authenticated
2. **Authorization**: The function verifies that users can only access their own data
3. **Firestore Security**: The service account has access to Firestore via IAM permissions
4. **CORS**: The function uses proper CORS headers to allow cross-origin requests

## Troubleshooting

If you encounter issues:

1. **Check Function Logs**: View logs in the Firebase console or Google Cloud console
2. **Verify IAM Permissions**: Ensure the service account has proper Firestore access
3. **Test Status Endpoint**: Verify the function is accessible by calling the status endpoint
4. **Check Stripe Configuration**: Ensure the Stripe API keys are correctly configured