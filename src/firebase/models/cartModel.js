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
    
    // Get cart items
    const itemsCollection = collection(db, 'carts', cart.id, 'items');
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
    
    // The cart totals will be updated by the Cloud Function
    
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
    
    // The cart totals will be updated by the Cloud Function
    
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
    
    // The cart totals will be updated by the Cloud Function
    
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
    
    // Update cart totals
    const cartRef = doc(db, 'carts', cartId);
    await updateDoc(cartRef, {
      itemCount: 0,
      totalAmount: 0,
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

export default {
  getOrCreateCart,
  addItemToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  getCartById
};