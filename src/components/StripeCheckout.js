/**
 * Stripe Checkout Component
 * Handles payment processing with Stripe including Apple Pay
 */
import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { 
  Elements, 
  CardElement, 
  useStripe, 
  useElements,
  PaymentRequestButtonElement
} from '@stripe/react-stripe-js';
import { useCart } from '../firebase';
import { useAuth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Shield, CreditCard, Lock } from 'lucide-react';

// Load Stripe outside of a component's render to avoid recreating the Stripe object
// This is your test publishable API key
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

// Firebase function API endpoint
const FIREBASE_API_URL = process.env.REACT_APP_FIREBASE_API_URL || 'https://stripeapi-sed2e4p6ua-uc.a.run.app';

// Styles for the CardElement
const cardStyle = {
  style: {
    base: {
      color: '#44403c', // stone-700
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#a8a29e' // stone-400
      }
    },
    invalid: {
      color: '#ef4444', // red-500
      iconColor: '#ef4444' // red-500
    }
  }
};

// CheckoutForm component
const CheckoutForm = ({ 
  clientSecret, 
  cartId, 
  amount, 
  shippingAddress, 
  billingAddress, 
  billingIsSameAsShipping, 
  isGuestCheckout = false,
  guestEmail = ''
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const { emptyCart } = useCart(); // Import the emptyCart function
  const navigate = useNavigate();
  
  const [succeeded, setSucceeded] = useState(false);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [disabled, setDisabled] = useState(true);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [showApplePay, setShowApplePay] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' or 'apple-pay'
  
  // Helper function to format name from first/last name fields
  const formatName = (address) => {
    if (address.firstName && address.lastName) {
      return `${address.firstName} ${address.lastName}`.trim();
    } else if (address.fullName) {
      return address.fullName;
    }
    return '';
  };
  
  // Common function to handle successful payment
  const handleSuccessfulPayment = async (paymentIntent) => {
    try {
      // Check if we're using a mock payment in development mode
      const isMockPayment = paymentIntent.id.includes('mock_') && process.env.NODE_ENV === 'development';
      
      if (isMockPayment) {
        console.log("Development mode: Simulating successful order creation for mock payment");
        
        // For guest checkout in development, simulate a successful order
        setSucceeded(true);
        setError(null);
        setProcessing(false);
        
        // Clear the cart in the local state
        try {
          await emptyCart();
        } catch (cartError) {
          console.error('Error clearing cart:', cartError);
        }
        
        // Generate a mock order ID and navigate to confirmation
        const mockOrderId = `order_mock_${Date.now()}`;
        setTimeout(() => {
          navigate(`/order-confirmation/${mockOrderId}`);
        }, 2000);
        
        return;
      }
      
      // Prepare cart data for guest checkout
      let guestCartData = null;
      if (isGuestCheckout && cartId === 'guest-cart') {
        try {
          const rawCartData = localStorage.getItem('benchlot_guest_cart');
          if (rawCartData) {
            guestCartData = JSON.parse(rawCartData);
          }
        } catch (error) {
          console.error('Error parsing guest cart data:', error);
        }
      }
      
      // Regular flow - Call the Firebase function to confirm payment and create order
      const payload = {
        paymentIntentId: paymentIntent.id,
        cartId: cartId,
        isGuestCheckout: isGuestCheckout,
        guestEmail: guestEmail || '',
      };
      
      // Add guest checkout specific data
      if (isGuestCheckout && cartId === 'guest-cart' && guestCartData) {
        payload.cartItems = guestCartData.items || [];
        payload.cartTotal = guestCartData.totalAmount || 0;
        payload.shippingAddress = shippingAddress;
        payload.billingAddress = billingIsSameAsShipping ? shippingAddress : billingAddress;
        
        // Log full payload for debugging
        console.log("Guest confirm payment payload:", JSON.stringify(payload, null, 2));
      } else {
        console.log("Standard confirm payment payload:", payload);
      }
      
      const response = await fetch(`${FIREBASE_API_URL}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        let errorMessage = 'Error confirming payment';
        try {
          const errorData = await response.json();
          console.error('Payment confirmation error response:', errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
          // Try to get the response text if JSON parsing fails
          try {
            const errorText = await response.text();
            console.error('Error response text:', errorText);
            errorMessage = errorText || errorMessage;
          } catch (textError) {
            console.error('Error getting response text:', textError);
          }
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setSucceeded(true);
      setError(null);
      setProcessing(false);
      
      // Clear the cart in the local state
      try {
        await emptyCart();
      } catch (cartError) {
        console.error('Error clearing cart:', cartError);
      }
      
      // Navigate to the order confirmation page
      setTimeout(() => {
        navigate(`/order-confirmation/${data.orderId}`);
      }, 2000);
    } catch (err) {
      console.error('Error confirming payment:', err);
      
      // In development mode, provide a more graceful fallback
      if (process.env.NODE_ENV === 'development') {
        console.warn("Development mode: Simulating order success despite backend error");
        setSucceeded(true);
        setError(null);
        setProcessing(false);
        
        // Clear the cart in the local state
        try {
          await emptyCart();
        } catch (cartError) {
          console.error('Error clearing cart:', cartError);
        }
        
        // Generate a mock order ID and navigate to confirmation
        const mockOrderId = `order_mock_${Date.now()}`;
        setTimeout(() => {
          navigate(`/order-confirmation/${mockOrderId}`);
        }, 2000);
      } else {
        // In production, show the actual error
        setError(`Payment succeeded, but order creation failed. Please contact support.`);
        setProcessing(false);
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      // Stripe.js has not loaded yet
      return;
    }
    
    setProcessing(true);
    
    // Prepare billing details
    let billingDetails = {};
    
    // If we have billing address (and it's different from shipping)
    if (!billingIsSameAsShipping && billingAddress) {
      billingDetails = {
        name: formatName(billingAddress),
        email: billingAddress.email || (isGuestCheckout ? guestEmail : user?.email) || '',
        phone: billingAddress.phone || '',
        address: {
          line1: billingAddress.addressLine1 || '',
          line2: billingAddress.addressLine2 || '',
          city: billingAddress.city || '',
          state: billingAddress.state || '',
          postal_code: billingAddress.postalCode || '',
          country: billingAddress.country || 'US'
        }
      };
    } else if (shippingAddress) {
      // Otherwise use shipping address as billing
      billingDetails = {
        name: formatName(shippingAddress),
        email: shippingAddress.email || (isGuestCheckout ? guestEmail : user?.email) || '',
        phone: shippingAddress.phone || '',
        address: {
          line1: shippingAddress.addressLine1 || '',
          line2: shippingAddress.addressLine2 || '',
          city: shippingAddress.city || '',
          state: shippingAddress.state || '',
          postal_code: shippingAddress.postalCode || '',
          country: shippingAddress.country || 'US'
        }
      };
    }
    
    // Check if we're using a mock client secret for dev mode
    const isMockSecret = clientSecret && (
      clientSecret.includes('devfallback') || 
      clientSecret.includes('guestcart') || 
      clientSecret.includes('mockstripe') ||
      clientSecret.includes('mockguestcart')
    );
    
    let result;
    
    if (isMockSecret && process.env.NODE_ENV === 'development') {
      // In development with mock secret, simulate a successful payment
      console.log("Development mode: Simulating successful payment with mock client secret");
      result = {
        paymentIntent: {
          id: `pi_mock_${Date.now()}`,
          status: 'succeeded',
          amount: Math.round(amount * 100) // Convert to cents
        }
      };
    } else {
      // Normal Stripe payment flow
      result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: billingDetails
        }
      });
    }
    
    if (result.error) {
      console.error('Stripe payment error:', result.error);
      
      // Convert technical Stripe error messages to user-friendly ones
      let friendlyMessage = 'Your payment could not be processed. Please check your card details and try again.';
      
      if (result.error.message.includes('card was declined')) {
        friendlyMessage = 'Your card was declined. Please try another payment method.';
      } else if (result.error.message.includes('expired')) {
        friendlyMessage = 'Your card has expired. Please try another card.';
      } else if (result.error.message.includes('insufficient funds')) {
        friendlyMessage = 'Your card has insufficient funds. Please try another payment method.';
      } else if (result.error.message.includes('incorrect number')) {
        friendlyMessage = 'Your card number is incorrect. Please check and try again.';
      } else if (result.error.message.includes('invalid cvc')) {
        friendlyMessage = 'Your card security code (CVC) is invalid. Please check and try again.';
      }
      
      setError(friendlyMessage);
      setProcessing(false);
    } else {
      if (result.paymentIntent.status === 'succeeded') {
        // Handle successful payment
        await handleSuccessfulPayment(result.paymentIntent);
      }
    }
  };
  
  // Initialize Apple Pay
  useEffect(() => {
    if (stripe) {
      const pr = stripe.paymentRequest({
        country: 'US',
        currency: 'usd',
        total: {
          label: 'Benchlot Purchase',
          amount: Math.round(amount * 100), // Convert to cents
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });

      // Check if the Payment Request is supported
      pr.canMakePayment().then(result => {
        console.log("Payment Request can make payment result:", result);
        
        // If in development mode, show Apple Pay for testing even if device doesn't support it
        if (process.env.NODE_ENV === 'development') {
          console.log("In development mode - showing Apple Pay for testing");
          setPaymentRequest(pr);
          setShowApplePay(true);
        } else if (result && result.applePay) {
          console.log("Apple Pay is supported");
          setPaymentRequest(pr);
          setShowApplePay(true);
        } else {
          console.log("Apple Pay is not supported on this device/browser");
        }
      });

      // Handle payment method
      pr.on('paymentmethod', async (e) => {
        setProcessing(true);
        
        // If guest checkout, ensure additional data is included in billing data
        const options = { 
          payment_method: e.paymentMethod.id
        };
        
        // Add additional billing details for Apple Pay for guest checkout
        if (isGuestCheckout && e.payerName) {
          // Apple Pay doesn't always provide complete billing details
          // so we append them from our stored information
          options.payment_method.billing_details = {
            name: e.payerName || formatName(shippingAddress),
            email: e.payerEmail || guestEmail || shippingAddress.email || '',
            phone: e.payerPhone || shippingAddress.phone || '',
            address: e.payerAddress || {
              line1: shippingAddress.addressLine1 || '',
              line2: shippingAddress.addressLine2 || '',
              city: shippingAddress.city || '',
              state: shippingAddress.state || '',
              postal_code: shippingAddress.postalCode || '',
              country: shippingAddress.country || 'US'
            }
          };
        }
        
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
          clientSecret,
          options,
          { handleActions: false }
        );

        if (confirmError) {
          // Report to the browser that the payment failed
          e.complete('fail');
          
          console.error('Apple Pay confirmation error:', confirmError);
          
          // Convert technical Stripe error messages to user-friendly ones
          let friendlyMessage = 'Your payment could not be processed. Please check your card details and try again.';
          
          if (confirmError.message.includes('card was declined')) {
            friendlyMessage = 'Your card was declined. Please try another payment method.';
          } else if (confirmError.message.includes('expired')) {
            friendlyMessage = 'Your card has expired. Please try another card.';
          } else if (confirmError.message.includes('insufficient funds')) {
            friendlyMessage = 'Your card has insufficient funds. Please try another payment method.';
          }
          
          setError(friendlyMessage);
          setProcessing(false);
          return;
        }
        
        // Report to the browser that the confirmation was successful
        e.complete('success');
        
        if (paymentIntent.status === 'succeeded') {
          // Handle successful payment same as card
          await handleSuccessfulPayment(paymentIntent);
        } else if (paymentIntent.status === 'requires_action') {
          const { error, paymentIntent: updatedIntent } = await stripe.confirmCardPayment(clientSecret);
          
          if (error) {
            setError(`Payment failed: ${error.message}`);
            setProcessing(false);
          } else {
            await handleSuccessfulPayment(updatedIntent);
          }
        }
      });
    }
  }, [
    stripe, 
    amount, 
    clientSecret, 
    isGuestCheckout, 
    guestEmail, 
    shippingAddress,
    billingAddress,
    billingIsSameAsShipping,
    cartId,
    navigate,
    emptyCart
  ]);
  
  // Handle card input change
  const handleChange = (event) => {
    // Listen for changes in the CardElement
    // and display any errors as the customer types their card details
    setDisabled(event.empty);
    setError(event.error ? event.error.message : '');
  };
  
  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      {/* Payment method selection tabs */}
      <div className="flex border-b mb-6">
        <button
          type="button"
          onClick={() => setPaymentMethod('card')}
          className={`flex items-center px-4 py-2 ${paymentMethod === 'card' 
            ? 'border-b-2 border-benchlot-primary text-benchlot-primary' 
            : 'text-stone-500'}`}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Credit Card
        </button>
        
        {showApplePay && (
          <button
            type="button"
            onClick={() => setPaymentMethod('apple-pay')}
            className={`flex items-center px-4 py-2 ${paymentMethod === 'apple-pay' 
              ? 'border-b-2 border-benchlot-primary text-benchlot-primary' 
              : 'text-stone-500'}`}
          >
            <svg className="h-5 w-5 mr-1" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.6 10.9c-.1-1.1.5-2.2 1-2.8.6-.7 1.7-1.2 2.5-1.3-.3-.9-1.1-1.8-2-2.3-.9-.5-1.8-.7-2.8-.6-1.2.1-2.3.7-2.9.7-.7 0-1.6-.6-2.6-.6-1.3 0-2.6.8-3.3 2-.7 1.2-.9 2.8-.5 4.4.3 1.1.8 2.3 1.5 3.3.7 1 1.3 1.7 2.2 1.7.9 0 1.3-.6 2.4-.6s1.5.6 2.4.6c.9 0 1.5-.6 2.2-1.6.4-.6.7-1.2 1-1.9-1.1-.5-1.9-1.5-2.1-2.6zm-2.1-3.6c.8-1 .8-1.9.8-2.3-.7 0-1.6.5-2.1 1.1-.7.8-.8 1.7-.8 2.2.7 0 1.5-.4 2.1-1z"/>
            </svg>
            Apple Pay
          </button>
        )}
      </div>

      {/* Show the selected payment method form */}
      {paymentMethod === 'card' ? (
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <Shield className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-sm text-stone-700">Safe & secure credit card payment</span>
          </div>
          
          <label htmlFor="card-element" className="block text-sm font-medium text-stone-700 mb-1">
            Credit or debit card
          </label>
          <div className="border border-stone-300 rounded-md p-4 focus-within:ring-benchlot-primary focus-within:border-benchlot-primary">
            <CardElement id="card-element" options={cardStyle} onChange={handleChange} />
          </div>
          
          {/* Card security indicators */}
          <div className="mt-2 flex items-center justify-end">
            <Lock className="h-3 w-3 text-stone-500 mr-1" />
            <span className="text-xs text-stone-500">Encryption secured</span>
          </div>
        </div>
      ) : (
        /* Apple Pay Button */
        showApplePay && paymentRequest && (
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <Shield className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm text-stone-700">Quick and secure checkout with Apple Pay</span>
            </div>
            
            <div className="apple-pay-button-container">
              <PaymentRequestButtonElement
                options={{
                  paymentRequest,
                  style: {
                    paymentRequestButton: {
                      theme: 'dark',
                      height: '44px',
                    },
                  },
                }}
              />
            </div>
          </div>
        )
      )}
      
      {/* Show any error that happens when processing the payment */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4" role="alert">
          {error}
        </div>
      )}
      
      {/* Show success message upon completion */}
      {succeeded && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-4" role="alert">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            Payment successful! Redirecting to your order...
          </div>
        </div>
      )}
      
      {/* Only show Pay Now button for card payment method */}
      {paymentMethod === 'card' && (
        <button
          type="submit"
          disabled={processing || disabled || succeeded}
          className="w-full py-3 px-8 rounded-md font-medium text-base transition-colors bg-benchlot-primary text-white hover:bg-benchlot-secondary disabled:opacity-50 whitespace-nowrap"
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
            <span className="flex items-center justify-center">
              <Lock className="h-4 w-4 mr-2" />
              Pay Now
            </span>
          )}
        </button>
      )}
      
      {/* Enhanced trust signals */}
      <div className="mt-6 border-t border-stone-200 pt-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center">
            <Shield className="h-6 w-6 text-green-600 mb-2" />
            <span className="text-xs text-stone-600 font-medium">Secure Payment</span>
          </div>
          <div className="flex flex-col items-center">
            <svg className="h-6 w-6 text-blue-600 mb-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 16h-2v-2h2v2zm0-6h-2V7h2v5z"/>
            </svg>
            <span className="text-xs text-stone-600 font-medium">Buyer Protection</span>
          </div>
          <div className="flex flex-col items-center">
            <svg className="h-6 w-6 text-stone-500 mb-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
            </svg>
            <span className="text-xs text-stone-600 font-medium">Data Encryption</span>
          </div>
        </div>
        
        {/* Accepted payment methods */}
        <div className="mt-6 flex flex-col items-center">
          <div className="text-xs text-stone-500 mb-2">We accept the following payment methods:</div>
          <div className="flex items-center space-x-3">
            <svg className="h-6" viewBox="0 0 48 32" fill="none">
              <rect width="48" height="32" rx="4" fill="#EBF2FA" />
              <path d="M18.299 21.953H14.114L16.658 10.055H20.844L18.299 21.953Z" fill="#00579F" />
              <path d="M32.223 10.326C31.443 10.044 30.164 9.736 28.589 9.736C25.007 9.736 22.447 11.601 22.43 14.253C22.396 16.241 24.254 17.35 25.659 18.022C27.099 18.711 27.593 19.149 27.593 19.749C27.575 20.686 26.431 21.113 25.357 21.113C23.85 21.113 23.045 20.877 21.813 20.318L21.3 20.082L20.738 23.664C21.667 24.064 23.374 24.417 25.147 24.434C28.96 24.434 31.477 22.587 31.511 19.749C31.511 18.174 30.547 16.955 28.43 15.95C27.064 15.296 26.237 14.858 26.237 14.206C26.255 13.607 26.889 13.007 28.447 13.007C29.726 13.007 30.671 13.206 31.391 13.476L31.761 13.637L32.323 10.256L32.223 10.326Z" fill="#00579F" />
              <path d="M37.067 10.055C36.296 10.055 35.734 10.236 35.36 10.891L30.6 21.953H34.412L35.115 19.94H39.082L39.488 21.953H42.911L40.112 10.055H37.067ZM36.111 17.18C36.348 16.58 37.348 13.946 37.348 13.946C37.33 13.98 37.577 13.339 37.735 12.927L37.959 13.829C37.959 13.829 38.577 16.563 38.696 17.18H36.111Z" fill="#00579F" />
              <path d="M11.65 10.055L8.122 18.155L7.788 16.752C7.209 14.908 5.517 12.874 3.601 11.764L6.862 21.936H10.721L16.149 10.055H11.65Z" fill="#00579F" />
              <path d="M5.34 10.038H0.037L0 10.29C4.136 11.329 6.867 13.776 7.98 16.734L6.859 11.258C6.648 10.345 6.069 10.072 5.34 10.038Z" fill="#FAA61A" />
            </svg>
            <svg className="h-6" viewBox="0 0 48 32" fill="none">
              <rect width="48" height="32" rx="4" fill="#EBF2FA" />
              <path fill-rule="evenodd" clip-rule="evenodd" d="M30.667 21.333H17.333L16 8.66699H32L30.667 21.333Z" fill="#FF5F00" />
              <path fill-rule="evenodd" clip-rule="evenodd" d="M17.5788 15C17.5788 12.5 18.6788 10.3 20.3788 9C19.2788 8.1 17.8788 7.5 16.3788 7.5C12.6788 7.5 9.57878 10.9 9.57878 15C9.57878 19.1 12.6788 22.5 16.3788 22.5C17.8788 22.5 19.2788 21.9 20.3788 21C18.6788 19.7 17.5788 17.5 17.5788 15Z" fill="#EB001B" />
              <path fill-rule="evenodd" clip-rule="evenodd" d="M38.421 15C38.421 19.1 35.321 22.5 31.621 22.5C30.121 22.5 28.721 21.9 27.621 21C29.321 19.7 30.421 17.5 30.421 15C30.421 12.5 29.321 10.3 27.621 9C28.721 8.1 30.121 7.5 31.621 7.5C35.321 7.5 38.421 10.9 38.421 15Z" fill="#F79E1B" />
            </svg>
            <svg className="h-6" viewBox="0 0 48 32" fill="none">
              <rect width="48" height="32" rx="4" fill="#EBF2FA" />
              <path d="M17.221 21.837C15.127 21.837 13.442 20.087 13.442 17.962C13.442 15.837 15.159 14.087 17.253 14.087C18.148 14.087 18.849 14.337 19.363 14.743V12.15C18.786 11.837 18.019 11.681 17.126 11.681C14.115 11.681 11.168 14.025 11.168 17.993C11.168 21.775 13.883 24.25 17.158 24.25C18.019 24.25 18.849 24.087 19.363 23.806V21.212C18.849 21.587 18.116 21.837 17.221 21.837Z" fill="#2566AF" />
              <path d="M22.8969 8.30566H20.7495L18.1152 24.0557H20.2626L22.8969 8.30566Z" fill="#2566AF" />
              <path d="M31.1051 14.212C30.2735 14.212 29.6328 14.4932 29.1824 15.025L29.1187 14.3119H27.1976V24.0557H29.3131V18.025C29.3131 17.15 29.7635 16.6182 30.5314 16.6182C31.2356 16.6182 31.5586 17.2182 31.5586 18.025V24.0557H33.6741V17.5244C33.6741 15.4619 32.5829 14.212 31.1051 14.212Z" fill="#2566AF" />
              <path d="M24.564 14.3057H26.68V24.0619H24.564V14.3057Z" fill="#2566AF" />
              <path d="M25.6222 12.4619C26.3264 12.4619 26.9034 11.8869 26.9034 11.1494C26.9034 10.4119 26.3264 9.8369 25.6222 9.8369C24.918 9.8369 24.311 10.4119 24.311 11.1494C24.311 11.8869 24.918 12.4619 25.6222 12.4619Z" fill="#2566AF" />
            </svg>
            <svg className="h-8" viewBox="0 0 48 32" fill="none">
              <rect width="48" height="32" rx="4" fill="#EBF2FA" />
              <path d="M17.6 10.9c-.1-1.1.5-2.2 1-2.8.6-.7 1.7-1.2 2.5-1.3-.3-.9-1.1-1.8-2-2.3-.9-.5-1.8-.7-2.8-.6-1.2.1-2.3.7-2.9.7-.7 0-1.6-.6-2.6-.6-1.3 0-2.6.8-3.3 2-.7 1.2-.9 2.8-.5 4.4.3 1.1.8 2.3 1.5 3.3.7 1 1.3 1.7 2.2 1.7.9 0 1.3-.6 2.4-.6s1.5.6 2.4.6c.9 0 1.5-.6 2.2-1.6.4-.6.7-1.2 1-1.9-1.1-.5-1.9-1.5-2.1-2.6zm-2.1-3.6c.8-1 .8-1.9.8-2.3-.7 0-1.6.5-2.1 1.1-.7.8-.8 1.7-.8 2.2.7 0 1.5-.4 2.1-1z" fill="#000"/>
            </svg>
          </div>
        </div>
      </div>
    </form>
  );
};

// Main StripeCheckout component
const StripeCheckout = ({ 
  cartId, 
  amount, 
  shippingAddress, 
  billingAddress, 
  billingIsSameAsShipping,
  isGuestCheckout = false,
  guestEmail = ''
}) => {
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  
  useEffect(() => {
    // Create a payment intent using our deployed Firebase Function
    const createPaymentIntent = async () => {
      try {
        setLoading(true);
        
        // For development/testing, create mock client secret if we're in development
        if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_MOCK_PAYMENT === 'true') {
          console.log("Using mock payment in development mode");
          setTimeout(() => {
            setClientSecret('mock_client_secret_for_dev');
            setLoading(false);
          }, 1000);
          return;
        }
        
        console.log("Sending request to:", `${FIREBASE_API_URL}/create-payment-intent`);
        
        // Create a regular payload structure
        let payload = {
          cartId,
          userId: user?.uid || 'guest'
        };
        
        // If this is a guest checkout, we need to pass actual cart information
        if (isGuestCheckout && cartId === 'guest-cart') {
          try {
            const rawGuestCart = localStorage.getItem('benchlot_guest_cart');
            if (rawGuestCart) {
              console.log('Raw guest cart data:', rawGuestCart);
              
              // Extract cart data from localStorage
              const parsedCart = JSON.parse(rawGuestCart);
              
              // Create a Firestore-like cart structure
              const cart = {
                id: 'guest-cart',
                userId: 'guest',
                status: 'active',
                items: parsedCart.items || [],
                totalAmount: parsedCart.totalAmount || 0,
                itemCount: parsedCart.itemCount || 0
              };
              
              // Add cart data to the payload for guest checkout
              console.log('Creating Firebase cart for guest checkout:', cart);
              payload.cartItems = parsedCart.items || [];
              payload.cartTotal = parsedCart.totalAmount || 0;
              payload.isGuestCheckout = true;
              payload.guestEmail = guestEmail || '';
              
              // Log the payload for debugging
              console.log('Guest checkout payload:', JSON.stringify(payload, null, 2));
            } else {
              console.error('No guest cart data found in localStorage');
              throw new Error('Guest cart data missing from localStorage');
            }
          } catch (error) {
            console.error('Error with guest cart:', error);
            throw new Error(`Error with guest cart: ${error.message}`);
          }
        }
        
        // Log the final payload that will be sent
        console.log("Final request payload:", payload);
        
        // Get actual payload JSON for request
        const payloadJSON = JSON.stringify(payload);
        console.log("Stringified payload:", payloadJSON);
        
        // Call our deployed Firebase Function to create a payment intent
        const response = await fetch(`${FIREBASE_API_URL}/create-payment-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: payloadJSON,
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
        
        // Better fallback for development environments, especially for guest checkout
        if (process.env.NODE_ENV === 'development') {
          console.warn("Using enhanced client-side fallback for development mode");
          
          // For guest checkout, we'll create a more realistic fallback
          if (isGuestCheckout && cartId === 'guest-cart') {
            try {
              // Generate a deterministic but unique-looking client secret based on cart contents
              const guestCartData = localStorage.getItem('benchlot_guest_cart');
              if (guestCartData) {
                const parsedCart = JSON.parse(guestCartData);
                const cartHash = btoa(JSON.stringify(parsedCart.items || [])).substring(0, 10);
                const mockSecret = `pi_guestcart${Date.now()}_secret_${cartHash}`;
                console.log("Created mock client secret for guest checkout:", mockSecret);
                setClientSecret(mockSecret);
              } else {
                // Fallback to generic mock secret
                setClientSecret(`pi_devfallback${Date.now()}_secret_mockguestcart`);
              }
            } catch (error) {
              console.error('Error creating enhanced mock client secret:', error);
              // Still provide a fallback
              setClientSecret(`pi_devfallback${Date.now()}_secret_mockstripe`);
            }
          } else {
            // Regular fallback for authenticated users in dev mode
            console.warn("Using client-side fallback for development only");
            // Create a fallback client secret for testing with timestamp to avoid stripe validation errors
            setClientSecret(`pi_devfallback${Date.now()}_secret_mockstripe`);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    
    // Allow payment creation for guest users too
    if ((user || isGuestCheckout) && cartId && amount > 0) {
      createPaymentIntent();
    } else if ((user || isGuestCheckout) && cartId) {
      setLoading(false);
    }
  }, [cartId, user, amount, isGuestCheckout, guestEmail]);
  
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-benchlot-primary mb-2"></div>
          <p className="text-stone-600">Preparing payment...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <p className="text-center text-stone-600">
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
          <CheckoutForm 
            clientSecret={clientSecret} 
            cartId={cartId} 
            amount={amount} 
            shippingAddress={shippingAddress}
            billingAddress={billingAddress}
            billingIsSameAsShipping={billingIsSameAsShipping}
            isGuestCheckout={isGuestCheckout}
            guestEmail={guestEmail}
          />
        </Elements>
      )}
    </div>
  );
};

export default StripeCheckout;