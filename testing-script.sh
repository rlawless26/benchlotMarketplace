#!/bin/bash

# Store the user ID
USER_ID=$1

if [ -z "$USER_ID" ]; then
  echo "Please provide your user ID as the argument"
  echo "Usage: ./testing-script.sh YOUR_USER_ID"
  exit 1
fi

echo "Starting testing sequence for user ID: $USER_ID"

# Create a backup of the current rules
echo "Creating backup of current Firestore rules..."
cp firestore.rules firestore.rules.backup

# Copy the temporary rules
echo "Deploying temporary test rules..."
cp firestore.rules.temp firestore.rules

# Deploy the temporary rules
echo "Pushing temporary rules to Firebase..."
firebase deploy --only firestore:rules

# Wait for rules to propagate
echo "Waiting for rules to take effect..."
sleep 5

# Run the conversation creation script
echo "Creating test conversation..."
node simple-create-conversation.js $USER_ID

# Restore the original rules
echo "Restoring original Firestore rules..."
cp firestore.rules.backup firestore.rules

# Deploy the original rules
echo "Pushing original rules to Firebase..."
firebase deploy --only firestore:rules

echo "Testing sequence completed!"
echo "You should now be able to see the test conversation at http://localhost:3000/messages"