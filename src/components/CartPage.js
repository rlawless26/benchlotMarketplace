/**
 * Cart Page Component
 * Displays the user's shopping cart
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../firebase';
import { useAuth } from '../firebase';
import ToolImage from './ToolImage';

const CartPage = () => {
  const { cart, loading, error, updateItemQuantity, removeItem, emptyCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  
  // Debug logging
  console.log("CartPage - Auth state:", user);
  console.log("CartPage - Is authenticated:", isAuthenticated());
  
  // Redirect to login if not authenticated - using useEffect to avoid setState during render
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { state: { redirect: '/cart' } });
    }
  }, [isAuthenticated, navigate]);
  
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
  
  // Navigate to checkout
  const handleCheckout = () => {
    navigate('/checkout');
  };
  
  if (loading && !cart) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Shopping Cart</h1>
        <div className="flex justify-center items-center h-60">
          <div className="text-gray-500">Loading your cart...</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Shopping Cart</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      </div>
    );
  }
  
  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Shopping Cart</h1>
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <p className="text-gray-600 mb-4">Your cart is empty</p>
          <Link
            to="/"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700"
          >
            Browse Tools
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Shopping Cart</h1>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Cart Items */}
        <ul className="divide-y divide-gray-200">
          {cart.items.map((item) => (
            <li key={item.id} className="p-4 flex flex-wrap md:flex-nowrap gap-4">
              {/* Item Image */}
              <div className="w-full md:w-24 h-24 flex-shrink-0">
                <div className="w-full h-full rounded-md overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500">No image</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Item Details */}
              <div className="flex-grow">
                <Link to={`/tools/${item.toolId}`} className="text-lg font-semibold hover:text-blue-500">
                  {item.name}
                </Link>
                <div className="text-gray-700 font-medium">
                  {formatPrice(item.price)}
                </div>
                
                {/* Quantity Controls */}
                <div className="flex items-center mt-2">
                  <button
                    onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-l-md"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="w-10 h-8 flex items-center justify-center border-t border-b border-gray-300">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-r-md"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                  
                  <button
                    onClick={() => removeItem(item.id)}
                    className="ml-4 text-red-600 hover:text-red-800"
                    aria-label="Remove item"
                  >
                    Remove
                  </button>
                </div>
              </div>
              
              {/* Item Subtotal */}
              <div className="w-full md:w-auto flex items-center justify-end md:pl-4">
                <div className="text-lg font-semibold">
                  {formatPrice(item.price * item.quantity)}
                </div>
              </div>
            </li>
          ))}
        </ul>
        
        {/* Cart Summary */}
        <div className="bg-gray-50 p-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-600">Subtotal:</span>
            <span className="text-xl font-bold">{formatPrice(calculateSubtotal())}</span>
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={() => emptyCart()}
              className="px-4 py-2 border border-gray-300 rounded-md font-medium hover:bg-gray-100"
            >
              Clear Cart
            </button>
            
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {checkoutLoading ? 'Processing...' : 'Checkout'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <Link
          to="/"
          className="text-blue-600 hover:text-blue-800"
        >
          ← Continue Shopping
        </Link>
      </div>
    </div>
  );
};

export default CartPage;