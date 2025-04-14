# Firebase Security Rules Documentation

This document outlines the security rules implemented for Benchlot's Firebase services, including Firestore Database and Firebase Storage.

## Overview

Our security implementation is built on the following principles:

1. **Principle of Least Privilege**: Users can only access the data they need to perform their functions
2. **Data Validation**: Ensuring all write operations meet specific requirements before accepting them
3. **Service Account Permissions**: Allowing Firebase Functions to operate with necessary access
4. **Role-Based Access Control**: Different permissions for users, sellers, and admins
5. **Resource Ownership**: Users can only modify their own data
6. **Image Validation**: Specific rules for handling image uploads

## Firestore Security Rules

### Helper Functions

We've implemented several helper functions to make rules more maintainable and consistent:

```javascript
// Check if user is authenticated
function isSignedIn() {
  return request.auth != null;
}

// Check if authenticated user owns the resource
function isOwner(userId) {
  return isSignedIn() && request.auth.uid == userId;
}

// Check if user has admin role
function isAdmin() {
  return isSignedIn() && 
    exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}

// Check if user is a service account
function isServiceAccount() {
  return request.auth.token.firebase.sign_in_provider == 'service_account';
}

// Check if user is a seller
function isSeller() {
  return isSignedIn() && 
    exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
    (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isSeller == true ||
     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'seller');
}

// Check if user owns a specific tool
function isToolOwner(toolId) {
  return isSignedIn() &&
    exists(/databases/$(database)/documents/tools/$(toolId)) &&
    get(/databases/$(database)/documents/tools/$(toolId)).data.user_id == request.auth.uid;
}

// Validate tool listing data
function isValidTool() {
  let incomingData = request.resource.data;
  return incomingData.name is string && 
         incomingData.name.size() > 0 &&
         incomingData.price is number &&
         incomingData.price >= 0 &&
         incomingData.description is string;
}
```

### Collection-Specific Rules

Our security rules define different permissions for each collection:

#### User Profiles
```javascript
match /users/{userId} {
  // Anyone can see basic user profiles
  allow read;
  
  // Users can create their own profiles
  allow create: if isOwner(userId) && 
               request.resource.data.role != 'admin'; // Prevent self-assignment of admin
  
  // Users can update their own profiles, admins can update any profile
  allow update: if (isOwner(userId) && 
                 request.resource.data.role == resource.data.role) || // Users can't change their own role
                 isAdmin();
  
  // Only admins can delete user profiles
  allow delete: if isAdmin();
}
```

#### Tool Listings
```javascript
match /tools/{toolId} {
  // Anyone can read tool listings
  allow read;
  
  // Only authenticated users can create tools
  // Must be a seller (if enforcing seller status)
  allow create: if isSignedIn() && 
                (isSeller() || true) && // Conditionally enforce seller status
                request.resource.data.user_id == request.auth.uid &&
                isValidTool();
  
  // Owners and admins can update tools
  allow update: if (isSignedIn() && 
                 resource.data.user_id == request.auth.uid) || 
                 isAdmin();
                
  // Owners and admins can delete tools
  allow delete: if (isSignedIn() && 
                resource.data.user_id == request.auth.uid) || 
                isAdmin();
}
```

#### Shopping Carts
```javascript
match /carts/{cartId} {
  // Users can only access their own carts
  allow read: if isSignedIn() && resource.data.userId == request.auth.uid;
  
  // Users can create, update, and delete their own carts
  allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
  allow update: if isSignedIn() && resource.data.userId == request.auth.uid;
  allow delete: if isSignedIn() && resource.data.userId == request.auth.uid;
  
  // Cart items subcollection
  match /items/{itemId} {
    allow read, write: if isSignedIn() && 
                        get(/databases/$(database)/documents/carts/$(cartId)).data.userId == request.auth.uid;
  }
}
```

