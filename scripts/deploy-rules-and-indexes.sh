#!/bin/bash

echo "Deploying updated Firestore security rules..."
firebase deploy --only firestore:rules

echo "Creating required Firestore indexes..."

# Index for buyer notifications
echo "Creating index for buyer notifications..."
firebase firestore:indexes --create-composite='{"collectionGroup":"offers","queryScope":"COLLECTION","fields":[{"fieldPath":"buyerId","order":"ASCENDING"},{"fieldPath":"hasUnreadMessagesBuyer","order":"ASCENDING"},{"fieldPath":"updatedAt","order":"DESCENDING"}]}'

# Index for seller notifications
echo "Creating index for seller notifications..."
firebase firestore:indexes --create-composite='{"collectionGroup":"offers","queryScope":"COLLECTION","fields":[{"fieldPath":"sellerId","order":"ASCENDING"},{"fieldPath":"hasUnreadMessagesSeller","order":"ASCENDING"},{"fieldPath":"updatedAt","order":"DESCENDING"}]}'

# Index for conversations sorted by last message time
echo "Creating index for conversations..."
firebase firestore:indexes --create-composite='{"collectionGroup":"conversations","queryScope":"COLLECTION","fields":[{"fieldPath":"participants","arrayConfig":"CONTAINS"},{"fieldPath":"lastMessageAt","order":"DESCENDING"}]}'

# Index for conversations with unread messages
echo "Creating index for unread conversations..."
firebase firestore:indexes --create-composite='{"collectionGroup":"conversations","queryScope":"COLLECTION","fields":[{"fieldPath":"unreadByUsers","arrayConfig":"CONTAINS"},{"fieldPath":"lastMessageAt","order":"DESCENDING"}]}'

echo "Deployment completed!"