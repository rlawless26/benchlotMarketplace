import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../config';
import { useAuth } from './useAuth';
import { markOfferAsRead } from '../models/offerModel';

/**
 * Hook for managing offer-related notifications
 */
const useNotifications = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buyerNotifications, setBuyerNotifications] = useState(0);
  const [sellerNotifications, setSellerNotifications] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setBuyerNotifications(0);
      setSellerNotifications(0);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const unsubscribes = [];

    try {
      // Try simpler queries if the index isn't available yet
      // First, let's use a more basic query for buyer notifications
      let buyerQuery;
      try {
        // First try the advanced query with hasUnreadMessagesBuyer
        buyerQuery = query(
          collection(db, 'offers'),
          where('buyerId', '==', user.uid),
          where('hasUnreadMessagesBuyer', '==', true),
          orderBy('updatedAt', 'desc')
        );
      } catch (err) {
        // Fallback to a simpler query without the extra filter
        console.log('Using fallback buyer notification query');
        buyerQuery = query(
          collection(db, 'offers'),
          where('buyerId', '==', user.uid),
          orderBy('updatedAt', 'desc')
        );
      }
      
      const buyerUnsubscribe = onSnapshot(buyerQuery, (snapshot) => {
        // If using the fallback query, we need to filter the results manually
        if (buyerQuery.toString().indexOf('hasUnreadMessagesBuyer') === -1) {
          const unreadCount = snapshot.docs.filter(
            doc => doc.data().hasUnreadMessagesBuyer === true
          ).length;
          setBuyerNotifications(unreadCount);
        } else {
          // Using the proper query with the filter
          setBuyerNotifications(snapshot.size);
        }
        setLoading(false);
      }, (err) => {
        console.error('Error in buyer notifications listener:', err);
        setBuyerNotifications(0);
        setError(err);
        setLoading(false);
      });
      
      unsubscribes.push(buyerUnsubscribe);
      
      // Do the same for seller notifications
      let sellerQuery;
      try {
        // First try the advanced query with hasUnreadMessagesSeller
        sellerQuery = query(
          collection(db, 'offers'),
          where('sellerId', '==', user.uid),
          where('hasUnreadMessagesSeller', '==', true),
          orderBy('updatedAt', 'desc')
        );
      } catch (err) {
        // Fallback to a simpler query without the extra filter
        console.log('Using fallback seller notification query');
        sellerQuery = query(
          collection(db, 'offers'),
          where('sellerId', '==', user.uid),
          orderBy('updatedAt', 'desc')
        );
      }
      
      const sellerUnsubscribe = onSnapshot(sellerQuery, (snapshot) => {
        // If using the fallback query, we need to filter the results manually
        if (sellerQuery.toString().indexOf('hasUnreadMessagesSeller') === -1) {
          const unreadCount = snapshot.docs.filter(
            doc => doc.data().hasUnreadMessagesSeller === true
          ).length;
          setSellerNotifications(unreadCount);
        } else {
          // Using the proper query with the filter
          setSellerNotifications(snapshot.size);
        }
        setLoading(false);
      }, (err) => {
        console.error('Error in seller notifications listener:', err);
        setSellerNotifications(0);
        setError(err);
        setLoading(false);
      });
      
      unsubscribes.push(sellerUnsubscribe);
    } catch (err) {
      console.error('Error setting up notification listeners:', err);
      setError(err);
      setLoading(false);
    }

    // Cleanup function
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [user?.uid]);

  // Mark an offer as read
  const markAsRead = async (offerId) => {
    if (!user?.uid) return;
    
    try {
      await markOfferAsRead(offerId, user.uid);
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError(err);
    }
  };

  // Total notification count
  const totalCount = buyerNotifications + sellerNotifications;

  return {
    loading,
    error,
    buyerNotifications,
    sellerNotifications,
    totalCount,
    markAsRead
  };
};

export default useNotifications;