/**
 * Cart Context
 * 
 * Provides shopping cart state and functions to the app
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../firebase/hooks/useAuth';
import { 
  getOrCreateCart, 
  addItemToCart, 
  updateCartItemQuantity, 
  removeCartItem,
  clearCart
} from '../firebase/models/cartModel';

// Create context
const CartContext = createContext();

/**
 * CartProvider component
 * @param {Object} props - Component props
 * @returns {JSX.Element} - Provider component
 */
export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch cart when user changes
  useEffect(() => {
    async function fetchCart() {
      if (user) {
        try {
          setLoading(true);
          const userCart = await getOrCreateCart(user.uid);
          setCart(userCart);
          setError(null);
        } catch (err) {
          console.error('Error fetching cart:', err);
          setError('Failed to load your shopping cart');
        } finally {
          setLoading(false);
        }
      } else {
        setCart(null);
        setLoading(false);
      }
    }
    
    fetchCart();
  }, [user]);
  
  /**
   * Add an item to the cart
   * @param {Object} item - The item to add
   */
  const addToCart = async (item) => {
    if (!user || !cart) return;
    
    try {
      setLoading(true);
      const updatedCart = await addItemToCart(cart.id, {
        ...item,
        userId: user.uid
      });
      setCart(updatedCart);
    } catch (err) {
      console.error('Error adding to cart:', err);
      setError('Failed to add item to cart');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Update item quantity
   * @param {string} itemId - The item ID
   * @param {number} quantity - New quantity
   */
  const updateQuantity = async (itemId, quantity) => {
    if (!user || !cart) return;
    
    try {
      setLoading(true);
      const updatedCart = await updateCartItemQuantity(cart.id, itemId, quantity, user.uid);
      setCart(updatedCart);
    } catch (err) {
      console.error('Error updating quantity:', err);
      setError('Failed to update item quantity');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Remove item from cart
   * @param {string} itemId - The item ID to remove
   */
  const removeItem = async (itemId) => {
    if (!user || !cart) return;
    
    try {
      setLoading(true);
      const updatedCart = await removeCartItem(cart.id, itemId, user.uid);
      setCart(updatedCart);
    } catch (err) {
      console.error('Error removing item:', err);
      setError('Failed to remove item from cart');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Clear all items from cart
   */
  const emptyCart = async () => {
    if (!user || !cart) return;
    
    try {
      setLoading(true);
      const updatedCart = await clearCart(cart.id, user.uid);
      setCart(updatedCart);
    } catch (err) {
      console.error('Error clearing cart:', err);
      setError('Failed to clear cart');
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate cart summary
  const cartSummary = {
    itemCount: cart?.itemCount || 0,
    totalAmount: cart?.totalAmount || 0,
    items: cart?.items || []
  };
  
  // Context value
  const value = {
    cart,
    cartSummary,
    loading,
    error,
    addToCart,
    updateQuantity,
    removeItem,
    emptyCart
  };
  
  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

/**
 * useCart hook
 * @returns {Object} - Cart context
 */
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export default CartContext;