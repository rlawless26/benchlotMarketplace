// A simple script to print instructions for getting your user ID

console.log(`
=================================================================
  HOW TO GET YOUR FIREBASE USER ID FROM THE BROWSER
=================================================================

1. Open the Benchlot app in your browser
2. Make sure you're logged in
3. Open the browser developer tools (F12 or Right-click > Inspect)
4. Go to the Console tab
5. Paste this code and press Enter:

   firebase.auth().currentUser.uid

6. Copy the returned user ID (it should look like a long string)
7. Use this user ID as the argument when running create-test-conversation.js:

   node create-test-conversation.js YOUR_USER_ID

=================================================================
`);