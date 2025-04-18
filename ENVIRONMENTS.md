# Benchlot Environment Setup

This document describes the environment configuration for the Benchlot application.

## Environments

Benchlot supports three environments:

1. **Development**: Local development environment
2. **Staging**: For testing changes before production
3. **Production**: Live production environment

## Environment Variables

All environments use the same Firebase project but with different environment configurations.

### Required Variables

#### Firebase Configuration
- `REACT_APP_FIREBASE_API_KEY` 
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`
- `REACT_APP_FIREBASE_MEASUREMENT_ID`

#### Stripe Configuration
- `STRIPE_SECRET_KEY` - Stripe server-side secret key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret for Stripe events
- `REACT_APP_STRIPE_PUBLISHABLE_KEY` - Client-side publishable key

#### SendGrid Configuration
- `SENDGRID_API_KEY` - API key for sending emails

#### Template IDs
- `SENDGRID_TEMPLATE_ID_WELCOME`
- `SENDGRID_TEMPLATE_ID_PASSWORD_RESET`
- `SENDGRID_TEMPLATE_ID_LISTING_PUBLISHED`
- `SENDGRID_TEMPLATE_ID_MESSAGE_RECEIVED`
- `SENDGRID_TEMPLATE_ID_OFFER_RECEIVED`
- `SENDGRID_TEMPLATE_ID_ORDER_CONFIRMATION`

## Build Scripts

Environment-specific build commands:

```bash
# Development build
npm run build:development

# Staging build
npm run build:staging

# Production build
npm run build
```

## Vercel Deployment

The project uses Vercel for hosting with environment-specific deployments:

- **Main branch** → Production environment
- **Staging branch** → Preview/Staging environment
- **All other branches** → Development environment

## Environment Detection

The application automatically detects which environment it's running in based on:

1. Explicit environment variable `REACT_APP_ENVIRONMENT`
2. URL/hostname pattern

## GitHub Actions

Continuous Integration is set up through GitHub Actions:

1. Run tests on all pull requests to main and staging
2. Deploy to Vercel on successful pushes to main and staging

## Debugging Environment Issues

If you experience unexpected behavior related to environment configuration:

1. Check the browser console for the detected environment
2. Verify environment variables are set correctly in Vercel
3. Ensure Firebase config matches expected values