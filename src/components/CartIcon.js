/**
 * Cart Icon Component
 * Shows a cart icon with the number of items in the cart
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
// Temporarily not using useCart for the demo
// import { useCart } from '../firebase/hooks/useCart';

const CartIcon = () => {
  // We'll stub this for the demo since we're just showing UI
  const itemCount = 3; // Hardcoded for demo

  return (
    <Link 
      to="/cart" 
      className="relative p-2 flex items-center text-stone-700 hover:text-benchlot-primary transition-colors duration-200"
      aria-label={`View your cart with ${itemCount} items`}
    >
      <ShoppingCart className="h-4 w-4" />
      
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-benchlot-primary text-white rounded-full text-xs font-medium w-5 h-5 flex items-center justify-center">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  );
};

export default CartIcon;