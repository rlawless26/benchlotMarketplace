/**
 * useOffers Hook
 * Provides offer functionality and state management for components
 */
import { useState, useEffect, useCallback } from 'react';
import { onSnapshot, collection, query, where, orderBy, doc } from 'firebase/firestore';
import { db } from '../config';
import { useAuth } from './useAuth';
import offerModel, { OfferStatus } from '../models/offerModel';

const useOffers = (toolId = null) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buyerOffers, setBuyerOffers] = useState([]);
  const [sellerOffers, setSellerOffers] = useState([]);
  const [activeOffers, setActiveOffers] = useState([]);
  const [toolOffers, setToolOffers] = useState([]);
  
  // Get all offers for the current user as buyer
  const loadBuyerOffers = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      const offers = await offerModel.getUserBuyerOffers(user.uid);
      setBuyerOffers(offers);
      setError(null);
    } catch (err) {
      console.error('Error loading buyer offers:', err);
      setError('Failed to load your offers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);
  
  // Get all offers for the current user as seller
  const loadSellerOffers = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      const offers = await offerModel.getUserSellerOffers(user.uid);
      setSellerOffers(offers);
      setError(null);
    } catch (err) {
      console.error('Error loading seller offers:', err);
      setError('Failed to load offers for your listings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);
  
  // Get active offers for the current user (both as buyer and seller)
  const loadActiveOffers = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      
      // Get active buyer offers
      const buyerOffersData = await offerModel.getUserBuyerOffers(user.uid, { 
        active: true 
      });
      
      // Get active seller offers
      const sellerOffersData = await offerModel.getUserSellerOffers(user.uid, { 
        active: true 
      });
      
      // Combine and sort by update time
      const combined = [...buyerOffersData, ...sellerOffersData]
        .sort((a, b) => {
          const timeA = a.updatedAt?.toDate?.() || new Date();
          const timeB = b.updatedAt?.toDate?.() || new Date();
          return timeB - timeA; // Descending order (newest first)
        });
      
      setActiveOffers(combined);
      setError(null);
    } catch (err) {
      console.error('Error loading active offers:', err);
      setError('Failed to load your active offers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);
  
  // Get offers for a specific tool
  const loadToolOffers = useCallback(async (id = toolId) => {
    if (!id) return;
    
    try {
      setLoading(true);
      const offers = await offerModel.getToolOffers(id);
      setToolOffers(offers);
      setError(null);
    } catch (err) {
      console.error('Error loading tool offers:', err);
      setError('Failed to load offers for this tool. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [toolId]);
  
  // Create a new offer
  const createOffer = useCallback(async (offerData) => {
    if (!user?.uid) throw new Error('You must be logged in to make an offer');
    
    try {
      const newOffer = await offerModel.createOffer({
        ...offerData,
        buyerId: user.uid
      });
      
      return newOffer;
    } catch (err) {
      console.error('Error creating offer:', err);
      throw err;
    }
  }, [user]);
  
  // Accept an offer
  const acceptOffer = useCallback(async (offerId) => {
    if (!user?.uid) throw new Error('You must be logged in to accept an offer');
    
    try {
      return await offerModel.acceptOffer(offerId, user.uid);
    } catch (err) {
      console.error('Error accepting offer:', err);
      throw err;
    }
  }, [user]);
  
  // Counter an offer
  const counterOffer = useCallback(async (offerId, price, message = '') => {
    if (!user?.uid) throw new Error('You must be logged in to counter an offer');
    
    try {
      return await offerModel.counterOffer(offerId, user.uid, price, message);
    } catch (err) {
      console.error('Error countering offer:', err);
      throw err;
    }
  }, [user]);
  
  // Decline an offer
  const declineOffer = useCallback(async (offerId, reason = '') => {
    if (!user?.uid) throw new Error('You must be logged in to decline an offer');
    
    try {
      return await offerModel.declineOffer(offerId, user.uid, reason);
    } catch (err) {
      console.error('Error declining offer:', err);
      throw err;
    }
  }, [user]);
  
  // Cancel an offer
  const cancelOffer = useCallback(async (offerId) => {
    if (!user?.uid) throw new Error('You must be logged in to cancel an offer');
    
    try {
      return await offerModel.cancelOffer(offerId, user.uid);
    } catch (err) {
      console.error('Error cancelling offer:', err);
      throw err;
    }
  }, [user]);
  
  // Add a message to an offer
  const addMessage = useCallback(async (offerId, message) => {
    if (!user?.uid) throw new Error('You must be logged in to send a message');
    
    try {
      return await offerModel.addOfferMessage(offerId, {
        senderId: user.uid,
        message
      });
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  }, [user]);
  
  // Get messages for an offer
  const getMessages = useCallback(async (offerId) => {
    try {
      return await offerModel.getOfferMessages(offerId);
    } catch (err) {
      console.error('Error getting messages:', err);
      throw err;
    }
  }, []);
  
  // Mark an offer as read
  const markOfferAsRead = useCallback(async (offerId) => {
    if (!user?.uid) return;
    
    try {
      await offerModel.markOfferAsRead(offerId, user.uid);
      await offerModel.markOfferMessagesAsRead(offerId, user.uid);
    } catch (err) {
      console.error('Error marking offer as read:', err);
    }
  }, [user]);
  
  // Set up real-time listeners with better error handling
  useEffect(() => {
    if (!user?.uid) return;
    
    // Get initial blank state to avoid null errors
    setBuyerOffers([]);
    setSellerOffers([]);
    setActiveOffers([]);
    
    // Create unsubscribe functions array
    const unsubscribes = [];
    
    try {
      // Set up listener for buyer offers
      const buyerOffersQuery = query(
        collection(db, 'offers'),
        where('buyerId', '==', user.uid),
        orderBy('updatedAt', 'desc')
      );
      
      const unsubscribeBuyer = onSnapshot(buyerOffersQuery, (snapshot) => {
        const offers = [];
        snapshot.forEach(doc => {
          offers.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setBuyerOffers(offers);
        setLoading(false);
      }, (err) => {
        console.error('Error in buyer offers listener:', err);
        // Don't set error state - just log it
        setLoading(false);
      });
      
      unsubscribes.push(unsubscribeBuyer);
      
      // Set up listener for seller offers
      const sellerOffersQuery = query(
        collection(db, 'offers'),
        where('sellerId', '==', user.uid),
        orderBy('updatedAt', 'desc')
      );
      
      const unsubscribeSeller = onSnapshot(sellerOffersQuery, (snapshot) => {
        const offers = [];
        snapshot.forEach(doc => {
          offers.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setSellerOffers(offers);
        setLoading(false);
      }, (err) => {
        console.error('Error in seller offers listener:', err);
        // Don't set error state - just log it
        setLoading(false);
      });
      
      unsubscribes.push(unsubscribeSeller);
    } catch (err) {
      console.error('Error setting up offers listeners:', err);
      setLoading(false);
    }
    
    // Clean up all listeners
    return () => {
      unsubscribes.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (err) {
          // Ignore errors during cleanup
        }
      });
    };
  }, [user]);
  
  // Set up tool-specific listener with improved error handling
  useEffect(() => {
    if (!toolId || !user?.uid) return;
    
    // Initialize with empty array
    setToolOffers([]);
    
    try {
      const toolOffersQuery = query(
        collection(db, 'offers'),
        where('toolId', '==', toolId),
        orderBy('updatedAt', 'desc')
      );
      
      const unsubscribeTool = onSnapshot(toolOffersQuery, (snapshot) => {
        const offers = [];
        snapshot.forEach(doc => {
          offers.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setToolOffers(offers);
      }, (err) => {
        // Just log the error, don't set error state
        console.error('Error in tool offers listener:', err);
      });
      
      return () => {
        try {
          unsubscribeTool();
        } catch (err) {
          // Ignore cleanup errors
        }
      };
    } catch (err) {
      console.error('Error setting up tool offers listener:', err);
      return () => {};
    }
  }, [toolId, user]);
  
  // Update active offers whenever buyer or seller offers change
  useEffect(() => {
    const buyerActive = buyerOffers.filter(offer => offer.isActive);
    const sellerActive = sellerOffers.filter(offer => offer.isActive);
    
    // Combine and sort by update time
    const combined = [...buyerActive, ...sellerActive]
      .sort((a, b) => {
        const timeA = a.updatedAt?.toDate?.() || new Date();
        const timeB = b.updatedAt?.toDate?.() || new Date();
        return timeB - timeA; // Descending order (newest first)
      });
    
    setActiveOffers(combined);
  }, [buyerOffers, sellerOffers]);
  
  return {
    loading,
    error,
    buyerOffers,
    sellerOffers,
    toolOffers,
    activeOffers,
    loadBuyerOffers,
    loadSellerOffers,
    loadActiveOffers,
    loadToolOffers,
    createOffer,
    acceptOffer,
    counterOffer,
    declineOffer,
    cancelOffer,
    addMessage,
    getMessages,
    markOfferAsRead,
    hasUnreadOffers: [...buyerOffers, ...sellerOffers].some(offer => 
      (user?.uid === offer.buyerId && offer.hasUnreadMessagesBuyer) ||
      (user?.uid === offer.sellerId && offer.hasUnreadMessagesSeller)
    ),
    OfferStatus
  };
};

export { useOffers };