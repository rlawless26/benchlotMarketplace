# SendGrid Email Integration

## Overview

Benchlot uses SendGrid to send transactional emails for various user interactions. This document describes the implementation, configuration, and usage of the SendGrid integration.

## Email Types

The system supports the following email types:

1. **Account Creation (Welcome)** - Sent when a user creates a new account
2. **Password Reset** - Sent when a user requests a password reset
3. **Listing Published** - Sent to a seller when their listing is published
4. **Message Received** - Sent when a user receives a message
5. **Offer Received** - Sent to a seller when they receive an offer

## Implementation Details

### Core Components

1. **Email Service Module** (`/functions/emailService.js`)
   - Manages the SendGrid integration
   - Handles all email templates and sending logic
   - Provides detailed error reporting

2. **API Endpoints** (`/functions/index.js`)
   - Exposes HTTP endpoints for sending emails
   - Handles request validation
   - Manages CORS and preflight requests

3. **Client-Side Utility** (`/src/utils/emailService.js`)
   - Provides easy-to-use functions for the frontend
   - Handles API communication with the Firebase Functions

### SendGrid Configuration

The integration uses the following SendGrid components:

1. **API Key**: Used for authentication with the SendGrid API
   - Name: `benchlot-firebase-functions`
   - Permissions: Mail Send (Full Access), Template Engine (Read Access)

2. **Email Templates**: Dynamic templates for each email type
   - Template IDs are stored in the `TEMPLATE_IDS` object
   - Templates use SendGrid's Dynamic Templates feature

3. **Sender Identity**: All emails are sent from `notifications@benchlot.com`
   - This email is verified in SendGrid

## Usage Guide

### Sending Emails from Client-Side

```javascript
import * as emailService from '../../utils/emailService';

// Example: Send welcome email
await emailService.sendAccountCreationEmail(userEmail, firstName);

// Example: Send password reset email
await emailService.sendPasswordResetEmail(userEmail, resetLink);

// Example: Send listing published notification
await emailService.sendListingPublishedEmail(sellerEmail, listingDetails);
```

### Sending Emails from Firebase Functions

```javascript
const emailService = require('./emailService');

// Example: Send welcome email
await emailService.sendAccountCreationEmail(userEmail, firstName);

// Example function that sends an email when triggered
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
  await emailService.sendAccountCreationEmail(user.email);
});
```

## Troubleshooting

### Common Issues

1. **Unauthorized Errors**
   - Check if the SendGrid API key is correct
   - Verify that the API key has the proper permissions

2. **Missing Template Errors**
   - Ensure the template ID exists in SendGrid
   - Check if the template ID in code matches the one in SendGrid

3. **Email Not Delivered**
   - Check if the sender email is verified in SendGrid
   - Look for rate limiting or spam filtering issues

### Debugging Tips

1. **Check Firebase Functions Logs**
   - Contains detailed error messages and email sending status
   - Shows SendGrid API responses

2. **Test with the Test Endpoint**
   - Use the `send-test-email` endpoint to verify overall email functionality
   - Example: `POST /api/send-test-email` with body `{ "email": "test@example.com" }`

3. **SendGrid Activity Feed**
   - Check the SendGrid dashboard for email delivery status
   - Provides details on bounces, blocks, and spam reports

## Maintenance

### Adding New Email Templates

1. Create a new template in SendGrid
2. Add the template ID to the `TEMPLATE_IDS` object
3. Create a new function in `emailService.js` for the template
4. Add an API endpoint in `index.js` if needed
5. Create a client-side function in `src/utils/emailService.js`

### Updating Existing Templates

1. Make changes to the template in SendGrid
2. No code changes required unless template variables change
3. If variables change, update the corresponding function in `emailService.js`

## Security Considerations

1. The SendGrid API key is stored directly in the code for reliability
2. API key has limited permissions to enhance security
3. Email requests are validated to prevent abuse

## Future Improvements

1. **Error Reporting**: Add structured error reporting and alerts
2. **Rate Limiting**: Implement rate limiting for email endpoints
3. **Templates**: Enhance email templates with more personalization
4. **Secret Management**: Consider migrating to Firebase Secret Manager for API key

## Testing

A dedicated test script is available at `/functions/test-api-email.js` to verify the email functionality. Use it to test the API endpoints:

```bash
node test-api-email.js your-test-email@example.com
```