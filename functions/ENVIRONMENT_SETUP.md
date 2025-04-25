# Firebase Functions Environment Setup

Firebase Functions v2 no longer supports `functions.config()` which was previously used for configuration. Instead, environment variables must be used.

## Why This Change Was Needed

Firebase Functions v2 has deprecated the `functions.config()` API, leading to errors like:
> "functions.config() is no longer available in Cloud Functions for Firebase v2..."

Our code has been updated to use environment variables (`process.env`) instead.

## Setting Up Environment Variables

### Method 1: Using Firebase Console (Recommended)

1. **Go to Firebase Console**
   - Open [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Select your "benchlot" project

2. **Navigate to Functions**
   - Click on "Functions" in the left sidebar
   - Go to the "Functions" tab if you're still using both v1 and v2

3. **Edit Environment Variables**
   - Look for your function name (likely "api" and "stripeApi")
   - Click on the three dots menu (⋮) at the end of the row
   - Select "Edit environment variables"
   - In the dialog that opens, add each of these variables:
     ```
     STRIPE_SECRET=your_stripe_secret_key
     STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
     STRIPE_CONNECT_WEBHOOK_SECRET=your_stripe_connect_webhook_secret
     APP_URL=https://benchlot.com
     SENDGRID_API_KEY=your_sendgrid_api_key
     ```
   - Click "Update"

### Method 2: Using Firebase CLI with .env File

1. **Create a .env File**
   - Create a file named `.env` in your functions directory
   - Add the following content (with your actual values):
     ```
     STRIPE_SECRET=your_stripe_secret_key
     STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
     STRIPE_CONNECT_WEBHOOK_SECRET=your_stripe_connect_webhook_secret
     APP_URL=https://benchlot.com
     SENDGRID_API_KEY=your_sendgrid_api_key
     ```

2. **Deploy with Environment Variables**
   - Run this command to deploy with environment variables:
     ```bash
     firebase deploy --only functions --env-file=./functions/.env
     ```

3. **Add to .gitignore**
   - Make sure to add `.env` to your `.gitignore` file to avoid committing sensitive data:
     ```bash
     echo "functions/.env" >> .gitignore
     ```

### Method 3: Using Firebase Secrets (For Production)

For the most secure approach with CLI:

1. **Set Secrets**
   ```bash
   firebase functions:secrets:set STRIPE_SECRET
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
   firebase functions:secrets:set STRIPE_CONNECT_WEBHOOK_SECRET
   firebase functions:secrets:set SENDGRID_API_KEY
   ```

2. **Reference Secrets**
   - Modify `firebase.json` to reference the secrets:
     ```json
     "functions": [
       {
         "source": "functions",
         // other properties...
         "secrets": [
           "STRIPE_SECRET",
           "STRIPE_WEBHOOK_SECRET", 
           "STRIPE_CONNECT_WEBHOOK_SECRET",
           "SENDGRID_API_KEY"
         ]
       }
     ]
     ```

## Local Development

For local development, you can use a `.env` file that won't be committed to git:

1. Create a `.env` file in the functions directory with your configuration variables
2. Run functions locally with:
   ```bash
   cd functions
   npm run serve -- --env-file=.env
   ```

## Configuration Values Reference

Here are all the environment variables used in the application:

| Environment Variable | Description | Previously Access Via |
|----------------------|-------------|----------------------|
| STRIPE_SECRET | Stripe API key | functions.config().stripe.secret |
| STRIPE_WEBHOOK_SECRET | Stripe webhook secret | functions.config().stripe.webhook_secret |
| STRIPE_CONNECT_WEBHOOK_SECRET | Stripe Connect webhook secret | functions.config().stripe.connect_webhook_secret |
| APP_URL | Application URL | functions.config().app.url |
| SENDGRID_API_KEY | SendGrid API key | functions.config().sendgrid.api_key |

## Important Security Note

Never store sensitive secrets directly in `firebase.json` as they will be exposed in your Git repository. Use the methods described above instead.

## Troubleshooting

If you encounter issues:

1. Check the Firebase Functions logs for any configuration-related errors
2. Verify that all environment variables are correctly set
3. After setting environment variables, redeploy your functions:
   ```bash
   firebase deploy --only functions
   ```