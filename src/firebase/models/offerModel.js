/**
 * Firebase Offer Model
 * Handles offer and negotiation operations with Firestore
 */
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc, 
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  limit,
  Timestamp,
  getCountFromServer
} from 'firebase/firestore';
import { db } from '../config';

// Collection references
const offersCollection = collection(db, 'offers');

/**
 * Offer statuses
 */
export const OfferStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  COUNTERED: 'countered',
  DECLINED: 'declined',
  EXPIRED: 'expired',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

/**
 * Create a new offer
 * @param {Object} offerData - The offer data
 * @returns {Promise<Object>} - The created offer
 */
export const createOffer = async (offerData) => {
  try {
    const { toolId, toolTitle, sellerId, buyerId, price, message } = offerData;
    
    if (!toolId || !sellerId || !buyerId || !price) {
      throw new Error('Missing required fields for offer');
    }
    
    // Create offer document
    const offerRef = await addDoc(offersCollection, {
      toolId,
      toolTitle: toolTitle || 'Tool',
      sellerId,
      buyerId,
      originalPrice: offerData.originalPrice || price,
      currentPrice: price,
      status: OfferStatus.PENDING,
      isActive: true,
      hasUnreadMessagesBuyer: false,
      hasUnreadMessagesSeller: true, // Initial offer is unread by seller
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + (7 * 24 * 60 * 60 * 1000))) // 7 days expiration
    });
    
    // Create initial message
    const messagesCollection = collection(db, 'offers', offerRef.id, 'messages');
    await addDoc(messagesCollection, {
      senderId: buyerId,
      recipientId: sellerId,
      messageType: 'offer', // Types: offer, counter, message, system
      price,
      message: message || '',
      createdAt: serverTimestamp(),
      isRead: false
    });
    
    // Get the offer with ID
    const offerSnap = await getDoc(offerRef);
    
    return {
      id: offerRef.id,
      ...offerSnap.data()
    };
  } catch (error) {
    console.error('Error creating offer:', error);
    throw error;
  }
};

/**
 * Get offer by ID
 * @param {string} offerId - The offer ID
 * @returns {Promise<Object>} - The offer object
 */
export const getOfferById = async (offerId) => {
  try {
    const offerRef = doc(offersCollection, offerId);
    const offerSnap = await getDoc(offerRef);
    
    if (!offerSnap.exists()) {
      throw new Error('Offer not found');
    }
    
    return {
      id: offerSnap.id,
      ...offerSnap.data()
    };
  } catch (error) {
    console.error('Error getting offer:', error);
    throw error;
  }
};

/**
 * Get offers for a user as buyer
 * @param {string} userId - The user ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Array of offer objects
 */
