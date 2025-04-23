#\!/bin/bash
# Deploy updated security rules to Firebase

# Display the changes we're about to deploy
echo "Deploying updated Firestore security rules..."
echo "--- Changes include: ---"
echo "- Fixed isSeller() function to check both top-level and profile.isSeller"
echo "- Updated isValidTool() to check either price or current_price field"
echo "- These changes will fix the 'Missing or insufficient permissions' error"
echo "-----------------------"
echo

# Deploy only the firestore rules
firebase deploy --only firestore:rules

echo
echo "Deployment completed\! The seller onboarding and tool creation flow should now work correctly."
