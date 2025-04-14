# Benchlot - Firebase Implementation

A modern tool rental marketplace built with Firebase and React, featuring Stripe payment processing.

## Overview

Benchlot is a platform that allows users to:
- List tools for rental
- Browse available tools in the marketplace
- Add items to cart and complete checkout with Stripe
- Manage their tool listings and orders

## Project Structure

- `/src` - React application code
  - `/firebase` - Core Firebase configuration and services
    - `config.js` - Firebase initialization and exports
    - `/hooks` - Custom React hooks for Firebase services
    - `/models` - Data models and Firestore functions
  - `/components` - React components
    - Authentication components (AuthForm, AuthComponent)
    - Tool listing components (ToolListingCard, ToolListingForm, etc.)
    - Checkout components (StripeCheckout, CartPage, etc.)

- `/functions` - Firebase Cloud Functions
  - `index.js` - Stripe API integration and payment processing

- `/docs` - Project documentation
  - Implementation guides
  - API documentation
  - Development tutorials

## Features Implemented

- ✅ Firebase Core Setup
- ✅ Authentication (sign in, sign up, sign out, password reset)
- ✅ Firestore User Profiles
- ✅ Tool Listings & Marketplace
- ✅ Image Handling with Firebase Storage
- ✅ Shopping Cart Functionality
- ✅ Stripe Integration for Payments
- ⏳ SendGrid for Email Notifications
- ✅ Security Rules Implementation

## Technology Stack

- **Frontend**: React.js with Hooks, React Router
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Firestore, Authentication, Storage, Functions)
- **Payments**: Stripe integration via Firebase Functions
- **Deployment**: Firebase Hosting (with Vercel option)

## Getting Started

### Prerequisites
- Node.js (v14+)
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project with Blaze plan (required for Functions)
- Stripe account with API keys

### Running Locally

The easiest way to run the project is using the start script:

```bash
./start.sh
```

This script:
1. Installs dependencies if needed
2. Sets up environment variables
3. Starts the development server on http://localhost:3000

Alternatively, run these commands manually:

```bash
# Install dependencies
npm install

# Start the development server
npm start
```

## Firebase Functions

Benchlot uses Firebase Functions for secure Stripe payment processing. The function is deployed at:
```
https://stripeapi-sed2e4p6ua-uc.a.run.app
```

Key endpoints:
- `/create-payment-intent` - Creates a Stripe payment intent
- `/confirm-payment` - Processes a successful payment
- `/create-connected-account` - Sets up Stripe Connect for sellers

See [STRIPE-INTEGRATION.md](./docs/STRIPE-INTEGRATION.md) for detailed information.

## Environment Configuration

The application requires these environment variables:
- Firebase configuration variables
- `REACT_APP_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `REACT_APP_FIREBASE_API_URL` - URL of the deployed Firebase Function

## Documentation

For more detailed information, see the docs directory:
- [Stripe Integration Guide](./docs/STRIPE-INTEGRATION.md)
- [Migration Strategy](./docs/MIGRATION.md)

## Next Steps

- Set up SendGrid for email notifications
- Implement Stripe webhook handling for async payment events
- Improve error handling and recovery