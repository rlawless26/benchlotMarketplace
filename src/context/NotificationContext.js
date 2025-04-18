import React, { createContext, useContext, useState, useEffect, Fragment } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../firebase/hooks/useAuth';

// Create notification context
const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [activeNotifications, setActiveNotifications] = useState([]);
  const [popup, setPopup] = useState(null);

  // Track if we've seen the initial data load
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setActiveNotifications([]);
      return;
    }

    const unsubscribes = [];

    try {
      // Listen for new messages where user is the buyer
      const buyerQuery = query(
        collection(db, 'offers'),
        where('buyerId', '==', user.uid),
        where('hasUnreadMessagesBuyer', '==', true),
        orderBy('updatedAt', 'desc'),
        limit(10)
      );
      
      const buyerUnsubscribe = onSnapshot(buyerQuery, (snapshot) => {
        // Only process changes after initial load
        if (initialLoadComplete) {
          snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
              const offerData = {
                id: change.doc.id,
                ...change.doc.data(),
                type: 'buyer'
              };
              handleNewNotification(offerData);
            }
          });
        }
      });
      
      unsubscribes.push(buyerUnsubscribe);
      
      // Listen for new messages where user is the seller
      const sellerQuery = query(
        collection(db, 'offers'),
        where('sellerId', '==', user.uid),
        where('hasUnreadMessagesSeller', '==', true),
        orderBy('updatedAt', 'desc'),
        limit(10)
      );
      
      const sellerUnsubscribe = onSnapshot(sellerQuery, (snapshot) => {
        // Only process changes after initial load
        if (initialLoadComplete) {
          snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
              const offerData = {
                id: change.doc.id,
                ...change.doc.data(),
                type: 'seller'
              };
              handleNewNotification(offerData);
            }
          });
        } else {
          // Mark that we've completed initial load
          setInitialLoadComplete(true);
        }
      });
      
      unsubscribes.push(sellerUnsubscribe);
    } catch (err) {
      console.error('Error setting up notification listeners:', err);
    }

    // Cleanup function
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [user?.uid, initialLoadComplete]);

  // Handle a new notification
  const handleNewNotification = (offerData) => {
    // Add to active notifications array
    setActiveNotifications(prev => {
      // Don't add if it's already in the list
      if (prev.find(n => n.id === offerData.id)) {
        return prev;
      }
      return [...prev, offerData];
    });
    
    // Show popup for the new notification
    setPopup({
      title: offerData.type === 'buyer' ? 'New seller message' : 'New offer or message',
      message: `You have a new message regarding ${offerData.toolTitle}`,
      type: 'message',
      link: `/messages/${offerData.id}`,
      id: offerData.id
    });
  };

  // Handle closing a notification popup
  const closePopup = () => {
    setPopup(null);
  };

  // Context value
  const value = {
    activeNotifications,
    showNotification: (notificationData) => {
      setPopup(notificationData);
    }
  };

  // We'll use a dynamic import to lazily load the NotificationPopup component
  // This avoids the React Router context issues
  const [NotificationPopupComponent, setNotificationPopupComponent] = useState(null);

  useEffect(() => {
    // Only load the popup component when needed
    if (popup) {
      import('../components/NotificationPopup').then(module => {
        setNotificationPopupComponent(() => module.default);
      });
    }
  }, [popup]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {popup && NotificationPopupComponent && (
        <NotificationPopupComponent
          title={popup.title}
          message={popup.message}
          type={popup.type}
          link={popup.link}
          onClose={closePopup}
        />
      )}
    </NotificationContext.Provider>
  );
};

// Hook for using the notification context
export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;