#\!/bin/bash
# Rebuild the React application

# Display the changes we've made
echo "Rebuilding application with the following changes:"
echo "--- Changes include: ---"
echo "1. Fixed Firebase v8 vs v9 syntax in SellerOnboardingPage and BankDetailsPage"
echo "2. Simplified Firebase Storage rules for uploading tool images"
echo "3. Updated authentication flow to use the modal instead of redirecting to /login page"
echo "4. Fixed the 'null is not an object' error in account status checking"
echo "-----------------------"
echo

# Restart the development server
echo "Stopping any running development servers..."
pkill -f "react-scripts start" || true

echo "Rebuilding the application..."
npm run build

echo
echo "Rebuild complete\! You can now view your tool listing and upload images."
echo "To start the development server again, run: npm start"
