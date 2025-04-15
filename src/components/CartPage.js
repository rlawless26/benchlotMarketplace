/**
 * Cart Page Component
 * Displays the user's shopping cart
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../firebase';
import { useAuth } from '../firebase';

const CartPage = () => {
  const { cart, loading, error, updateItemQuantity, removeItem, emptyCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [checkoutLoading] = useState(false);
  
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
      <div className="page-container">
        <h1 className="text-2xl font-bold mb-6">Shopping Cart</h1>
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-benchlot-accent border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-benchlot-primary font-medium">Loading your cart...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="page-container">
        <h1 className="text-2xl font-serif font-bold mb-6">Shopping Cart</h1>
        <div className="alert-error">
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="page-container">
        <h1 className="text-2xl font-serif font-bold mb-6">Shopping Cart</h1>
        <div className="card p-8 text-center">
          <div className="mx-auto w-16 h-16 mb-6 text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-benchlot-text-secondary mb-6">Your cart is empty</p>
          <Link
            to="/"
            className="btn-primary"
          >
            Browse Tools
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="page-container">
      <h1 className="text-2xl font-serif font-bold mb-6">Shopping Cart</h1>
      
      <div className="card overflow-hidden">
        {/* Cart Items */}
        <ul className="divide-y divide-benchlot-accent-dark">
          {cart.items.map((item) => (
            <li key={item.id} className="p-4 md:p-6 flex flex-wrap md:flex-nowrap gap-4">
              {/* Item Image */}
              <div className="w-full md:w-24 h-24 flex-shrink-0">
                <div className="w-full h-full rounded-lg overflow-hidden bg-gray-100">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-benchlot-text-secondary">No image</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Item Details */}
              <div className="flex-grow">
                <Link to={`/tools/${item.toolId}`} className="text-lg font-semibold text-benchlot-primary hover:text-benchlot-secondary transition-colors">
                  {item.name}
                </Link>
                <div className="text-benchlot-text-secondary font-medium mt-1">
                  {formatPrice(item.price)}
                </div>
                
                {/* Quantity Controls */}
                <div className="flex items-center mt-4">
                  <button
                    onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                    className="w-8 h-8 flex items-center justify-center border border-benchlot-accent-dark rounded-l-sm hover:bg-benchlot-accent-light transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="w-10 h-8 flex items-center justify-center border-t border-b border-benchlot-accent-dark">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center border border-benchlot-accent-dark rounded-r-sm hover:bg-benchlot-accent-light transition-colors"
                    aria-label="Increase quantity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => removeItem(item.id)}
                    className="ml-4 text-benchlot-error hover:text-red-800 transition-colors text-sm font-medium flex items-center"
                    aria-label="Remove item"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Remove
                  </button>
                </div>
              </div>
              
              {/* Item Subtotal */}
              <div className="w-full md:w-auto flex items-center justify-end md:pl-4">
                <div className="text-lg font-bold text-benchlot-primary">
                  {formatPrice(item.price * item.quantity)}
                </div>
              </div>
            </li>
          ))}
        </ul>
        
        {/* Cart Summary */}
        <div className="bg-benchlot-accent-light p-6">
          <div className="flex justify-between items-center mb-6">
            <span className="text-benchlot-text-secondary font-medium">Subtotal:</span>
            <span className="text-xl font-bold text-benchlot-primary">{formatPrice(calculateSubtotal())}</span>
          </div>
          
          <div className="flex flex-wrap gap-4 justify-between">
            <button
              onClick={() => emptyCart()}
              className="btn-secondary"
            >
              Clear Cart
            </button>
            
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="btn-primary"
            >
              {checkoutLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : 'Proceed to Checkout'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <Link
          to="/"
          className="inline-flex items-center text-benchlot-primary hover:text-benchlot-secondary transition-colors"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Continue Shopping
        </Link>
      </div>
    </div>
  );
};

export default CartPage;