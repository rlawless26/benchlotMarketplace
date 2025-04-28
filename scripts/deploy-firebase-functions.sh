#!/bin/bash
# Script to deploy Firebase Functions with guest checkout updates

echo "Deploying updated Firebase Functions with guest checkout support..."

# First, make a Git commit for these changes
echo "Committing changes to git..."
git add functions/index.js src/components/StripeCheckout.js
git commit -m "Fix guest checkout cart handling and add better logging"

# Option to push changes to GitHub
read -p "Push changes to GitHub? (y/n): " push_option
if [[ $push_option == "y" || $push_option == "Y" ]]; then
  git push origin
  echo "Changes pushed to GitHub (Vercel should auto-deploy client code)"
else
  echo "Skipping push to GitHub (client changes will not be deployed yet)"
fi

# Deploy Firebase Functions
echo "Deploying Firebase Functions..."
cd functions
firebase deploy --only functions:api

echo "Deployment complete. The updated functions should now handle guest checkout correctly."