/**
 * Checkout Page Component
 * Handles the checkout process with Stripe integration
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../firebase';
import { useAuth } from '../firebase';
import StripeCheckout from './StripeCheckout';

const CheckoutPage = () => {
  const { cart, loading, error } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Redirect to login if not authenticated
  if (!isAuthenticated()) {
    navigate('/login', { state: { redirect: '/checkout' } });
    return null;
  }
  
  // Redirect to cart if cart is empty
  if (!loading && (!cart || !cart.items || cart.items.length === 0)) {
    navigate('/cart');
    return null;
  }
  
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
  
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Checkout</h1>
        <div className="flex justify-center items-center h-60">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Checkout</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order Summary */}
        <div>
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Order Summary</h2>
            </div>
            
            <ul className="divide-y divide-gray-200">
              {cart.items.map((item) => (
                <li key={item.id} className="px-6 py-4 flex justify-between">
                  <div>
                    <span className="font-medium">{item.name}</span>
                    <span className="text-gray-600 ml-2">x {item.quantity}</span>
                  </div>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            
            <div className="px-6 py-4 bg-gray-50">
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>{formatPrice(calculateSubtotal())}</span>
              </div>
            </div>
          </div>
          
          <Link
            to="/cart"
            className="block text-blue-600 hover:text-blue-800 mb-6"
          >
            ← Back to Cart
          </Link>
        </div>
        
        {/* Payment Information */}
        <div>
          <StripeCheckout cartId={cart.id} amount={calculateSubtotal()} />
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;