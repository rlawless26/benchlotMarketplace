/**
 * Cart Icon Component
 * Shows a cart icon with the number of items in the cart
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../firebase/hooks/useCart';

const CartIcon = () => {
  const { getItemCount } = useCart();
  
  // Get the actual item count from the cart
  const itemCount = getItemCount();

  return (
    <Link 
      to="/cart" 
      className="relative flex items-center text-stone-700 hover:text-benchlot-primary transition-colors duration-200"
      aria-label={itemCount > 0 ? `View your cart with ${itemCount} items` : "View your cart"}
    >
      <ShoppingCart className="h-5 w-5" />
      
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-benchlot-primary text-white rounded-full text-[10px] font-medium w-4 h-4 flex items-center justify-center">
          {itemCount > 9 ? '9+' : itemCount}
        </span>
      )}
    </Link>
  );
};

export default CartIcon;