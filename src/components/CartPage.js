/**
 * Cart Page Component
 * Displays the user's shopping cart with improved UX and trust signals
 * Supports both authenticated and guest users
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../firebase';
import { useAuth } from '../firebase';
import { ShieldCheck, ArrowLeft, Trash2, Lock, UserPlus, LogIn } from 'lucide-react';
import { openAuthModal } from '../utils/featureFlags';

const CartPage = () => {
  const { cart, loading, error, updateItemQuantity, removeItem, emptyCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  
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
  
  // Handle different checkout paths
  const handleCheckout = () => {
    setCheckoutLoading(true);
    
    if (isAuthenticated()) {
      // Authenticated user - proceed to checkout
      navigate('/checkout');
    } else {
      // Guest user - proceed to guest checkout
      navigate('/checkout');
    }
    
    setCheckoutLoading(false);
  };
  
  // Handle login for checkout
  const handleLoginForCheckout = () => {
    openAuthModal('signin', '/checkout');
  };
  
  // Handle signup for checkout
  const handleSignupForCheckout = () => {
    openAuthModal('signup', '/checkout');
  };
  
  if (loading && !cart) {
    return (
      <div>
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-benchlot-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-benchlot-primary font-medium">Loading your cart...</p>
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
          to="/"
          className="inline-flex items-center text-benchlot-primary hover:text-benchlot-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Continue Shopping
        </Link>
      </div>
    );
  }
  
  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div>
        <div className="bg-white rounded-lg shadow-card p-8 text-center">
          <div className="mx-auto w-20 h-20 mb-6 text-stone-300">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-serif font-semibold mb-3">Your cart is empty</h2>
          <p className="text-benchlot-text-secondary mb-6 max-w-md mx-auto">Add some tools to your cart and they'll appear here.</p>
          <Link
            to="/marketplace"
            className="btn-primary text-lg py-3 px-8"
          >
            Browse Tools
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <p className="text-benchlot-text-secondary mb-6">{cart.items.length} {cart.items.length === 1 ? 'item' : 'items'} in your cart</p>
      
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
        {/* Cart Items - Left Column */}
        <div className="lg:col-span-6">
          <div className="bg-white rounded-lg shadow-card overflow-hidden">
            <ul className="divide-y divide-stone-200">
              {cart.items.map((item) => (
                <li key={item.id} className="p-6 flex flex-wrap md:flex-nowrap gap-4">
                  {/* Item Image */}
                  <div className="w-full md:w-32 h-32 flex-shrink-0">
                    <Link to={`/tools/${item.toolId}`} className="block w-full h-full">
                      <div className="w-full h-full rounded-md overflow-hidden bg-stone-100">
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
                    </Link>
                  </div>
                  
                  {/* Item Details */}
                  <div className="flex-grow">
                    <Link to={`/tools/${item.toolId}`} className="text-xl font-medium text-stone-800 hover:text-benchlot-primary transition-colors">
                      {item.name}
                    </Link>
                    <div className="text-xl text-benchlot-primary font-medium mt-1 mb-3">
                      {formatPrice(item.price)}
                    </div>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center mt-4">
                      <div className="flex items-center border border-stone-200 rounded-md">
                        <button
                          onClick={() => updateItemQuantity(item.id, Math.max(1, item.quantity - 1))}
                          className="w-8 h-8 flex items-center justify-center hover:bg-stone-100 transition-colors"
                          aria-label="Decrease quantity"
                          disabled={item.quantity <= 1}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="w-10 h-8 flex items-center justify-center text-stone-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-stone-100 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                      
                      <button
                        onClick={() => removeItem(item.id)}
                        className="ml-4 text-stone-500 hover:text-red-600 transition-colors text-sm font-medium flex items-center"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </button>
                    </div>
                  </div>
                  
                  {/* Item Subtotal */}
                  <div className="w-full md:w-auto flex items-start justify-end md:pl-4 mt-4 md:mt-0">
                    <div className="text-lg font-bold text-stone-800">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            
            <div className="border-t border-stone-200 p-4 flex justify-between">
              <button
                onClick={() => emptyCart()}
                className="text-stone-500 hover:text-red-600 transition-colors text-sm font-medium flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear Cart
              </button>
              
              <Link
                to="/marketplace"
                className="inline-flex items-center text-benchlot-primary hover:text-benchlot-secondary transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
        
        {/* Order Summary - Right Column */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-lg shadow-card overflow-hidden">
            <div className="p-6 border-b border-stone-200">
              <h2 className="text-xl font-serif font-semibold text-stone-800 mb-6">Order Summary</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-stone-600">Subtotal:</span>
                  <span className="text-stone-800 font-medium">{formatPrice(calculateSubtotal())}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-stone-600">Estimated Tax:</span>
                  <span className="text-stone-800 font-medium">{formatPrice(calculateEstimatedTax())}</span>
                </div>
                
                <div className="flex justify-between pt-3 border-t border-stone-200">
                  <span className="text-stone-800 font-semibold">Total:</span>
                  <span className="text-xl text-benchlot-primary font-bold">{formatPrice(calculateSubtotal() + calculateEstimatedTax())}</span>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {/* Different options based on authentication status */}
              {isAuthenticated() ? (
                /* Authenticated User - Regular checkout button */
                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  className="w-full py-3 px-8 rounded-md font-medium text-base transition-colors bg-benchlot-primary text-white hover:bg-benchlot-secondary justify-center flex items-center whitespace-nowrap"
                >
                  {checkoutLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    <>
                      Proceed to Checkout
                      <Lock className="ml-2 h-4 w-4" />
                    </>
                  )}
                </button>
              ) : (
                /* Guest User - Multiple checkout options */
                <div className="space-y-4">
                  {/* Guest Checkout Button */}
                  <button
                    onClick={handleCheckout}
                    disabled={checkoutLoading}
                    className="w-full py-3 px-8 rounded-md font-medium text-base transition-colors bg-benchlot-primary text-white hover:bg-benchlot-secondary justify-center flex items-center whitespace-nowrap"
                  >
                    {checkoutLoading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      <>
                        Continue as Guest
                        <Lock className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </button>
                  
                  {/* Or Divider */}
                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-stone-300"></div>
                    <span className="flex-shrink mx-4 text-stone-500 text-sm">or</span>
                    <div className="flex-grow border-t border-stone-300"></div>
                  </div>
                  
                  {/* Sign In Button */}
                  <button
                    onClick={handleLoginForCheckout}
                    className="w-full py-3 px-8 rounded-md font-medium text-base transition-colors bg-white border border-benchlot-primary text-benchlot-primary hover:bg-benchlot-accent-light justify-center flex items-center whitespace-nowrap"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In to Checkout
                  </button>
                  
                  {/* Create Account Button */}
                  <button
                    onClick={handleSignupForCheckout}
                    className="w-full py-3 px-8 rounded-md font-medium text-base transition-colors bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 justify-center flex items-center whitespace-nowrap"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create an Account
                  </button>
                </div>
              )}
              
              {/* Trust Signals */}
              <div className="mt-6 pt-6 border-t border-stone-200">
                <div className="flex items-center text-stone-600 text-sm mb-3">
                  <ShieldCheck className="h-5 w-5 text-green-600 mr-2" />
                  <span>Secure checkout</span>
                </div>
                
                <div className="flex items-start text-stone-600 text-sm">
                  <span className="text-xs leading-5">
                    By proceeding to checkout, you agree to Benchlot's terms of service and privacy policy.
                    All transactions are processed securely.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;