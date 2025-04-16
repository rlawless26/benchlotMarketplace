# SendGrid Integration Setup Guide for Benchlot

This guide walks through the process of setting up and configuring SendGrid email integration with Firebase Functions for Benchlot.

## Overview

Benchlot uses SendGrid to send transactional emails to users for:
- Account creation (welcome emails)
- Password reset
- Listing publications
- Message notifications
- Offer notifications

## Prerequisites

1. A SendGrid account
2. Firebase project with Functions enabled
3. Firebase CLI installed and configured

## Step 1: Create a SendGrid API Key

1. Log in to your [SendGrid account](https://app.sendgrid.com/)
2. Navigate to Settings > API Keys
3. Click "Create API Key"
4. Name your API key `benchlot-firebase-functions`
5. Select "Restricted Access" with the following permissions:
   - Mail Send: Full Access
   - Template Engine: Read-only Access
6. Click "Create & View"
7. Copy your API key (it starts with `SG.`) - you won't be able to see it again!

## Step 2: Set Up Email Templates in SendGrid

We use the following templates:

| Email Type | Template ID | Description |
|------------|-------------|-------------|
| Account Creation | d-280057e931044ee2ac3cce7d54a216e3 | Welcome email for new users |
| Password Reset | d-7d448b96ded74ce0a278267611e7ac4c | Password reset instructions |
| Listing Published | d-55c66b37ad7243c4a2a0ee6630b01922 | Notification when a listing is published |
| Message Received | d-0f5098870f9b45b695e9d63274c65e54 | Notification when a user receives a message |
| Offer Received | d-daa56a7c83dd49cc9ad18f47db974f11 | Notification when a seller receives an offer |

Make sure these templates exist in your SendGrid account. If you need to create new templates, update the template IDs in `/functions/emailService.js`.

## Step 3: Verify Sender Identity

1. In your SendGrid dashboard, go to Settings > Sender Authentication
2. Verify a domain or at least an email address
3. The default sender email is `notifications@benchlot.com` - update this in the code if using a different sender

## Step 4: Deploy Firebase Functions with Environment Variables

We've created a deployment script to help with this process. To use it:

1. Navigate to the functions directory:
   ```bash
   cd /path/to/benchlot/functions
   ```

2. Run the deployment script:
   ```bash
   node deploy-script.js
   ```

3. When prompted, enter:
   - Your SendGrid API key (starts with `SG.`)
   - Your Stripe secret key (if applicable)
   - Your app URL (defaults to `https://benchlot.com`)

The script will update the environment variables in your Firebase Functions and deploy them.

## Step 5: Test the Integration

You can test if your SendGrid integration is working by sending a test email:

```javascript
const axios = require('axios');

async function testEmail() {
  try {
    const response = await axios({
      method: 'post',
      url: 'https://YOUR_FIREBASE_FUNCTION_URL/send-test-email',
      data: {
        email: 'your-test-email@example.com'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testEmail();
```

Replace `YOUR_FIREBASE_FUNCTION_URL` with your actual Firebase Function URL.

## Troubleshooting

### Common Issues

1. **Unauthorized Error**:
   - Make sure your SendGrid API key is correct and has the right permissions
   - Check if the API key is properly set in your Firebase Functions environment

2. **Template Not Found Error**:
   - Verify that all template IDs in the code match your actual SendGrid templates

3. **Email Not Delivered**:
   - Check the Firebase Functions logs for any errors
   - Verify that your sender email is authorized in SendGrid
   - Check SendGrid's Activity feed to see if the email was sent and if there were any issues

### Checking Logs

You can view Firebase Functions logs with:

```bash
firebase functions:log
```

## Security Considerations

1. **API Key Security**: Never commit your SendGrid API key to your repository
2. **Environment Variables**: Always use environment variables for sensitive information
3. **Rate Limiting**: Consider implementing rate limiting to prevent abuse of email endpoints

## Updating Email Templates

If you need to modify email templates:

1. Update templates in SendGrid's Dynamic Templates section
2. No code changes required unless the template variables change
3. If adding new templates, update the template IDs in `/functions/emailService.js`

## Additional Resources

- [SendGrid Documentation](https://docs.sendgrid.com/)
- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [SendGrid + Firebase Tutorial](https://firebase.google.com/codelabs/sendgrid-firebase)