# Firebase Functions for Benchlot

This directory contains Firebase Cloud Functions that power the server-side functionality for the Benchlot application, particularly for payment processing with Stripe.

## Functions Overview

### Payment Processing

- `/create-payment-intent`: Creates a Stripe Payment Intent for checkout
- `/confirm-payment`: Confirms a successful payment and creates an order
- `/create-connected-account`: Sets up a Stripe Connect account for sellers

### Cart Management

- `createCart`: Triggers when a new cart is created
- `updateCartTotals`: Automatically updates cart totals when items change

## Deployment

Before deploying these functions, you'll need to set up configuration variables for Stripe:

```bash
firebase functions:config:set stripe.secret="YOUR_STRIPE_SECRET_KEY" stripe.webhook_secret="YOUR_WEBHOOK_SECRET" app.url="YOUR_APP_URL"
```

To deploy the functions:

```bash
firebase deploy --only functions
```

## Local Development

To run the functions locally for testing:

```bash
firebase emulators:start
```

This will start the Firebase emulators, including the Functions emulator at http://localhost:5001.

## Environment Setup

Make sure you have the following environment variables in your Firebase configuration:

- `stripe.secret`: Your Stripe secret key
- `stripe.webhook_secret`: Your Stripe webhook secret for verifying webhook events
- `app.url`: The URL of your application (for redirect URLs)
- `sendgrid.apikey`: Your SendGrid API key for email functionality

### Setting Environment Variables

For production:
```bash
firebase functions:config:set stripe.secret="YOUR_STRIPE_SECRET_KEY" stripe.webhook_secret="YOUR_WEBHOOK_SECRET" app.url="YOUR_APP_URL" sendgrid.apikey="YOUR_SENDGRID_API_KEY"
```

For local development:
1. Copy `.env.example` to `.env`
2. Fill in your API keys and secrets
3. Run this command to generate a local config file:
```bash
firebase functions:config:get > .runtimeconfig.json
```

## Security Best Practices

⚠️ **IMPORTANT: Never commit API keys or secrets to the repository.**

- Always use environment variables for secrets
- Make sure `.env` files are in your `.gitignore`
- See `API_SECURITY_GUIDE.md` for more information on handling secrets securely

## Note on API Keys

For deploying to production, you'll need to obtain production API keys. For development and testing:
- Use Stripe's test mode keys, which allow you to simulate transactions without processing real payments
- Use SendGrid's restricted API keys with minimum necessary permissions