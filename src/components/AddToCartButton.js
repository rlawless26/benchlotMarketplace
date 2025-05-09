/**
 * Add To Cart Button Component
 * Button for adding tools to the cart for both authenticated and guest users
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../firebase';
import { useAuth } from '../firebase';
import { openAuthModal } from '../utils/featureFlags';
import { useNotificationContext } from '../context/NotificationContext';

const AddToCartButton = ({ tool, className = '', extraClasses = '', quantity = 1 }) => {
  const { isAuthenticated } = useAuth();
  const { addToCart, isItemInCart } = useCart();
  const { showNotification } = useNotificationContext();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const inCart = isItemInCart(tool.id);

  const handleAddToCart = async () => {
    // If item is already in cart, navigate to cart page
    if (inCart) {
      navigate('/cart');
      return;
    }

    try {
      setLoading(true);
      await addToCart({
        toolId: tool.id,
        name: tool.name,
        price: tool.current_price || tool.price,
        quantity: quantity,
        imageUrl: tool.images && tool.images.length > 0 ? tool.images[0].url : null
      });
      setSuccess(true);
      
      // Show mini-cart notification
      showNotification({
        title: "Added to Cart",
        message: `${tool.name} has been added to your cart`,
        type: "cart",
        link: "/cart",
        image: tool.images && tool.images.length > 0 ? tool.images[0].url : null,
        price: tool.current_price || tool.price
      });
      
      // Reset success state after 2 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setLoading(false);
    }
  };

  // Determine button style based on state
  const getButtonClasses = () => {
    if (inCart) {
      return 'bg-benchlot-success hover:bg-green-700 text-white';
    }
    if (success) {
      return 'bg-benchlot-success text-white';
    }
    if (extraClasses) {
      return extraClasses;  // Use provided classes if available
    }
    // Explicitly include background color in default case - ensure button is visible
    return 'bg-benchlot-primary text-white hover:bg-benchlot-secondary';
  };

  return (
    <button
      onClick={handleAddToCart}
      disabled={loading}
      aria-label={inCart ? "View your cart" : "Add this item to your cart"}
      className={`flex items-center justify-center px-4 py-2 rounded-md font-medium transition-colors 
        ${getButtonClasses()} disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <span className="flex items-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </span>
      ) : inCart ? (
        <span className="flex items-center">
          <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          View Cart
        </span>
      ) : success ? (
        <span className="flex items-center">
          <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          Added to Cart
        </span>
      ) : (
        <span className="flex items-center">
          <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
          Add to Cart
        </span>
      )}
    </button>
  );
};

export default AddToCartButton;