/**
 * PaymentSettings Component
 * Allows users to manage their payment methods using Stripe's SetupIntent API
 */
import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Check, Loader, AlertCircle, Trash2, Edit as EditIcon, DollarSign, Lock } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAuth } from '../../firebase';
import { updateUserPaymentMethods, getUserPaymentMethods } from '../../firebase/models/userModel';

// Load Stripe outside of a component's render to avoid recreating the Stripe object
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

// SetupForm component for adding a new payment method
const SetupForm = ({ onSuccess, onCancel, customerId }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [nickname, setNickname] = useState('');
  const [makeDefault, setMakeDefault] = useState(false);
  
  // Handle the submission of the setup form
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      // Stripe.js has not loaded yet. Make sure to disable form submission until Stripe.js has loaded.
      return;
    }
    
    if (!cardComplete) {
      setError('Please complete your card information');
      return;
    }
    
    setProcessing(true);
    
    try {
      // Create a setup intent on the server
      const response = await fetch(`${FIREBASE_API_URL}/create-setup-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customerId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create setup intent');
      }
      
      const { clientSecret } = await response.json();
      
      // Confirm the setup with Stripe
      const { error: setupError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: nickname || 'Card holder',
          },
        }
      });
      
      if (setupError) {
        setError(setupError.message);
        setProcessing(false);
        return;
      }
      
      // On successful setup
      if (setupIntent.status === 'succeeded') {
        // Pass the payment method data to the parent for saving
        onSuccess({
          id: setupIntent.payment_method,
          type: 'card',
          isDefault: makeDefault,
          nickname: nickname || 'My Card',
          // The card details like brand and last4 will be fetched when we retrieve payment methods
        });
      }
    } catch (err) {
      console.error('Error setting up payment method:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  };
  
  return (
    <div className="bg-white border border-stone-200 rounded-lg overflow-hidden p-4 mb-6">
      <h3 className="text-lg font-medium mb-4">Add Payment Method</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-5">
          <p className="text-sm text-stone-600 mb-3">
            Please enter your card information to add a new payment method. Your card details are securely processed by our payment provider.
          </p>
          
          <div className="p-4 border border-stone-300 rounded-md">
            <CardElement 
              options={cardStyle} 
              onChange={(e) => setCardComplete(e.complete)}
            />
          </div>
        </div>
        
        {/* Nickname field */}
        <div className="mb-5">
          <label 
            htmlFor="cardNickname" 
            className="block text-sm font-medium text-stone-700 mb-1"
          >
            Card Nickname (optional)
          </label>
          <input
            type="text"
            id="cardNickname"
            className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
            placeholder="e.g., Work Card, Personal Card"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>
        
        {/* Default checkbox */}
        <div className="mb-5">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary border-stone-300 rounded"
              checked={makeDefault}
              onChange={(e) => setMakeDefault(e.target.checked)}
            />
            <span className="ml-2 text-sm text-stone-700">
              Set as default payment method
            </span>
          </label>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-stone-300 text-stone-700 rounded-md hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-benchlot-primary"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            className="px-4 py-2 bg-benchlot-primary text-white rounded-md hover:bg-benchlot-secondary focus:outline-none focus:ring-2 focus:ring-benchlot-primary focus:ring-offset-2 flex items-center"
            disabled={processing || !cardComplete}
          >
            {processing ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Add Card'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

const PaymentSettings = ({ user }) => {
  // State
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user: authUser } = useAuth();
  
  // Load payment methods from Stripe
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      if (!user || !user.uid) return;
      
      try {
        setIsLoading(true);
        
        // Get the Stripe customer ID from the user profile or create one if it doesn't exist
        let customerId = user.stripeCustomerId;
        
        if (!customerId) {
          // Create a Stripe customer if one doesn't exist
          const response = await fetch(`${FIREBASE_API_URL}/create-customer`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.uid,
              email: user.email,
              name: user.displayName || '',
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create customer');
          }
          
          const data = await response.json();
          customerId = data.customerId;
          
          // Update the user profile with the Stripe customer ID
          // This should be done by the server but we'll do it here for completeness
          // In a production app, this would typically be managed by a backend function
        }
        
        // Fetch the payment methods from the server
        const response = await fetch(`${FIREBASE_API_URL}/get-payment-methods`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerId: customerId,
          }),
        });
        
        if (!response.ok) {
          // If we get a 404, it means the customer has no payment methods yet
          if (response.status === 404) {
            setPaymentMethods([]);
            setIsLoading(false);
            return;
          }
          
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch payment methods');
        }
        
        const data = await response.json();
        
        // Transform the payment methods to our internal format
        const formattedPaymentMethods = data.paymentMethods.map(method => {
          // For cards, extract the relevant details
          if (method.type === 'card') {
            return {
              id: method.id,
              type: method.type,
              isDefault: method.isDefault || false,
              brand: method.card.brand,
              lastFour: method.card.last4,
              expiryMonth: method.card.exp_month,
              expiryYear: method.card.exp_year,
              nickname: method.nickname || `${method.card.brand.charAt(0).toUpperCase() + method.card.brand.slice(1)} ending in ${method.card.last4}`
            };
          }
          
          // For other payment methods, return a generic format
          return {
            id: method.id,
            type: method.type,
            isDefault: method.isDefault || false,
            nickname: method.nickname || `Payment Method ${method.id}`
          };
        });
        
        setPaymentMethods(formattedPaymentMethods);
      } catch (err) {
        console.error('Error fetching payment methods:', err);
        setError('Failed to load payment methods. Please try again later.');
        
        // In development mode, use mock data for testing
        if (process.env.NODE_ENV === 'development') {
          console.log('Using mock payment methods data for development');
          setPaymentMethods([
            {
              id: 'pm_1234567890',
              type: 'card',
              isDefault: true,
              brand: 'visa',
              lastFour: '4242',
              expiryMonth: 12,
              expiryYear: 2025,
              nickname: 'Primary Card'
            }
          ]);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPaymentMethods();
  }, [user]);
  
  // Function to add a new payment method
  const handleAddPaymentMethod = () => {
    setIsAddingCard(true);
  };
  
  // Handle the successful addition of a payment method
  const handlePaymentMethodAdded = async (newPaymentMethod) => {
    try {
      setSaving(true);
      
      // Update the payment methods array with the new one
      let updatedPaymentMethods = [...paymentMethods];
      
      // If this is the first payment method or it's set as default, update all existing methods
      if (newPaymentMethod.isDefault || paymentMethods.length === 0) {
        updatedPaymentMethods = updatedPaymentMethods.map(method => ({
          ...method,
          isDefault: false
        }));
      }
      
      // Add the new payment method
      updatedPaymentMethods.push({
        ...newPaymentMethod,
        isDefault: newPaymentMethod.isDefault || paymentMethods.length === 0
      });
      
      // Save to Stripe via our API
      const response = await fetch(`${FIREBASE_API_URL}/update-payment-method`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: user.stripeCustomerId,
          paymentMethodId: newPaymentMethod.id,
          isDefault: newPaymentMethod.isDefault || paymentMethods.length === 0,
          nickname: newPaymentMethod.nickname
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update payment method');
      }
      
      // Update the state
      setPaymentMethods(updatedPaymentMethods);
      setIsAddingCard(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error adding payment method:', err);
      setError(`Failed to add payment method: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };
  
  // Function to remove a payment method
  const handleRemovePaymentMethod = async (paymentMethodId) => {
    if (!window.confirm('Are you sure you want to remove this payment method?')) {
      return;
    }
    
    try {
      setSaving(true);
      
      // Call API to detach the payment method
      const response = await fetch(`${FIREBASE_API_URL}/detach-payment-method`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove payment method');
      }
      
      // Check if we're removing the default method
      const isRemovingDefault = paymentMethods.find(
        method => method.id === paymentMethodId
      )?.isDefault;
      
      // Update the state
      let updatedPaymentMethods = paymentMethods.filter(
        method => method.id !== paymentMethodId
      );
      
      // If we removed the default method and there are other methods, set the first one as default
      if (isRemovingDefault && updatedPaymentMethods.length > 0) {
        updatedPaymentMethods[0].isDefault = true;
        
        // Update the default payment method on the server
        await fetch(`${FIREBASE_API_URL}/update-payment-method`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerId: user.stripeCustomerId,
            paymentMethodId: updatedPaymentMethods[0].id,
            isDefault: true
          }),
        });
      }
      
      setPaymentMethods(updatedPaymentMethods);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error removing payment method:', err);
      setError(`Failed to remove payment method: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };
  
  // Function to set a payment method as default
  const handleSetDefault = async (paymentMethodId) => {
    try {
      setSaving(true);
      
      // Call API to update the default payment method
      const response = await fetch(`${FIREBASE_API_URL}/update-payment-method`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: user.stripeCustomerId,
          paymentMethodId,
          isDefault: true
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to set default payment method');
      }
      
      // Update the state - set this method as default and all others as not default
      const updatedPaymentMethods = paymentMethods.map(method => ({
        ...method,
        isDefault: method.id === paymentMethodId
      }));
      
      setPaymentMethods(updatedPaymentMethods);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error setting default payment method:', err);
      setError(`Failed to set default payment method: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };
  
  // Cancel adding a new card
  const handleCancelAddCard = () => {
    setIsAddingCard(false);
    setError(null);
  };
  
  // Get card brand icon
  const getCardIcon = (brand) => {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return '💳 Visa';
      case 'mastercard':
        return '💳 Mastercard';
      case 'amex':
        return '💳 Amex';
      case 'discover':
        return '💳 Discover';
      default:
        return '💳 Credit Card';
    }
  };
  
  // Render a payment method card
  const renderPaymentMethod = (method) => {
    // For card payment methods
    if (method.type === 'card') {
      return (
        <div 
          key={method.id}
          className={`border rounded-lg p-4 relative ${method.isDefault ? 'border-benchlot-primary bg-benchlot-50' : 'border-stone-200'}`}
        >
          {/* Default badge */}
          {method.isDefault && (
            <div className="absolute top-2 right-2 bg-benchlot-primary text-white text-xs px-2 py-1 rounded-full flex items-center">
              <Check className="w-3 h-3 mr-1" />
              Default
            </div>
          )}
          
          {/* Card details */}
          <div className="mb-3">
            <div className="font-medium text-lg">
              {getCardIcon(method.brand)}
            </div>
            
            <div className="text-stone-600 mt-1">
              •••• •••• •••• {method.lastFour}
            </div>
            
            <div className="text-stone-500 text-sm mt-2">
              Expires {method.expiryMonth}/{method.expiryYear}
            </div>
            
            {method.nickname && (
              <div className="text-stone-600 mt-2">
                {method.nickname}
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex justify-end mt-4">
            {!method.isDefault && (
              <button
                onClick={() => handleSetDefault(method.id)}
                className="text-sm text-benchlot-primary hover:text-benchlot-secondary mr-4 flex items-center"
                disabled={saving}
              >
                <Check className="w-4 h-4 mr-1" />
                Set as Default
              </button>
            )}
            
            <button
              onClick={() => handleRemovePaymentMethod(method.id)}
              className="text-sm text-red-500 hover:text-red-700 flex items-center"
              disabled={saving}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Remove
            </button>
          </div>
        </div>
      );
    }
    
    // Fallback for other payment types
    return (
      <div 
        key={method.id}
        className={`border rounded-lg p-4 relative ${method.isDefault ? 'border-benchlot-primary bg-benchlot-50' : 'border-stone-200'}`}
      >
        <div className="mb-3">
          <div className="font-medium text-lg">
            {method.nickname || `Payment Method ${method.id}`}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold">Payment Methods</h2>
        <p className="text-stone-600 mt-1">
          Manage your payment methods for purchases
        </p>
      </div>
      
      <div className="p-6">
        {/* Status messages */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-center">
            <Check className="h-5 w-5 mr-2" />
            Payment method updated successfully!
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}
        
        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center items-center py-10">
            <Loader className="animate-spin h-8 w-8 text-benchlot-primary" />
            <span className="ml-2 text-stone-600">Loading payment methods...</span>
          </div>
        )}
        
        {/* Add card form */}
        {isAddingCard && (
          <Elements stripe={stripePromise}>
            <SetupForm 
              onSuccess={handlePaymentMethodAdded} 
              onCancel={handleCancelAddCard}
              customerId={user.stripeCustomerId}
            />
          </Elements>
        )}
        
        {/* Payment methods list or empty state */}
        {!isLoading && paymentMethods.length === 0 && !isAddingCard ? (
          <div className="text-center py-10 border border-stone-200 rounded-lg">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-stone-100">
              <CreditCard className="h-8 w-8 text-benchlot-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Payment Methods</h3>
            <p className="text-stone-600 mb-6 max-w-md mx-auto">
              You haven't added any payment methods yet. Add a payment method to make checkout faster.
            </p>
            <button
              onClick={handleAddPaymentMethod}
              className="px-4 py-2 bg-benchlot-primary text-white rounded-md hover:bg-benchlot-secondary focus:outline-none focus:ring-2 focus:ring-benchlot-primary focus:ring-offset-2 flex items-center mx-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Method
            </button>
          </div>
        ) : (
          <>
            {/* Add payment method button */}
            {!isAddingCard && !isLoading && (
              <div className="mb-6">
                <button
                  onClick={handleAddPaymentMethod}
                  className="px-4 py-2 border border-stone-300 rounded-md hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-benchlot-primary flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment Method
                </button>
              </div>
            )}
            
            {/* Payment methods grid */}
            {paymentMethods.length > 0 && !isAddingCard && !isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paymentMethods.map(method => renderPaymentMethod(method))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSettings;