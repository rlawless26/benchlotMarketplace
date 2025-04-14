# Firestore Security Rules Guide

This document explains the Firebase security rules implementation for Benchlot, covering both Firestore and Storage security.

## Overview

Security rules are essential for protecting your Firebase data and ensuring that users can only access and modify the data they're authorized to. Benchlot uses a combination of authentication rules, user-based ownership rules, and service account access for Firebase Functions.

## Current Firestore Rules

The current Firestore security rules are defined in `firestore.rules`:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    
    function isServiceAccount() {
      return request.auth.token.firebase.sign_in_provider == 'service_account';
    }
    
    // Allow service accounts full access for Firebase Functions
    match /{document=**} {
      allow read, write: if isServiceAccount();
    }
    
    // User profiles
    match /users/{userId} {
      allow read;
      allow create: if isSignedIn() && request.auth.uid == userId;
      allow update: if isOwner(userId);
      allow delete: if false; // Prevent accidental deletion
    }
    
    // Tool listings
    match /tools/{toolId} {
      allow read;
      allow create: if isSignedIn();
      allow update: if isSignedIn() && resource.data.user_id == request.auth.uid;
      allow delete: if isSignedIn() && resource.data.user_id == request.auth.uid;
    }
    
    // Carts
    match /carts/{cartId} {
      allow read: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow update: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow delete: if isSignedIn() && resource.data.userId == request.auth.uid;
      
      // Cart items
      match /items/{itemId} {
        allow read: if isSignedIn() && get(/databases/$(database)/documents/carts/$(cartId)).data.userId == request.auth.uid;
        allow write: if isSignedIn() && get(/databases/$(database)/documents/carts/$(cartId)).data.userId == request.auth.uid;
      }
    }
    
    // Orders
    match /orders/{orderId} {
      allow read: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow update: if false; // Prevent updates to completed orders
    }
    
    // Diagnostics collection for service testing
    match /_diagnostics/{docId} {
      allow read, write: if isServiceAccount();
    }
  }
}
```

## Rule Breakdown

### Helper Functions

1. **isSignedIn()** - Checks if the user is authenticated
2. **isOwner(userId)** - Checks if the authenticated user matches the specified user ID
3. **isServiceAccount()** - Checks if the request is coming from a Firebase service account

### Service Account Access

```javascript
match /{document=**} {
  allow read, write: if isServiceAccount();
}
```

This rule allows Firebase Functions (using a service account) to access all Firestore collections. This is essential for the Stripe integration to work correctly.

### Collection-Specific Rules

#### Users Collection

```javascript
match /users/{userId} {
  allow read;
  allow create: if isSignedIn() && request.auth.uid == userId;
  allow update: if isOwner(userId);
  allow delete: if false; // Prevent accidental deletion
}
```

- Anyone can read user profiles
- Users can only create or update their own profiles
- User profile deletion is disabled to prevent accidental data loss

#### Tools Collection

```javascript
match /tools/{toolId} {
  allow read;
  allow create: if isSignedIn();
  allow update: if isSignedIn() && resource.data.user_id == request.auth.uid;
  allow delete: if isSignedIn() && resource.data.user_id == request.auth.uid;
}
```

- Tool listings are publicly readable
- Any signed-in user can create a tool listing
- Only the creator can update or delete their listings

#### Carts Collection

```javascript
match /carts/{cartId} {
  allow read: if isSignedIn() && resource.data.userId == request.auth.uid;
  allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
  allow update: if isSignedIn() && resource.data.userId == request.auth.uid;
  allow delete: if isSignedIn() && resource.data.userId == request.auth.uid;
  
  // Cart items
  match /items/{itemId} {
    allow read: if isSignedIn() && get(/databases/$(database)/documents/carts/$(cartId)).data.userId == request.auth.uid;
    allow write: if isSignedIn() && get(/databases/$(database)/documents/carts/$(cartId)).data.userId == request.auth.uid;
  }
}
```

- Users can only access their own carts and cart items
- The cart items subcollection access is controlled by checking the parent cart's owner

#### Orders Collection

```javascript
match /orders/{orderId} {
  allow read: if isSignedIn() && resource.data.userId == request.auth.uid;
  allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
  allow update: if false; // Prevent updates to completed orders
}
```

- Users can only read and create their own orders
- Order updates are disabled to preserve payment history integrity

## Storage Rules

The Storage security rules in `storage.rules` follow similar patterns, ensuring users can only upload and access their own files, with some public access for tool listing images.

## Deploying Security Rules

Deploy the security rules using:

```bash
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

## Testing Security Rules

You can test your security rules locally using the Firebase emulator suite:

```bash
firebase emulators:start
```

## Best Practices

1. **Least Privilege**: Grant the minimum access needed
2. **Validate Data**: Use validation rules to ensure data integrity
3. **Layer Security**: Combine rules with server-side validation in Functions
4. **Test Rules**: Always test security rules before deployment
5. **Monitor Access**: Use Firebase Analytics and Logging to monitor access patterns

## Common Issues

1. **Service Account Access**: If Firebase Functions can't access Firestore, check that the service account has the necessary permissions
2. **Complex Rules Performance**: Very complex rules can impact performance. Keep rules efficient.
3. **Rule Versioning**: Always specify the rules version at the top of your rules file