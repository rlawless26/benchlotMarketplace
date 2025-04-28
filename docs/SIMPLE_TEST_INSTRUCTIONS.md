# Simple Testing Instructions

## Getting Your User ID

1. Start the app in development mode:
   ```
   npm start
   ```

2. Open your browser to http://localhost:3000

3. Log in to your account

4. Look at the bottom-right corner of the screen for your User ID (added temporarily for testing)

5. Copy the User ID displayed there

## Creating a Test Conversation

Once you have your User ID, create a test conversation by running:

```bash
node simple-create-conversation.js YOUR_USER_ID
```

Replace "YOUR_USER_ID" with the ID you copied.

## Testing the Messages

1. Navigate to http://localhost:3000/messages
2. Click on the "Direct Messages" tab
3. You should see a new conversation with "Test User"
4. Click on the conversation to view and reply to messages