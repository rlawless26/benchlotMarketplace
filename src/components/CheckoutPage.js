/**
 * Checkout Page Component
 * Handles the checkout process with Stripe integration
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../firebase';
import { useAuth } from '../firebase';
import StripeCheckout from './StripeCheckout';
import { ShieldCheck, Lock, CreditCard, ArrowLeft } from 'lucide-react';
import { openAuthModal } from '../utils/featureFlags';

const CheckoutPage = () => {
  const { cart, loading, error } = useCart();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  // Open auth modal if not authenticated - using useEffect to avoid setState during render
  useEffect(() => {
    if (!isAuthenticated()) {
      openAuthModal('signin', '/checkout');
    }
  }, [isAuthenticated]);
  
  // Redirect to cart if cart is empty
  useEffect(() => {
    if (!loading && (!cart || !cart.items || cart.items.length === 0)) {
      navigate('/cart');
    }
  }, [cart, loading, navigate]);
  
  // Format price as USD
  const formatPrice = (price) => {
    if (!price && price !== 0) return '$0';
    
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };
  
  // Calculate subtotal
  const calculateSubtotal = () => {
    if (!cart || !cart.items || cart.items.length === 0) return 0;
    
    return cart.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  };

  // Calculate estimated tax (for display purposes)
  const calculateEstimatedTax = () => {
    const subtotal = calculateSubtotal();
    // Assuming a 8.25% tax rate for display purposes
    return subtotal * 0.0825;
  };

  // Calculate total
  const calculateTotal = () => {
    return calculateSubtotal() + calculateEstimatedTax();
  };
  
  if (loading) {
    return (
      <div>
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-benchlot-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-benchlot-primary font-medium">Preparing checkout...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-6">
          <p>{error}</p>
        </div>
        <Link
          to="/cart"
          className="inline-flex items-center text-benchlot-primary hover:text-benchlot-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Return to Cart
        </Link>
      </div>
    );
  }
  
  if (!cart || !cart.items || cart.items.length === 0) {
    return null; // This will be handled by the useEffect
  }
  
  return (
    <div>
      <p className="text-benchlot-text-secondary mb-6">Complete your purchase</p>
      
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
        {/* Order Summary - Left column on larger screens */}
        <div className="lg:col-span-4 order-2 lg:order-1">
          <div className="bg-white rounded-lg shadow-card overflow-hidden sticky top-8">
            <div className="p-6 border-b border-stone-200">
              <h2 className="text-xl font-serif font-semibold text-stone-800 mb-4">Order Summary</h2>
              
              <div className="divide-y divide-stone-100">
                {cart.items.map((item) => (
                  <div key={item.id} className="py-3 flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-md bg-stone-100 overflow-hidden mr-3 flex-shrink-0">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xs text-stone-400">No img</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-stone-800 line-clamp-1">{item.name}</div>
                        <div className="text-xs text-stone-500">Qty: {item.quantity}</div>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-stone-800">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 bg-stone-50">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-600">Subtotal:</span>
                  <span className="text-stone-800 font-medium">{formatPrice(calculateSubtotal())}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-stone-600">Estimated Tax:</span>
                  <span className="text-stone-800 font-medium">{formatPrice(calculateEstimatedTax())}</span>
                </div>
                
                <div className="flex justify-between pt-2 border-t border-stone-200">
                  <span className="text-stone-800 font-semibold">Total:</span>
                  <span className="text-xl text-benchlot-primary font-bold">{formatPrice(calculateTotal())}</span>
                </div>
              </div>
              
              <div className="mt-6">
                <Link
                  to="/cart"
                  className="inline-flex items-center text-benchlot-primary hover:text-benchlot-secondary transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Cart
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Payment Information - Right column (takes up 6/10 of the grid) */}
        <div className="lg:col-span-6 order-1 lg:order-2">
          <div className="bg-white rounded-lg shadow-card overflow-hidden">
            <div className="p-6 border-b border-stone-200">
              <h2 className="text-xl font-serif font-semibold text-stone-800 mb-2 flex items-center">
                <CreditCard className="h-5 w-5 mr-2 text-benchlot-primary" />
                Payment Details
              </h2>
              <p className="text-stone-600 text-sm">All transactions are secure and encrypted</p>
            </div>
            
            <div className="p-6">
              {/* Security Badge */}
              <div className="mb-6 flex items-center bg-green-50 text-green-700 p-3 rounded-md">
                <ShieldCheck className="h-5 w-5 mr-2 text-green-600" />
                <span className="text-sm">Your payment information is secure</span>
              </div>
              
              {/* Stripe Checkout Component */}
              <div className="mb-6">
                <StripeCheckout cartId={cart.id} amount={calculateTotal()} />
              </div>
              
              {/* Trust badges and information */}
              <div className="mt-8 pt-6 border-t border-stone-200">
                <div className="flex items-center text-stone-600 text-sm mb-3">
                  <Lock className="h-4 w-4 text-stone-500 mr-2" />
                  <span>Your personal data will be used to process your order, support your experience, and for other purposes described in our privacy policy.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;