// Simple script to create a test conversation with a given user ID
const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp 
} = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAzzPSBiOb-vPqNtaEYQfq2FgTHI1uydJ4",
  authDomain: "benchlot-6d64e.firebaseapp.com",
  projectId: "benchlot-6d64e",
  storageBucket: "benchlot-6d64e.firebasestorage.app",
  messagingSenderId: "261795762325",
  appId: "1:261795762325:web:088e8fbcfaa2f8c6530b9c",
  measurementId: "G-EDNXNY6RYM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to create a test conversation
async function createSimpleConversation() {
  try {
    // Get user ID from command line argument
    const userId = process.argv[2];
    
    if (!userId) {
      console.error('Please provide your user ID as the argument');
      console.log('Usage: node simple-create-conversation.js YOUR_USER_ID');
      process.exit(1);
    }
    
    console.log(`Creating a test conversation for user ID: ${userId}`);
    
    // Create a fake other user
    const testUserId = 'test-user-' + Math.floor(Math.random() * 1000000);
    
    // Create conversation document
    const conversationsCollection = collection(db, 'conversations');
    const conversationRef = await addDoc(conversationsCollection, {
      participants: [userId, testUserId],
      participantNames: {
        [userId]: 'You',
        [testUserId]: 'Test User'
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
      lastMessageText: 'This is a test message',
      unreadByUsers: [userId],
      status: 'active'
    });
    
    console.log(`Created conversation with ID: ${conversationRef.id}`);
    
    // Add test messages
    const messagesCollection = collection(db, 'conversations', conversationRef.id, 'messages');
    
    // Message from the test user
    await addDoc(messagesCollection, {
      senderId: testUserId,
      text: 'Hello there! This is a test message from another user.',
      type: 'text',
      isRead: false,
      createdAt: serverTimestamp()
    });
    
    // Add a small delay for timestamps to be different
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Message from the actual user
    await addDoc(messagesCollection, {
      senderId: userId,
      text: 'Hi! This is a test reply to test the conversation view.',
      type: 'text',
      isRead: true,
      createdAt: serverTimestamp()
    });
    
    // Add a small delay for timestamps to be different
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Another message from the test user
    await addDoc(messagesCollection, {
      senderId: testUserId,
      text: 'Great! Let\'s test the messaging features. How does everything look?',
      type: 'text',
      isRead: false,
      createdAt: serverTimestamp()
    });
    
    console.log('Added test messages to conversation');
    console.log('Done! You should now see this conversation in your Messages page.');
    console.log('Go to: http://localhost:3000/messages');
    
  } catch (error) {
    console.error('Error creating test conversation:', error);
  }
}

// Run the function
createSimpleConversation();