export const getUserBuyerOffers = async (userId, options = {}) => {
  try {
    const { status, active, limit: queryLimit = 50 } = options;
    
    let q = query(
      offersCollection,
      where('buyerId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    
    if (status) {
      q = query(q, where('status', '==', status));
    }
    
    if (active !== undefined) {
      q = query(q, where('isActive', '==', active));
    }
    
    if (queryLimit) {
      q = query(q, limit(queryLimit));
    }
    
    const querySnapshot = await getDocs(q);
    
    const offers = [];
    querySnapshot.forEach(doc => {
      offers.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return offers;
  } catch (error) {
    console.error('Error getting user buyer offers:', error);
    throw error;
  }
};

/**
 * Get offers for a user as seller
 * @param {string} userId - The user ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Array of offer objects
 */
export const getUserSellerOffers = async (userId, options = {}) => {
  try {
    const { status, active, limit: queryLimit = 50 } = options;
    
    let q = query(
      offersCollection,
      where('sellerId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    
    if (status) {
      q = query(q, where('status', '==', status));
    }
    
    if (active !== undefined) {
      q = query(q, where('isActive', '==', active));
    }
    
    if (queryLimit) {
      q = query(q, limit(queryLimit));
    }
    
    const querySnapshot = await getDocs(q);
    
    const offers = [];
    querySnapshot.forEach(doc => {
      offers.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return offers;
  } catch (error) {
    console.error('Error getting user seller offers:', error);
    throw error;
  }
};

/**
 * Get offers for a specific tool
 * @param {string} toolId - The tool ID
 * @returns {Promise<Array>} - Array of offer objects
 */
export const getToolOffers = async (toolId) => {
  try {
    const q = query(
      offersCollection,
      where('toolId', '==', toolId),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    const offers = [];
    querySnapshot.forEach(doc => {
      offers.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return offers;
  } catch (error) {
    console.error('Error getting tool offers:', error);
    throw error;
  }
};

/**
 * Update offer status
 * @param {string} offerId - The offer ID
 * @param {string} status - The new status
 * @returns {Promise<Object>} - The updated offer
 */
export const updateOfferStatus = async (offerId, status, options = {}) => {
  try {
    const offerRef = doc(offersCollection, offerId);
    const offerSnap = await getDoc(offerRef);
    
    if (!offerSnap.exists()) {
      throw new Error('Offer not found');
    }
    
    const offerData = offerSnap.data();
    const { price, systemMessage } = options;
    const updateObj = {
      status,
      updatedAt: serverTimestamp()
    };
    
    // If price is changed in a counter offer
    if (price && status === OfferStatus.COUNTERED) {
      updateObj.currentPrice = price;
    }
    
    // If offer is no longer active
    if ([OfferStatus.ACCEPTED, OfferStatus.DECLINED, OfferStatus.EXPIRED, OfferStatus.COMPLETED, OfferStatus.CANCELLED].includes(status)) {
      updateObj.isActive = false;
    }
    
    // Mark as unread for the other party
    if (options.senderId === offerData.buyerId) {
      updateObj.hasUnreadMessagesSeller = true;
      updateObj.hasUnreadMessagesBuyer = false;
    } else {
      updateObj.hasUnreadMessagesBuyer = true;
      updateObj.hasUnreadMessagesSeller = false;
    }
    
    await updateDoc(offerRef, updateObj);
    
    // Add a message to the offer thread
    if (options.senderId) {
      const messagesCollection = collection(db, 'offers', offerId, 'messages');
      const messageData = {
        senderId: options.senderId,
        recipientId: options.senderId === offerData.buyerId ? offerData.sellerId : offerData.buyerId,
        messageType: status === OfferStatus.COUNTERED ? 'counter' : status,
        createdAt: serverTimestamp(),
        isRead: false
      };
      
      if (price && status === OfferStatus.COUNTERED) {
        messageData.price = price;
      }
      
      if (systemMessage) {
        messageData.message = systemMessage;
      }
      
      await addDoc(messagesCollection, messageData);
    }
    
    return getOfferById(offerId);
  } catch (error) {
    console.error('Error updating offer status:', error);
    throw error;
  }
};

/**
 * Accept an offer
 * @param {string} offerId - The offer ID
 * @param {string} accepterId - The ID of the user accepting the offer
 * @returns {Promise<Object>} - The updated offer
 */
export const acceptOffer = async (offerId, accepterId) => {
  try {
    const offer = await getOfferById(offerId);
    
    // Verify user is authorized to accept
    if (offer.buyerId !== accepterId && offer.sellerId !== accepterId) {
      throw new Error('User not authorized to accept this offer');
    }
    
    // Only pending or countered offers can be accepted
    if (![OfferStatus.PENDING, OfferStatus.COUNTERED].includes(offer.status)) {
      throw new Error(`Cannot accept an offer with status: ${offer.status}`);
    }
    
    return updateOfferStatus(offerId, OfferStatus.ACCEPTED, {
      senderId: accepterId,
      systemMessage: 'Offer accepted'
    });
  } catch (error) {
    console.error('Error accepting offer:', error);
    throw error;
  }
};

/**
 * Counter an offer
 * @param {string} offerId - The offer ID
 * @param {string} countererId - The ID of the user making the counter offer
 * @param {number} price - The counter offer price
 * @param {string} message - Optional message with the counter
 * @returns {Promise<Object>} - The updated offer
 */
export const counterOffer = async (offerId, countererId, price, message = '') => {
  try {
    const offer = await getOfferById(offerId);
    
    // Verify user is authorized to counter
    if (offer.buyerId !== countererId && offer.sellerId !== countererId) {
      throw new Error('User not authorized to counter this offer');
    }
    
    // Only pending or countered offers can be countered
    if (![OfferStatus.PENDING, OfferStatus.COUNTERED].includes(offer.status)) {
      throw new Error(`Cannot counter an offer with status: ${offer.status}`);
    }
    
    return updateOfferStatus(offerId, OfferStatus.COUNTERED, {
      senderId: countererId,
      price,
      systemMessage: message
    });
  } catch (error) {
    console.error('Error countering offer:', error);
    throw error;
  }
};

/**
 * Decline an offer
 * @param {string} offerId - The offer ID
 * @param {string} declinerId - The ID of the user declining the offer
 * @param {string} reason - Optional reason for declining
 * @returns {Promise<Object>} - The updated offer
 */
export const declineOffer = async (offerId, declinerId, reason = '') => {
  try {
    const offer = await getOfferById(offerId);
    
    // Verify user is authorized to decline
    if (offer.buyerId !== declinerId && offer.sellerId !== declinerId) {
      throw new Error('User not authorized to decline this offer');
    }
    
    // Only pending or countered offers can be declined
    if (![OfferStatus.PENDING, OfferStatus.COUNTERED].includes(offer.status)) {
      throw new Error(`Cannot decline an offer with status: ${offer.status}`);
    }
    
    return updateOfferStatus(offerId, OfferStatus.DECLINED, {
      senderId: declinerId,
      systemMessage: reason || 'Offer declined'
    });
  } catch (error) {
    console.error('Error declining offer:', error);
    throw error;
  }
};

/**
 * Cancel an offer
 * @param {string} offerId - The offer ID
 * @param {string} cancelerId - The ID of the user canceling the offer
 * @returns {Promise<Object>} - The updated offer
 */
export const cancelOffer = async (offerId, cancelerId) => {
  try {
    const offer = await getOfferById(offerId);
    
    // Verify user is authorized to cancel
    if (offer.buyerId !== cancelerId && offer.sellerId !== cancelerId) {
      throw new Error('User not authorized to cancel this offer');
    }
    
    // Only pending or countered offers can be cancelled
    if (![OfferStatus.PENDING, OfferStatus.COUNTERED].includes(offer.status)) {
      throw new Error(`Cannot cancel an offer with status: ${offer.status}`);
    }
    
    return updateOfferStatus(offerId, OfferStatus.CANCELLED, {
      senderId: cancelerId,
      systemMessage: 'Offer cancelled'
    });
  } catch (error) {
    console.error('Error cancelling offer:', error);
    throw error;
  }
};

/**
 * Mark offer as read for a user
 * @param {string} offerId - The offer ID
 * @param {string} userId - The user ID
 * @returns {Promise<void>}
 */
export const markOfferAsRead = async (offerId, userId) => {
  try {
    const offer = await getOfferById(offerId);
    
    if (!offer) {
      throw new Error('Offer not found');
    }
    
    const updates = {};
    
    if (userId === offer.buyerId) {
      updates.hasUnreadMessagesBuyer = false;
    } else if (userId === offer.sellerId) {
      updates.hasUnreadMessagesSeller = false;
    } else {
      throw new Error('User not associated with this offer');
    }
    
    const offerRef = doc(offersCollection, offerId);
    await updateDoc(offerRef, updates);
  } catch (error) {
    console.error('Error marking offer as read:', error);
    throw error;
  }
};

/**
 * Add a message to an offer thread
 * @param {string} offerId - The offer ID
 * @param {Object} messageData - The message data
 * @returns {Promise<Object>} - The created message
 */
export const addOfferMessage = async (offerId, messageData) => {
  try {
    const { senderId, message } = messageData;
    
    if (!senderId || !message) {
      throw new Error('Missing required fields for message');
    }
    
    const offer = await getOfferById(offerId);
    
    // Verify user is authorized to message
    if (offer.buyerId !== senderId && offer.sellerId !== senderId) {
      throw new Error('User not authorized to message in this offer');
    }
    
    const recipientId = senderId === offer.buyerId ? offer.sellerId : offer.buyerId;
    
    const messagesCollection = collection(db, 'offers', offerId, 'messages');
    const messageRef = await addDoc(messagesCollection, {
      senderId,
      recipientId,
      message,
      messageType: 'message',
      createdAt: serverTimestamp(),
      isRead: false
    });
    
    // Update offer document to mark unread for recipient
    const offerRef = doc(offersCollection, offerId);
    const updates = {
      updatedAt: serverTimestamp()
    };
    
    if (senderId === offer.buyerId) {
      updates.hasUnreadMessagesSeller = true;
    } else {
      updates.hasUnreadMessagesBuyer = true;
    }
    
    await updateDoc(offerRef, updates);
    
    // Get the message with ID
    const messageSnap = await getDoc(messageRef);
    
    return {
      id: messageRef.id,
      ...messageSnap.data()
    };
  } catch (error) {
    console.error('Error adding offer message:', error);
    throw error;
  }
};

/**
 * Get messages for an offer
 * @param {string} offerId - The offer ID
 * @returns {Promise<Array>} - Array of message objects
 */
export const getOfferMessages = async (offerId) => {
  try {
    const messagesCollection = collection(db, 'offers', offerId, 'messages');
    const q = query(messagesCollection, orderBy('createdAt'));
    
    const querySnapshot = await getDocs(q);
    
    const messages = [];
    querySnapshot.forEach(doc => {
      messages.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return messages;
  } catch (error) {
    console.error('Error getting offer messages:', error);
    throw error;
  }
};

/**
 * Mark all messages as read for a user in an offer
 * @param {string} offerId - The offer ID
 * @param {string} userId - The user ID
 * @returns {Promise<void>}
 */
export const markOfferMessagesAsRead = async (offerId, userId) => {
  try {
    const offer = await getOfferById(offerId);
    
    if (!offer) {
      throw new Error('Offer not found');
    }
    
    // Verify user is part of this offer
    if (offer.buyerId !== userId && offer.sellerId !== userId) {
      throw new Error('User not associated with this offer');
    }
    
    const messagesCollection = collection(db, 'offers', offerId, 'messages');
    const q = query(
      messagesCollection,
      where('recipientId', '==', userId),
      where('isRead', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    
    // Update each message
    const batch = [];
    querySnapshot.forEach(doc => {
      const messageRef = doc.ref;
      batch.push(updateDoc(messageRef, { isRead: true }));
    });
    
    await Promise.all(batch);
    
    // Update offer document
    const offerRef = doc(offersCollection, offerId);
    const updates = {};
    
    if (userId === offer.buyerId) {
      updates.hasUnreadMessagesBuyer = false;
    } else {
      updates.hasUnreadMessagesSeller = false;
    }
    
    await updateDoc(offerRef, updates);
  } catch (error) {
    console.error('Error marking offer messages as read:', error);
    throw error;
  }
};

/**
 * Check if the offers collection exists
 * @returns {Promise<boolean>} - True if collection exists with documents
 */
export const checkOffersCollectionExists = async () => {
  try {
    const coll = collection(db, 'offers');
    const snapshot = await getCountFromServer(coll);
    return snapshot.data().count > 0;
  } catch (error) {
    console.error('Error checking offers collection:', error);
    return false;
  }
};

/**
 * Create a mock offer for development
 * This can be removed once real offers are being created
 * @param {string} userId - User ID to create a mock offer for
 * @returns {Promise<Object>} - The created mock offer
 */
export const createMockOffer = async (userId) => {
  try {
    // Example mock data
    const mockData = {
      toolId: 'mock-tool-123',
      toolTitle: 'DeWalt Power Drill',
      buyerId: userId,
      sellerId: 'mock-seller-456',
      originalPrice: 199.99,
      currentPrice: 149.99,
      status: OfferStatus.PENDING,
      isActive: true,
      hasUnreadMessagesBuyer: false,
      hasUnreadMessagesSeller: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)))
    };
    
    const offerRef = await addDoc(offersCollection, mockData);
    
    // Add an initial message
    const messagesCollection = collection(db, 'offers', offerRef.id, 'messages');
    await addDoc(messagesCollection, {
      senderId: userId,
      recipientId: 'mock-seller-456',
      messageType: 'offer',
      price: 149.99,
      message: 'This is a test offer for development purposes.',
      createdAt: serverTimestamp(),
      isRead: false
    });
    
    return {
      id: offerRef.id,
      ...mockData
    };
  } catch (error) {
    console.error('Error creating mock offer:', error);
    throw error;
  }
};

export default {
  createOffer,
  getOfferById,
  getUserBuyerOffers,
  getUserSellerOffers,
  getToolOffers,
  updateOfferStatus,
  acceptOffer,
  counterOffer,
  declineOffer,
  cancelOffer,
  markOfferAsRead,
  addOfferMessage,
  getOfferMessages,
  markOfferMessagesAsRead,
  checkOffersCollectionExists,
  createMockOffer,
  OfferStatus
};