/**
 * Add To Cart Button Component
 * Button for adding tools to the cart
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../firebase';
import { useAuth } from '../firebase';

const AddToCartButton = ({ tool, className = '', quantity = 1 }) => {
  const { isAuthenticated } = useAuth();
  const { addToCart, isItemInCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const inCart = isItemInCart(tool.id);

  const handleAddToCart = async () => {
    if (!isAuthenticated()) {
      navigate('/login', { state: { redirect: `/tools/${tool.id}` } });
      return;
    }

    if (inCart) {
      navigate('/cart');
      return;
    }

    try {
      setLoading(true);
      await addToCart({
        toolId: tool.id,
        name: tool.name,
        price: tool.current_price,
        quantity: quantity,
        imageUrl: tool.images && tool.images.length > 0 ? tool.images[0].url : null
      });
      setSuccess(true);
      
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

  return (
    <button
      onClick={handleAddToCart}
      disabled={loading}
      className={`flex items-center justify-center px-4 py-2 rounded-md font-medium transition-colors ${
        inCart
          ? 'bg-green-600 hover:bg-green-700 text-white'
          : success
          ? 'bg-green-600 text-white'
          : 'bg-blue-600 hover:bg-blue-700 text-white'
      } disabled:opacity-50 ${className}`}
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
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          View Cart
        </span>
      ) : success ? (
        <span className="flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          Added to Cart
        </span>
      ) : (
        <span className="flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
          Add to Cart
        </span>
      )}
    </button>
  );
};

export default AddToCartButton;