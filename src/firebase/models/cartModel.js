/**
 * Firebase Cart Model
 * Handles shopping cart operations with Firestore
 */
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config';

// Collection references
const cartsCollection = collection(db, 'carts');

/**
 * Get or create a cart for a user
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} - The cart object
 */
export const getOrCreateCart = async (userId) => {
  try {
    // Check if the user has an active cart
    const q = query(
      cartsCollection,
      where('userId', '==', userId),
      where('status', '==', 'active'),
      orderBy('updatedAt', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    let cart;
    
    if (!querySnapshot.empty) {
      // User has an active cart, use it
      const doc = querySnapshot.docs[0];
      cart = {
        id: doc.id,
        ...doc.data()
      };
    } else {
      // Create a new cart for the user
      const cartData = {
        userId,
        status: 'active',
        itemCount: 0,
        totalAmount: 0,
        items: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(cartsCollection, cartData);
      
      cart = {
        id: docRef.id,
        ...cartData
      };
    }
    
    // Check if cart is completed - if so, treat it as empty
    if (cart.status === 'completed') {
      console.log('Cart is marked as completed, returning empty cart');
      return {
        ...cart,
        items: [],
        itemCount: 0,
        totalAmount: 0
      };
    }
    
    // Get cart items (first from parent document if available, otherwise from subcollection)
    let items = cart.items || [];
    
    // If we don't have items in the parent document, or they might be out of sync, 
    // get them from the subcollection
    if (!items || items.length === 0) {
      const itemsCollection = collection(db, 'carts', cart.id, 'items');
      const itemsSnapshot = await getDocs(itemsCollection);
      
      items = [];
      itemsSnapshot.forEach(doc => {
        items.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // If we found items in the subcollection but they weren't in the parent document,
      // update the parent document
      if (items.length > 0 && (!cart.items || cart.items.length === 0)) {
        await updateCartTotals(cart.id);
        // Re-fetch the cart after updating it
        const updatedCartRef = await getDoc(doc(db, 'carts', cart.id));
        if (updatedCartRef.exists()) {
          cart = {
            id: updatedCartRef.id,
            ...updatedCartRef.data()
          };
        }
      }
    }
    
    return {
      ...cart,
      items
    };
  } catch (error) {
    console.error('Error getting/creating cart:', error);
    throw error;
  }
};

/**
 * Add an item to the cart
 * @param {string} cartId - The cart ID
 * @param {Object} item - The item to add (must include toolId, price, name)
 * @returns {Promise<Object>} - The updated cart
 */
export const addItemToCart = async (cartId, item) => {
  try {
    const itemsCollection = collection(db, 'carts', cartId, 'items');
    
    // Check if the item is already in the cart
    const q = query(itemsCollection, where('toolId', '==', item.toolId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // Item exists, update quantity
      const existingItem = querySnapshot.docs[0];
      const existingData = existingItem.data();
      
      await updateDoc(doc(itemsCollection, existingItem.id), {
        quantity: existingData.quantity + (item.quantity || 1),
        updatedAt: serverTimestamp()
      });
    } else {
      // Add new item
      const itemData = {
        toolId: item.toolId,
        name: item.name,
        price: item.price,
        quantity: item.quantity || 1,
        imageUrl: item.imageUrl || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await addDoc(itemsCollection, itemData);
    }
    
    // Calculate and update cart totals
    await updateCartTotals(cartId);
    
    // Return the updated cart
    return getOrCreateCart(item.userId);
  } catch (error) {
    console.error('Error adding item to cart:', error);
    throw error;
  }
};

/**
 * Update item quantity in the cart
 * @param {string} cartId - The cart ID
 * @param {string} itemId - The item ID
 * @param {number} quantity - The new quantity
 * @returns {Promise<Object>} - The updated cart
 */
export const updateCartItemQuantity = async (cartId, itemId, quantity, userId) => {
  try {
    const itemRef = doc(db, 'carts', cartId, 'items', itemId);
    
    if (quantity <= 0) {
      // Remove the item if quantity is 0 or negative
      await deleteDoc(itemRef);
    } else {
      // Update the quantity
      await updateDoc(itemRef, {
        quantity,
        updatedAt: serverTimestamp()
      });
    }
    
    // Calculate and update cart totals
    await updateCartTotals(cartId);
    
    // Return the updated cart
    return getOrCreateCart(userId);
  } catch (error) {
    console.error('Error updating cart item quantity:', error);
    throw error;
  }
};

/**
 * Remove item from cart
 * @param {string} cartId - The cart ID
 * @param {string} itemId - The item ID to remove
 * @returns {Promise<Object>} - The updated cart
 */
export const removeCartItem = async (cartId, itemId, userId) => {
  try {
    const itemRef = doc(db, 'carts', cartId, 'items', itemId);
    await deleteDoc(itemRef);
    
    // Calculate and update cart totals
    await updateCartTotals(cartId);
    
    // Return the updated cart
    return getOrCreateCart(userId);
  } catch (error) {
    console.error('Error removing cart item:', error);
    throw error;
  }
};

/**
 * Clear all items from the cart
 * @param {string} cartId - The cart ID
 * @returns {Promise<Object>} - The updated cart
 */
export const clearCart = async (cartId, userId) => {
  try {
    const itemsCollection = collection(db, 'carts', cartId, 'items');
    const itemsSnapshot = await getDocs(itemsCollection);
    
    // Delete all items
    const deletePromises = [];
    itemsSnapshot.forEach(doc => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(deletePromises);
    
    // Update cart totals to zero
    const cartRef = doc(db, 'carts', cartId);
    await updateDoc(cartRef, {
      itemCount: 0,
      totalAmount: 0,
      items: [],
      updatedAt: serverTimestamp()
    });
    
    // Return the updated (empty) cart
    return getOrCreateCart(userId);
  } catch (error) {
    console.error('Error clearing cart:', error);
    throw error;
  }
};

/**
 * Get a cart by ID
 * @param {string} cartId - The cart ID
 * @returns {Promise<Object>} - The cart object with items
 */
export const getCartById = async (cartId) => {
  try {
    const cartRef = doc(db, 'carts', cartId);
    const cartDoc = await getDoc(cartRef);
    
    if (!cartDoc.exists()) {
      throw new Error('Cart not found');
    }
    
    const cart = {
      id: cartDoc.id,
      ...cartDoc.data()
    };
    
    // Get cart items
    const itemsCollection = collection(db, 'carts', cartId, 'items');
    const itemsSnapshot = await getDocs(itemsCollection);
    
    const items = [];
    itemsSnapshot.forEach(doc => {
      items.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return {
      ...cart,
      items
    };
  } catch (error) {
    console.error('Error getting cart:', error);
    throw error;
  }
};

/**
 * Calculate and update cart totals based on items in the subcollection
 * @param {string} cartId - The cart ID to update
 * @returns {Promise<boolean>} - Success status
 */
export const updateCartTotals = async (cartId) => {
  try {
    console.log(`Updating cart totals for: ${cartId}`);
    const cartRef = doc(db, 'carts', cartId);
    const cartDoc = await getDoc(cartRef);
    
    if (!cartDoc.exists()) {
      console.log(`Cart ${cartId} not found`);
      return false;
    }
    
    // Get items from the subcollection
    const itemsCollectionRef = collection(db, 'carts', cartId, 'items');
    const itemsSnapshot = await getDocs(itemsCollectionRef);
    
    let totalAmount = 0;
    let itemCount = 0;
    const items = [];
    
    itemsSnapshot.forEach((doc) => {
      const item = doc.data();
      if (item.price && item.quantity) {
        totalAmount += item.price * item.quantity;
        itemCount += item.quantity;
        items.push({
          id: doc.id,
          ...item
        });
      }
    });
    
    console.log(`Calculated totals: itemCount=${itemCount}, totalAmount=${totalAmount}`);
    
    // Update the cart with correct values
    await updateDoc(cartRef, {
      itemCount,
      totalAmount,
      items, // Also store items in the parent document for easier access
      updatedAt: serverTimestamp()
    });
    
    console.log(`Cart ${cartId} totals updated successfully!`);
    return true;
  } catch (error) {
    console.error(`Error updating cart totals for ${cartId}:`, error);
    return false;
  }
};

export default {
  getOrCreateCart,
  addItemToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  getCartById,
  updateCartTotals
};