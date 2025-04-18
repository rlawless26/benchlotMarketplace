// Run this in the browser console to get your user ID
(async function() {
  try {
    // Try different methods to get the user ID
    
    // Method 1: Try to access user from localStorage
    const userKey = Object.keys(localStorage).find(key => 
      key.startsWith('firebase:authUser:') && 
      key.includes('AIzaSyAzzPSBiOb-vPqNtaEYQfq2FgTHI1uydJ4')
    );
    
    if (userKey) {
      const userData = JSON.parse(localStorage.getItem(userKey));
      if (userData && userData.uid) {
        console.log('✅ Found user ID from localStorage:');
        console.log('User ID: ' + userData.uid);
        console.log('Email: ' + userData.email);
        console.log('\nRun this command to create a test conversation:');
        console.log('node create-test-conversation.js ' + userData.uid);
        return;
      }
    }
    
    // Method 2: Try via debugging
    console.log('Could not automatically find user ID.');
    console.log('To manually find your user ID:');
    console.log('1. Look at the Network tab in DevTools');
    console.log('2. Refresh the page and look for requests to Firebase');
    console.log('3. Check request headers or payloads for your user ID');
    console.log('4. Alternatively, check the Application tab > IndexedDB > firebaseLocalStorage');
    
  } catch (error) {
    console.error('Error getting user ID:', error);
  }
})();