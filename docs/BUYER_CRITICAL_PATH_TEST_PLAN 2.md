# Benchlot Buyer Journey Critical Path Test Plan

This document outlines the critical path for testing the core buyer functionality on Benchlot. The focus is on ensuring that the essential buyer journey works correctly, rather than optimizing the user experience at this stage.

## Critical Path Overview

The critical path for a Benchlot buyer consists of the following key stages:

1. **Account Creation & Authentication**
   - Sign up as a new Benchlot user
   - Verify email address
   - Log in successfully
   - View and manage profile information

2. **Browsing & Discovery**
   - Browse the marketplace
   - Filter and search for tools
   - Sort and view listings
   - View detailed tool information

3. **Wishlist Management**
   - Save tools to wishlist
   - View wishlist
   - Remove items from wishlist

4. **Shopping Cart & Checkout**
   - Add items to cart
   - Manage cart contents
   - Complete checkout process
   - Process payment securely

5. **Order Management**
   - View order history
   - Track order status
   - Receive shipping notifications
   - Confirm receipt of items

6. **Communication & Offers**
   - Contact sellers
   - Exchange messages
   - Make offers on tools
   - Negotiate prices
   - Accept/decline offers

7. **After-Sale Activities**
   - Leave reviews
   - Process returns if needed
   - Contact support

## Detailed Test Plan

The accompanying spreadsheet (`BUYER_JOURNEY_TEST_PLAN.csv`) contains detailed test cases for each step of the critical buyer journey, organized by functional area. Each test case includes:

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
5. **Security**: Are there any obvious security concerns with payment processing?

## Test User Setup

For testing payments, use Stripe's test card numbers:
- Success: 4242 4242 4242 4242
- Authentication Required: 4000 0025 0000 3155
- Any future expiration date, any 3-digit CVC, and any ZIP code

## Reporting Issues

When documenting issues:
1. Be specific about the steps that led to the problem
2. Note the browser/device/OS used
3. Include screenshots when possible
4. Note workarounds if discovered