/**
 * Cart Hook for Firebase
 * Provides cart functionality throughout the app for both authenticated and guest users
 */
import { useState, useEffect, useContext, createContext } from 'react';
import { useAuth } from './useAuth';
import { 
  getOrCreateCart, 
  addItemToCart, 
  updateCartItemQuantity, 
  removeCartItem, 
  clearCart,
  migrateGuestCart
} from '../models/cartModel';

// Create context
const CartContext = createContext();

/**
 * Cart Provider Component
 */
export function CartProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load or create cart when user authenticates or as a guest
  useEffect(() => {
    const loadCart = async () => {
      try {
        setLoading(true);
        
        if (isAuthenticated() && user) {
          console.log("useCart - Loading cart for authenticated user:", user.uid);
          
          // Check if we need to migrate a guest cart to the user's cart
          const migratedCart = await migrateGuestCart(user.uid);
          
          if (migratedCart) {
            console.log("useCart - Migrated guest cart to user cart");
            setCart(migratedCart);
          } else {
            // No migration needed, just get the user's cart
            const userCart = await getOrCreateCart(user.uid);
            console.log("useCart - Cart loaded:", userCart);
            setCart(userCart);
          }
        } else {
          // Use guest cart for unauthenticated users
          console.log("useCart - Loading guest cart");
          const guestCart = await getOrCreateCart(null);
          setCart(guestCart);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error loading cart:', err);
        setError('Failed to load your cart. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadCart();
  }, [user, isAuthenticated]);

  /**
   * Add an item to the cart (works for both authenticated and guest users)
   * @param {Object} item - The item to add
   */
  const addToCart = async (item) => {
    try {
      setLoading(true);
      
      if (isAuthenticated() && user) {
        // Authenticated user - use Firebase
        const updatedCart = await addItemToCart(cart.id, {
          ...item,
          userId: user.uid
        });
        setCart(updatedCart);
      } else {
        // Guest user - use localStorage
        const updatedCart = await addItemToCart('guest-cart', {
          ...item,
          isGuestCart: true
        });
        setCart(updatedCart);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error adding item to cart:', err);
      setError('Failed to add item to your cart. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update the quantity of an item in the cart
   * @param {string} itemId - The item ID
   * @param {number} quantity - The new quantity
   */
  const updateItemQuantity = async (itemId, quantity) => {
    try {
      setLoading(true);
      
      if (isAuthenticated() && user && !cart.isGuestCart) {
        // Authenticated user - use Firebase
        const updatedCart = await updateCartItemQuantity(cart.id, itemId, quantity, user.uid);
        setCart(updatedCart);
      } else {
        // Guest user - use localStorage
        const updatedCart = await updateCartItemQuantity('guest-cart', itemId, quantity, null);
        setCart(updatedCart);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error updating cart item:', err);
      setError('Failed to update your cart. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Remove an item from the cart
   * @param {string} itemId - The item ID to remove
   */
  const removeItem = async (itemId) => {
    try {
      setLoading(true);
      
      if (isAuthenticated() && user && !cart.isGuestCart) {
        // Authenticated user - use Firebase
        const updatedCart = await removeCartItem(cart.id, itemId, user.uid);
        setCart(updatedCart);
      } else {
        // Guest user - use localStorage
        const updatedCart = await removeCartItem('guest-cart', itemId, null);
        setCart(updatedCart);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error removing cart item:', err);
      setError('Failed to remove item from your cart. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Empty the cart
   */
  const emptyCart = async () => {
    try {
      setLoading(true);
      
      if (isAuthenticated() && user && !cart.isGuestCart) {
        // Authenticated user - use Firebase
        const updatedCart = await clearCart(cart.id, user.uid);
        setCart(updatedCart);
      } else {
        // Guest user - use localStorage
        const updatedCart = await clearCart('guest-cart', null);
        setCart(updatedCart);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error clearing cart:', err);
      setError('Failed to clear your cart. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get the total number of items in the cart
   */
  const getItemCount = () => {
    if (!cart) return 0;
    return cart.itemCount || 0;
  };

  /**
   * Check if the cart contains a specific tool
   * @param {string} toolId - The tool ID to check
   * @returns {boolean} - Whether the tool is in the cart
   */
  const isItemInCart = (toolId) => {
    if (!cart || !cart.items) return false;
    return cart.items.some(item => item.toolId === toolId);
  };

  // Context value
  const value = {
    cart,
    loading,
    error,
    addToCart,
    updateItemQuantity,
    removeItem,
    emptyCart,
    getItemCount,
    isItemInCart
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// Hook for using cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default useCart;