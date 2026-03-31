// BROWSER CONSOLE VERSION FOR FIREBASE V9
// Copy and paste this entire script into your browser console
// while logged into the Benchlot app

(async function() {
  try {
    // Access the Firebase modules from the app's global scope
    // This accesses the already initialized Firebase instances in your app
    const firebaseApp = window.firebase_app;
    
    // Get imports from Firebase (using the specific imports needed for your app)
    const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js');
    const { 
      getFirestore, 
      collection, 
      addDoc, 
      serverTimestamp 
    } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
    
    // Get the auth instance
    const auth = getAuth();
    if (!auth.currentUser) {
      console.error('You must be logged in to create a test conversation');
      return;
    }
    
    const user = auth.currentUser;
    console.log(`Creating test conversation for user: ${user.email} (${user.uid})`);
    
    // Create a fake user ID for testing
    const testUserId = 'test-user-' + Math.floor(Math.random() * 1000000);
    
    // Get Firestore instance
    const db = getFirestore();
    
    // Create conversation
    const conversationsRef = collection(db, 'conversations');
    const conversationDoc = await addDoc(conversationsRef, {
      participants: [user.uid, testUserId],
      participantNames: {
        [user.uid]: user.displayName || 'You',
        [testUserId]: 'Test User'
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
      lastMessageText: 'This is a test message',
      unreadByUsers: [user.uid],
      status: 'active'
    });
    
    console.log(`Created conversation with ID: ${conversationDoc.id}`);
    
    // Add messages
    const messagesRef = collection(db, 'conversations', conversationDoc.id, 'messages');
    
    await addDoc(messagesRef, {
      senderId: testUserId,
      text: 'Hello there! This is a test message from another user.',
      type: 'text',
      isRead: false,
      createdAt: serverTimestamp()
    });
    
    // Wait a moment for better timestamp difference
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await addDoc(messagesRef, {
      senderId: user.uid,
      text: 'Hi! This is a test reply to test the conversation view.',
      type: 'text',
      isRead: true,
      createdAt: serverTimestamp()
    });
    
    // Wait a moment for better timestamp difference
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await addDoc(messagesRef, {
      senderId: testUserId,
      text: 'Great! Let\'s test the messaging features. How does everything look?',
      type: 'text',
      isRead: false,
      createdAt: serverTimestamp()
    });
    
    console.log('Added test messages to conversation');
    console.log('Success! You can now visit the Messages page to see your test conversation.');
    console.log('Messages URL:', window.location.origin + '/messages');
    
  } catch (error) {
    console.error('Error creating test conversation:', error);
    console.error('Try using the alternative approach below:');
    console.log(`
    // Alternative approach - more compatible with your app
    // Run this code instead:
    
    (async function() {
      // Get the current user
      const user = window.firebase_auth_user || JSON.parse(localStorage.getItem('firebase:authUser:AIzaSyAzzPSBiOb-vPqNtaEYQfq2FgTHI1uydJ4:[DEFAULT]'));
      
      if (!user || !user.uid) {
        console.error('Could not find authenticated user. Make sure you are logged in.');
        return;
      }
      
      console.log('Found user:', user.email, user.uid);
      console.log('To create a test conversation, copy your user ID above and run:');
      console.log('node create-test-conversation.js ' + user.uid);
    })();
    `);
  }
})();