/**
 * PaymentSettings Component
 * Allows users to manage their payment methods
 */
import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Check, Loader, AlertCircle, Trash2, Edit as EditIcon, DollarSign, Lock } from 'lucide-react';

// Placeholder for Stripe integration
// In a real implementation, you would import Stripe components and hooks
const PaymentSettings = ({ user }) => {
  // State
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  // Mock data for payment methods
  // In a real app, this would come from Stripe or another payment processor
  useEffect(() => {
    // Simulate loading payment methods
    const mockPaymentMethods = [
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
    ];
    
    setPaymentMethods(mockPaymentMethods);
  }, [user]);
  
  // Function to add a new payment method
  // In a real implementation, this would use Stripe's API
  const handleAddPaymentMethod = () => {
    setIsAddingCard(true);
  };
  
  // Function to remove a payment method
  // In a real implementation, this would call Stripe's API
  const handleRemovePaymentMethod = (paymentMethodId) => {
    if (!window.confirm('Are you sure you want to remove this payment method?')) {
      return;
    }
    
    // Simulate removing the payment method
    setSaving(true);
    setTimeout(() => {
      setPaymentMethods(prev => prev.filter(method => method.id !== paymentMethodId));
      setSuccess(true);
      setSaving(false);
      setTimeout(() => setSuccess(false), 3000);
    }, 1000);
  };
  
  // Function to set a payment method as default
  const handleSetDefault = (paymentMethodId) => {
    // Simulate setting as default
    setSaving(true);
    setTimeout(() => {
      setPaymentMethods(prev => 
        prev.map(method => ({
          ...method,
          isDefault: method.id === paymentMethodId
        }))
      );
      setSuccess(true);
      setSaving(false);
      setTimeout(() => setSuccess(false), 3000);
    }, 1000);
  };
  
  // Cancel adding a new card
  const handleCancelAddCard = () => {
    setIsAddingCard(false);
  };
  
  // Mock function to submit a new card
  // In a real app, this would use Stripe Elements
  const handleCardSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    
    // Simulate adding a new card
    setTimeout(() => {
      const newCard = {
        id: `pm_${Math.random().toString(36).substr(2, 9)}`,
        type: 'card',
        isDefault: paymentMethods.length === 0,
        brand: 'mastercard',
        lastFour: '5678',
        expiryMonth: 9,
        expiryYear: 2025,
        nickname: ''
      };
      
      setPaymentMethods(prev => [...prev, newCard]);
      setIsAddingCard(false);
      setSuccess(true);
      setSaving(false);
      setTimeout(() => setSuccess(false), 3000);
    }, 1500);
  };
  
  // Get card brand icon
  const getCardIcon = (brand) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return '💳 Visa';
      case 'mastercard':
        return '💳 Mastercard';
      case 'amex':
        return '💳 Amex';
      case 'discover':
        return '💳 Discover';
      default:
        return '💳 Card';
    }
  };
  
  // Render a payment method card
  const renderPaymentMethod = (method) => (
    <div 
      key={method.id} 
      className="bg-white border border-stone-200 rounded-lg p-5 relative"
    >
      {/* Default badge */}
      {method.isDefault && (
        <div className="absolute top-3 right-3 bg-benchlot-accent text-benchlot-primary text-xs font-medium px-2 py-1 rounded-full flex items-center">
          <Check className="h-3 w-3 mr-1" />
          Default
        </div>
      )}
      
      {/* Card type */}
      <div className="flex items-center mb-3">
        <span className="font-medium">{getCardIcon(method.brand)}</span>
      </div>
      
      {/* Card details */}
      <div className="mb-4">
        <p className="text-stone-700">•••• •••• •••• {method.lastFour}</p>
        <p className="text-sm text-stone-500 mt-1">Expires: {method.expiryMonth}/{method.expiryYear}</p>
        {method.nickname && <p className="text-sm font-medium mt-1">{method.nickname}</p>}
      </div>
      
      {/* Card actions */}
      <div className="flex space-x-4">
        {!method.isDefault && (
          <button
            onClick={() => handleSetDefault(method.id)}
            className="text-sm text-benchlot-primary hover:text-benchlot-secondary"
          >
            Set as default
          </button>
        )}
        
        <button
          onClick={() => handleRemovePaymentMethod(method.id)}
          className="flex items-center text-sm text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Remove
        </button>
      </div>
    </div>
  );
  
  // Form for adding a new card
  const renderAddCardForm = () => (
    <div className="bg-white border border-stone-200 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-medium mb-4">Add Payment Method</h3>
      
      <form onSubmit={handleCardSubmit}>
        <div className="mb-5">
          <p className="text-sm text-stone-600 mb-3">
            Please enter your card information to add a new payment method. Your card details are securely processed by our payment provider.
          </p>
          
          {/* Card Elements placeholder */}
          <div className="p-4 border border-stone-300 rounded-md bg-stone-50">
            <p className="text-center text-stone-500">
              [Stripe Card Element would be integrated here]
            </p>
            <p className="text-center text-xs text-stone-400 mt-2">
              This is a placeholder for Stripe Elements integration
            </p>
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
          />
        </div>
        
        {/* Default checkbox */}
        <div className="mb-5">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary border-stone-300 rounded"
              defaultChecked={paymentMethods.length === 0}
              disabled={paymentMethods.length === 0}
            />
            <span className="ml-2 text-sm text-stone-700">
              Set as default payment method
              {paymentMethods.length === 0 && ' (required for first card)'}
            </span>
          </label>
        </div>
        
        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleCancelAddCard}
            className="px-4 py-2 border border-stone-300 text-stone-700 rounded-md hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-benchlot-primary"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            className="px-4 py-2 bg-benchlot-primary text-white rounded-md hover:bg-benchlot-secondary focus:outline-none focus:ring-2 focus:ring-benchlot-primary focus:ring-offset-2 flex items-center"
            disabled={saving}
          >
            {saving ? (
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
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-xl font-medium text-stone-800">Payment Methods</h2>
        <p className="text-stone-600 text-sm mt-1">Manage your saved payment methods</p>
      </div>
      
      <div className="p-6">
        {/* Status messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6 flex items-center">
            <Check className="h-5 w-5 mr-2" />
            Payment method updated successfully!
          </div>
        )}
        
        {/* Add card form */}
        {isAddingCard && renderAddCardForm()}
        
        {/* Payment methods list or empty state */}
        {paymentMethods.length === 0 && !isAddingCard ? (
          <div className="text-center py-10 border border-stone-200 rounded-lg">
            <CreditCard className="h-12 w-12 text-stone-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No payment methods</h3>
            <p className="text-stone-500 mb-6">
              Add a payment method to make checkout faster
            </p>
            <button
              onClick={handleAddPaymentMethod}
              className="px-4 py-2 bg-benchlot-primary text-white rounded-md hover:bg-benchlot-secondary inline-flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Method
            </button>
          </div>
        ) : (
          <>
            {/* Add payment method button */}
            {!isAddingCard && (
              <div className="mb-6">
                <button
                  onClick={handleAddPaymentMethod}
                  className="px-4 py-2 border border-benchlot-primary text-benchlot-primary rounded-md hover:bg-benchlot-accent-light inline-flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment Method
                </button>
              </div>
            )}
            
            {/* Payment methods grid */}
            {paymentMethods.length > 0 && !isAddingCard && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paymentMethods.map(method => renderPaymentMethod(method))}
              </div>
            )}
          </>
        )}
        
        {/* Security information */}
        <div className="mt-8 bg-stone-50 p-4 rounded-lg border border-stone-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <Lock className="h-5 w-5 text-stone-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-stone-800">Secure Payment Processing</h3>
              <p className="text-xs text-stone-500 mt-1">
                Benchlot uses secure encryption to protect your payment information. Your card details are never stored on our servers and are securely processed by our payment provider.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSettings;