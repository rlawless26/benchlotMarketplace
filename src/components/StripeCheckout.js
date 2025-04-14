/**
 * Stripe Checkout Component
 * Handles payment processing with Stripe
 */
import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useCart } from '../firebase';
import { useAuth } from '../firebase';
import { useNavigate } from 'react-router-dom';

// Load Stripe outside of a component's render to avoid recreating the Stripe object
// This is your test publishable API key
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

// Firebase function API endpoint
const FIREBASE_API_URL = process.env.REACT_APP_FIREBASE_API_URL || 'https://stripeapi-sed2e4p6ua-uc.a.run.app';

// Styles for the CardElement
const cardStyle = {
  style: {
    base: {
      color: '#32325d',
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#aab7c4'
      }
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a'
    }
  }
};

// CheckoutForm component
const CheckoutForm = ({ clientSecret, cartId }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const { emptyCart } = useCart(); // Import the emptyCart function
  const navigate = useNavigate();
  
  const [succeeded, setSucceeded] = useState(false);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [disabled, setDisabled] = useState(true);
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      // Stripe.js has not loaded yet
      return;
    }
    
    setProcessing(true);
    
    // Confirm the payment
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement)
      }
    });
    
    if (result.error) {
      setError(`Payment failed: ${result.error.message}`);
      setProcessing(false);
    } else {
      if (result.paymentIntent.status === 'succeeded') {
        // Payment succeeded, create an order
        try {
          // Call the Firebase function to confirm payment and create order
          const response = await fetch(`${FIREBASE_API_URL}/confirm-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              paymentIntentId: result.paymentIntent.id,
              cartId: cartId
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error confirming payment');
          }
          
          const data = await response.json();
          setSucceeded(true);
          setError(null);
          setProcessing(false);
          
          // Clear the cart in the local state
          try {
            await emptyCart();
            console.log('Cart successfully cleared after purchase');
          } catch (cartError) {
            console.error('Error clearing cart:', cartError);
            // Continue with the purchase flow even if cart clearing fails
          }
          
          // Navigate to the order confirmation page
          setTimeout(() => {
            navigate(`/orders/${data.orderId}`);
          }, 2000);
        } catch (err) {
          console.error('Error confirming payment:', err);
          setError(`Payment succeeded, but order creation failed. Please contact support.`);
          setProcessing(false);
        }
      }
    }
  };
  
  // Handle card input change
  const handleChange = (event) => {
    // Listen for changes in the CardElement
    // and display any errors as the customer types their card details
    setDisabled(event.empty);
    setError(event.error ? event.error.message : '');
  };
  
  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <div className="mb-6">
        <label htmlFor="card-element" className="block text-sm font-medium text-gray-700 mb-1">
          Credit or debit card
        </label>
        <div className="border border-gray-300 rounded-md p-4 focus-within:ring-blue-500 focus-within:border-blue-500">
          <CardElement id="card-element" options={cardStyle} onChange={handleChange} />
        </div>
      </div>
      
      {/* Show any error that happens when processing the payment */}
      {error && (
        <div className="text-red-500 mb-4" role="alert">
          {error}
        </div>
      )}
      
      {/* Show success message upon completion */}
      {succeeded && (
        <div className="text-green-500 mb-4" role="alert">
          Payment successful! Redirecting to your order...
        </div>
      )}
      
      <button
        type="submit"
        disabled={processing || disabled || succeeded}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {processing ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
        ) : (
          `Pay Now`
        )}
      </button>
    </form>
  );
};

// Main StripeCheckout component
const StripeCheckout = ({ cartId, amount }) => {
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  
  useEffect(() => {
    // Create a payment intent using our deployed Firebase Function
    const createPaymentIntent = async () => {
      try {
        setLoading(true);
        
        console.log("Sending request to:", `${FIREBASE_API_URL}/create-payment-intent`);
        console.log("Request payload:", { cartId, userId: user.uid });
        
        // Call our deployed Firebase Function to create a payment intent
        const response = await fetch(`${FIREBASE_API_URL}/create-payment-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cartId,
            userId: user.uid,
          }),
        });
        
        console.log("Response status:", response.status);
        
        if (!response.ok) {
          let errorMessage = 'Error creating payment intent';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            console.error("Failed to parse error response:", e);
            // Try to get text content if JSON parsing fails
            try {
              const textContent = await response.text();
              console.log("Response text:", textContent);
              errorMessage = textContent || errorMessage;
            } catch (textError) {
              console.error("Failed to get response text:", textError);
            }
          }
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log("Payment intent created successfully:", data);
        setClientSecret(data.clientSecret);
      } catch (err) {
        console.error('Error creating payment intent:', err);
        setError(`Payment initialization failed: ${err.message}`);
        
        // TEMPORARY FALLBACK FOR TESTING ONLY - Remove in production
        console.warn("Using client-side fallback for testing only");
        // Create a fallback client secret for testing
        setClientSecret('pi_3Nh4sXPJSOllkrGg1gl70Iwi_secret_OV37frZ8dEPKCAmCGxNjwkdAk');
      } finally {
        setLoading(false);
      }
    };
    
    if (user && cartId && amount > 0) {
      createPaymentIntent();
    } else if (user && cartId) {
      setLoading(false);
    }
  }, [cartId, user, amount]);
  
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mb-2"></div>
          <p>Preparing payment...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <p className="text-center">
          Please try again later or contact support for assistance.
        </p>
      </div>
    );
  }
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
      
      {clientSecret && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm clientSecret={clientSecret} cartId={cartId} />
        </Elements>
      )}
    </div>
  );
};

export default StripeCheckout;