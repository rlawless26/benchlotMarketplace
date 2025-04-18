// Script to create a test conversation with mock data
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

// Function to create a mock conversation
async function createMockConversation() {
  try {
    // Mock user IDs (replace these with your real user ID when testing)
    // For testing, you should replace at least mockUserId1 with your actual user ID
    const mockUserId1 = process.argv[2] || 'replace-with-your-user-id';
    const mockUserId2 = 'mock-user-id-2';
    
    if (mockUserId1 === 'replace-with-your-user-id') {
      console.error('Please provide your actual user ID as the first argument');
      console.log('Usage: node create-test-conversation.js YOUR_USER_ID');
      console.log('Note: You can find your user ID in the Firebase Authentication console');
      process.exit(1);
    }
    
    console.log(`Creating a test conversation with user ID: ${mockUserId1}`);
    
    // Create conversation document
    const conversationsCollection = collection(db, 'conversations');
    const conversationRef = await addDoc(conversationsCollection, {
      participants: [mockUserId1, mockUserId2],
      participantNames: {
        [mockUserId1]: 'You',
        [mockUserId2]: 'Test User'
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
      lastMessageText: 'This is a test message',
      unreadByUsers: [mockUserId1],
      status: 'active'
    });
    
    console.log(`Created conversation with ID: ${conversationRef.id}`);
    
    // Add test messages
    const messagesCollection = collection(db, 'conversations', conversationRef.id, 'messages');
    
    // Message from the test user
    await addDoc(messagesCollection, {
      senderId: mockUserId2,
      text: 'Hello there! This is a test message from the other user.',
      type: 'text',
      isRead: false,
      createdAt: serverTimestamp()
    });
    
    // Add a small delay for timestamps to be different
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Message from you
    await addDoc(messagesCollection, {
      senderId: mockUserId1,
      text: 'Hi! This is a test reply to test the conversation view.',
      type: 'text',
      isRead: true,
      createdAt: serverTimestamp()
    });
    
    // Add a small delay for timestamps to be different
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Another message from the test user
    await addDoc(messagesCollection, {
      senderId: mockUserId2,
      text: 'Great! Let\'s test the messaging features. How does everything look?',
      type: 'text',
      isRead: false,
      createdAt: serverTimestamp()
    });
    
    console.log('Added test messages to conversation');
    console.log('Done! You should now see this conversation in your Messages page.');
    console.log(`Be sure to log in with the user ID: ${mockUserId1}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the function
createMockConversation();