/**
 * Firebase Order Model
 * Handles all order operations with Firestore
 */
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc, 
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config';

// Collection references
const ordersCollection = collection(db, 'orders');

/**
 * Create an order from a cart
 * @param {string} cartId - The cart ID to convert
 * @param {string} userId - The user ID
 * @param {Object} paymentDetails - Payment details
 * @returns {Promise<Object>} - The created order
 */
export const createOrderFromCart = async (cartId, userId, paymentDetails) => {
  try {
    // Get the cart with items
    const cartRef = doc(db, 'carts', cartId);
    const cartSnap = await getDoc(cartRef);
    
    if (!cartSnap.exists()) {
      throw new Error('Cart not found');
    }
    
    const cart = cartSnap.data();
    
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
    
    // Create the order
    const orderData = {
      userId,
      cartId,
      items,
      itemCount: cart.itemCount,
      totalAmount: cart.totalAmount,
      status: 'pending',
      payment: {
        method: paymentDetails.method,
        transactionId: paymentDetails.transactionId,
        status: paymentDetails.status
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const orderRef = await addDoc(ordersCollection, orderData);
    
    // Update cart status to completed
    await updateDoc(cartRef, {
      status: 'completed',
      orderId: orderRef.id,
      updatedAt: serverTimestamp()
    });
    
    return {
      id: orderRef.id,
      ...orderData
    };
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

/**
 * Get order by ID
 * @param {string} orderId - The order ID
 * @returns {Promise<Object>} - The order object
 */
export const getOrderById = async (orderId) => {
  try {
    const orderRef = doc(ordersCollection, orderId);
    const orderSnap = await getDoc(orderRef);
    
    if (!orderSnap.exists()) {
      throw new Error('Order not found');
    }
    
    return {
      id: orderSnap.id,
      ...orderSnap.data()
    };
  } catch (error) {
    console.error('Error getting order:', error);
    throw error;
  }
};

/**
 * Get orders for a user
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} - Array of order objects
 */
export const getUserOrders = async (userId) => {
  try {
    const q = query(
      ordersCollection,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    const orders = [];
    querySnapshot.forEach(doc => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return orders;
  } catch (error) {
    console.error('Error getting user orders:', error);
    throw error;
  }
};

/**
 * Update order status
 * @param {string} orderId - The order ID
 * @param {string} status - The new status
 * @returns {Promise<Object>} - The updated order
 */
export const updateOrderStatus = async (orderId, status) => {
  try {
    const orderRef = doc(ordersCollection, orderId);
    
    await updateDoc(orderRef, {
      status,
      updatedAt: serverTimestamp()
    });
    
    return getOrderById(orderId);
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

export default {
  createOrderFromCart,
  getOrderById,
  getUserOrders,
  updateOrderStatus
};