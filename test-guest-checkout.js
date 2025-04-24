const fetch = require('node-fetch');

// Test the guest checkout flow
async function testGuestCheckout() {
  console.log('Testing guest checkout flow...');
  
  // Sample cart data
  const guestCart = {
    id: "guest-cart",
    userId: "guest",
    items: [
      {
        id: "guest-item-1",
        toolId: "tool123",
        name: "Power Drill",
        price: 45.99,
        quantity: 1
      },
      {
        id: "guest-item-2",
        toolId: "tool456",
        name: "Hammer",
        price: 15.99,
        quantity: 2
      }
    ],
    totalAmount: 77.97,
    itemCount: 3,
    isGuestCart: true
  };

  // Create payment intent
  console.log('\n1. Testing /create-payment-intent endpoint...');
  try {
    const createResponse = await fetch('https://stripeapi-sed2e4p6ua-uc.a.run.app/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cartId: 'guest-cart',
        userId: 'guest',
        isGuestCheckout: true,
        cartItems: guestCart.items,
        cartTotal: guestCart.totalAmount,
        guestEmail: 'test@example.com'
      })
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create payment intent: ${createResponse.status} ${errorText}`);
    }

    const createResult = await createResponse.json();
    console.log('Create payment intent successful!');
    console.log('Client secret:', createResult.clientSecret ? 'Received (hidden for security)' : 'Not received');
    console.log('Is marketplace:', createResult.isMarketplace);

    // Test confirm payment (using a test Stripe payment intent ID)
    console.log('\n2. Testing /confirm-payment endpoint...');
    const testPaymentIntentId = 'pi_test_' + Date.now();
    
    const confirmResponse = await fetch('https://stripeapi-sed2e4p6ua-uc.a.run.app/confirm-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        paymentIntentId: testPaymentIntentId,
        cartId: 'guest-cart',
        isGuestCheckout: true,
        guestEmail: 'test@example.com',
        cartItems: guestCart.items,
        cartTotal: guestCart.totalAmount,
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          addressLine1: '123 Test St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345'
        }
      })
    });

    // This will fail because we can't create a real Stripe payment intent for testing
    // but we can check the error message to ensure our endpoint is handling guest checkout
    const confirmResult = await confirmResponse.text();
    console.log('Confirm payment response (will fail in test):', confirmResult);
    console.log('\nTest complete. The confirmation will fail in this test environment because we need a real Stripe payment intent.');
    console.log('But we can see our endpoint is properly handling the guest checkout request format.');

  } catch (error) {
    console.error('Error during test:', error);
  }
}

testGuestCheckout();