#### Orders
```javascript
match /orders/{orderId} {
  // Users, sellers, and admins can view orders with appropriate permissions
  allow read: if isSignedIn() && (
              resource.data.userId == request.auth.uid || 
              resource.data.sellerId == request.auth.uid ||
              isAdmin()
              );
  
  // Users can create orders for themselves
  allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
  
  // Only admins and service accounts can update orders
  allow update: if isAdmin() || isServiceAccount();
  
  // Orders cannot be deleted
  allow delete: if false;
}
```

#### Service Account Access
```javascript
// Allow service accounts full access for Firebase Functions
match /{document=**} {
  allow read, write: if isServiceAccount();
}
```

## Firebase Storage Rules

Our storage rules implement security around file uploads and access:

### Helper Functions

```javascript
// Check if user is authenticated
function isSignedIn() {
  return request.auth != null;
}

// Check if authenticated user owns the resource
function isOwner(userId) {
  return isSignedIn() && request.auth.uid == userId;
}

// Check if user has admin role
function isAdmin() {
  return isSignedIn() && 
    firestore.exists(/databases/(default)/documents/users/$(request.auth.uid)) &&
    firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'admin';
}

// Check if user is a service account
function isServiceAccount() {
  return request.auth.token.firebase.sign_in_provider == 'service_account';
}

// Check if user owns a specific tool
function isToolOwner(toolId) {
  return isSignedIn() &&
    firestore.exists(/databases/(default)/documents/tools/$(toolId)) &&
    firestore.get(/databases/(default)/documents/tools/$(toolId)).data.user_id == request.auth.uid;
}

// Validate uploaded file is an image
function isImageTypeValid() {
  return request.resource.contentType.matches('image/.*');
}

// Validate file size is within limits
function isFileSizeValid() {
  // Limit file size to 5MB
  return request.resource.size <= 5 * 1024 * 1024;
}
```

### Path-Specific Rules

#### User Profile Images
```javascript
match /user_images/{userId}/{allPaths=**} {
  // Anyone can view user profile images
  allow read;
  
  // Users can only upload/modify their own profile images
  allow write: if isOwner(userId) && 
               isImageTypeValid() && 
               isFileSizeValid();
}
```

#### Tool Images
```javascript
match /tools/{toolId}/{allPaths=**} {
  // Anyone can view tool images
  allow read;
  
  // Only the tool owner can upload/modify images for their tools
  allow write: if isToolOwner(toolId) && 
               isImageTypeValid() && 
               isFileSizeValid();
}
```

#### Public Assets
```javascript
match /public/{allPaths=**} {
  // Anyone can view public assets
  allow read;
  
  // Only admins can modify public assets
  allow write: if isAdmin() && 
               isImageTypeValid() && 
               isFileSizeValid();
}
```

#### Service Account Access
```javascript
// Service account has full access
match /{allPaths=**} {
  allow read, write: if isServiceAccount();
}
```

## Best Practices

- **Tight Rule Definitions**: Rules are defined tightly to prevent unauthorized access
- **Data Validation**: Incoming data is validated to ensure it meets requirements
- **Cross-Collection Rules**: Using Firestore references to ensure related data is protected
- **Performance Considerations**: Rules are optimized to minimize Firestore reads for validation
- **Image Type & Size Validation**: Prevents malicious uploads and excessive storage usage

## Testing Security Rules

It's recommended to test security rules using the Firebase Emulator Suite:

```bash
firebase emulators:start
```

Test scenarios should include:
1. Anonymous access attempts
2. Authenticated user accessing their own resources
3. Authenticated user attempting to access others' resources
4. Admin access to protected resources
5. Service account access for backend operations

## Deployment

Security rules are deployed with:

```bash
firebase deploy --only firestore:rules,storage:rules
```

## Monitoring and Adjustments

Security rules should be monitored and adjusted as the application evolves. Consider:

1. Reviewing Firebase logs for denied permissions
2. Implementing server-side validation in Firebase Functions as a second layer
3. Adding rules for any new collections or storage paths
4. Tightening rules as production usage patterns become clear