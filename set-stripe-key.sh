#!/bin/bash
# Script to set Stripe secret key in Firebase Functions config

echo "Setting Stripe secret key in Firebase Functions config..."

# Replace the value below with your actual live Stripe key
STRIPE_LIVE_KEY="sk_live_your_actual_live_key_here"

# Set the configuration value
firebase functions:config:set stripe.secret="$STRIPE_LIVE_KEY"

# Verify the configuration
echo "Verifying configuration..."
firebase functions:config:get

echo "Done! Now redeploy the functions with: ./deploy-firebase-functions.sh"