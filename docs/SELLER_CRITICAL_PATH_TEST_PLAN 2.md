# Benchlot Seller Journey Critical Path Test Plan

This document outlines the critical path for testing the core seller functionality on Benchlot. The focus is on ensuring that the essential seller journey works correctly, rather than optimizing the user experience at this stage.

## Critical Path Overview

The critical path for a Benchlot seller consists of the following key stages:

1. **Account Creation & Authentication**
   - Sign up as a new Benchlot user
   - Verify email address
   - Log in successfully

2. **Seller Onboarding**
   - Complete seller application form
   - Submit required identification and business information
   - Complete Stripe Connect onboarding
   - Verify bank account for payouts

3. **Listing Management**
   - Create a new tool listing with all required fields
   - Upload photos successfully
   - Edit listing details
   - Manage listing status (active, sold, etc.)

4. **Communication & Offers**
   - Receive notifications about listing activity
   - Respond to buyer inquiries via messaging system
   - Receive and respond to offers (accept, counter, decline)

5. **Order Processing**
   - Confirm sale
   - Arrange shipping or pickup
   - Mark item as shipped
   - Update tracking information

6. **Payment Processing**
   - Receive payment to connected bank account
   - Access earnings history
   - View transaction details and fees

## Detailed Test Plan

The accompanying spreadsheet (`SELLER_JOURNEY_TEST_PLAN.xlsx`) contains detailed test cases for each step of the critical seller journey, organized by functional area. Each test case includes:

- Task Name: Specific action to test
- URL/Location: Where the action takes place
- Expected Result: What should happen
- Test Result: Pass, Fail, or Needs Work
- Notes: Observations, bugs, or improvement suggestions

The spreadsheet is organized into tabs for different testing environments:
- Desktop (Chrome)
- Desktop (Safari)
- Desktop (Firefox)
- Mobile (iOS)
- Mobile (Android)

## Testing Priority

When conducting tests, focus on the following priorities:

1. **Functional Correctness**: Does each step complete successfully?
2. **Data Persistence**: Is information saved correctly between steps?
3. **Critical Errors**: Are there any blockers that prevent completion?
4. **Notifications**: Do emails and in-app notifications work properly?
5. **Security**: Are there any obvious security concerns?

## Test User Setup

For consistent testing, use the following test accounts:
- Test Seller: seller.test@benchlot.com / BenchTest123!
- Test Buyer: buyer.test@benchlot.com / BenchTest123!

Use Stripe's test card numbers for payment testing:
- Success: 4242 4242 4242 4242
- Authentication Required: 4000 0025 0000 3155

## Reporting Issues

When documenting issues:
1. Be specific about the steps that led to the problem
2. Note the browser/device/OS used
3. Include screenshots when possible
4. Note workarounds if discovered