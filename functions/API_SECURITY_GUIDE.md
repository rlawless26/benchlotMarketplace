# API Keys and Secrets Security Guide

## Overview
This guide provides best practices for handling API keys and secrets in the Benchlot application to prevent accidental exposure of sensitive credentials.

## Never Commit API Keys to Git

### ⚠️ IMPORTANT: 
**NEVER hardcode API keys, passwords, or other secrets directly in your code.**

API keys should always be:
1. Stored as environment variables
2. Loaded at runtime from secure sources
3. Never committed to version control

## Proper Ways to Handle API Keys

### For Firebase Functions

1. **Use environment variables:**
   ```javascript
   // CORRECT way to use API keys
   const apiKey = process.env.SENDGRID_API_KEY;
   
   if (!apiKey) {
     console.error('API key not configured');
     return { success: false, error: 'Missing API key' };
   }
   ```

2. **Set environment variables in Firebase:**
   ```bash
   firebase functions:config:set sendgrid.apikey="YOUR_API_KEY_HERE"
   ```

3. **Access Firebase environment variables:**
   ```javascript
   const functions = require('firebase-functions');
   const apiKey = functions.config().sendgrid.apikey;
   ```

### For Local Development

1. **Create a `.env` file:**
   - Copy `.env.example` to `.env`
   - Add your actual API keys
   - Make sure `.env` is in your `.gitignore`

2. **Use `dotenv` package:**
   ```javascript
   require('dotenv').config();
   const apiKey = process.env.SENDGRID_API_KEY;
   ```

## What to Do If Secrets Are Exposed

If API keys or secrets are accidentally committed:

1. **Immediately revoke/rotate the exposed keys**
   - Go to SendGrid, Stripe, or other service dashboards
   - Generate new API keys
   - Revoke the exposed keys

2. **Remove secrets from Git history:**
   - Use tools like `git-filter-repo` or BFG Repo Cleaner
   - Follow GitHub's guide: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository

3. **Update all affected systems with new keys**

## Resources

- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning)
- [Firebase Environment Configuration](https://firebase.google.com/docs/functions/config-env)
- [dotenv Documentation](https://github.com/motdotla/dotenv)