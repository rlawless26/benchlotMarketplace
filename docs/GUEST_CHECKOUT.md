# Guest Checkout Implementation

This document explains how guest checkout works in Benchlot.

## Overview

Guest checkout allows users to purchase tools without creating an account. The cart data is stored in the browser's localStorage instead of Firestore. When processing payments, the cart data is sent directly to the Firebase Functions API.

## Implementation Details

### Client-Side (React)

1. **Guest Cart Storage**:
   - Guest carts are stored in localStorage with the key `benchlot_guest_cart`
   - The cart has an ID of `'guest-cart'` and an `isGuestCart: true` flag
   - All cart operations (add, update, remove) are performed on the localStorage data

2. **Stripe Checkout Component**:
   - The `StripeCheckout.js` component detects guest checkout via the `isGuestCheckout` prop
   - For guest checkout, it includes the full cart items and total in the payment intent request
   - It sends the guest email address and shipping/billing info to the server

### Server-Side (Firebase Functions)

1. **Create Payment Intent Endpoint**:
   - The `/create-payment-intent` endpoint checks for `isGuestCheckout` and `cartId === 'guest-cart'`
   - For guest carts, it uses the cart items and total directly from the request payload
   - It creates a Stripe payment intent with metadata indicating this is a guest checkout

2. **Confirm Payment Endpoint**:
   - The `/confirm-payment` endpoint handles guest checkout similar to the payment intent endpoint
   - It creates an order document in Firestore with the guest cart items
   - The order is marked with `isGuestOrder: true` and `userId: 'guest'`

## Data Flow

1. User adds items to cart (stored in localStorage)
2. User proceeds to checkout without logging in
3. Checkout component sends full cart data with the payment intent request
4. Server creates a payment intent directly from the provided cart data
5. After successful payment, server creates an order in Firestore
6. User is redirected to order confirmation page

## Testing

Use the `test-guest-checkout.js` script to test the guest checkout flow:

```bash
node test-guest-checkout.js
```

## Common Issues

1. **"Cart not found" error**: 
   - This occurs when the guest cart data is not properly included in the request
   - Check that `cartItems` and `cartTotal` are correctly set in the payload

2. **Webhook handling**: 
   - For guest orders, the webhook processor should check `paymentIntent.metadata.isGuestCheckout`
   - Guest orders won't have a cart in Firestore, so use the payment intent metadata

## Future Improvements

1. Ability to convert guest orders to user accounts
2. Email receipt for guest orders
3. Guest order lookup functionality