# Manual Test Data Creation

If you're having trouble with the scripts, you can manually create test data through the Firebase console.

## Creating a Test Conversation Manually

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project (benchlot-6d64e)
3. Navigate to Firestore Database in the left sidebar
4. Create a new collection named "conversations" if it doesn't exist

### Step 1: Create a Conversation Document

Create a new document in the "conversations" collection with the following fields:

- participants (array):
  - [YOUR_USER_ID, "test-user-123"]
- participantNames (map):
  - YOUR_USER_ID: "You"
  - test-user-123: "Test User"
- createdAt: current timestamp
- updatedAt: current timestamp
- lastMessageAt: current timestamp
- lastMessageText: "This is a test message"
- unreadByUsers (array): [YOUR_USER_ID]
- status: "active"

Replace YOUR_USER_ID with your actual Firebase user ID.

### Step 2: Create Messages

1. Inside the conversation document you just created, create a subcollection called "messages"
2. Add the following message documents:

**Message 1:**
- senderId: "test-user-123"
- text: "Hello there! This is a test message from another user."
- type: "text"
- isRead: false
- createdAt: current timestamp

**Message 2:**
- senderId: YOUR_USER_ID
- text: "Hi! This is a test reply to test the conversation view."
- type: "text" 
- isRead: true
- createdAt: current timestamp

**Message 3:**
- senderId: "test-user-123"
- text: "Great! Let's test the messaging features. How does everything look?"
- type: "text"
- isRead: false 
- createdAt: current timestamp

## Viewing Your Test Conversation

After creating the test data, go to your application and navigate to the Messages page. Click on the "Direct Messages" tab to see your test conversation.