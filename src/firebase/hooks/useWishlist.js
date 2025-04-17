/**
 * useWishlist Hook
 * Custom hook for interacting with user's wishlist
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import {
  addToWishlist,
  removeFromWishlist,
  toggleWishlistItem,
  isToolInWishlist,
  getWishlistWithDetails,
  subscribeToWishlist
} from '../models/wishlistModel';

export const useWishlist = () => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Load wishlist items with real-time updates
  useEffect(() => {
    let unsubscribe = () => {};
    
    const setupWishlistSubscription = async () => {
      setLoading(true);
      setError(null);
      
      if (!isAuthenticated()) {
        setWishlistItems([]);
        setLoading(false);
        return;
      }
      
      try {
        // Subscribe to real-time updates
        unsubscribe = subscribeToWishlist((items) => {
          setWishlistItems(items);
          setLoading(false);
        });
      } catch (err) {
        console.error('Error setting up wishlist subscription:', err);
        setError('Failed to load wishlist items');
        setLoading(false);
      }
    };
    
    setupWishlistSubscription();
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [isAuthenticated, user]);

  // Check if a tool is in the wishlist
  const checkInWishlist = useCallback(async (toolId) => {
    if (!isAuthenticated()) {
      return false;
    }
    
    try {
      return await isToolInWishlist(toolId);
    } catch (err) {
      console.error('Error checking wishlist status:', err);
      return false;
    }
  }, [isAuthenticated]);

  // Add a tool to the wishlist
  const addToWishlistHandler = useCallback(async (toolId) => {
    if (!isAuthenticated()) {
      navigate('/login', { state: { from: `/tools/${toolId}` } });
      return { success: false, error: 'Please login to save tools' };
    }
    
    try {
      setError(null);
      const result = await addToWishlist(toolId);
      return result;
    } catch (err) {
      setError('Failed to add to wishlist');
      console.error('Error adding to wishlist:', err);
      return { success: false, error: err.message };
    }
  }, [isAuthenticated, navigate]);

  // Remove a tool from the wishlist
  const removeFromWishlistHandler = useCallback(async (toolId) => {
    if (!isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    
    try {
      setError(null);
      const result = await removeFromWishlist(toolId);
      return result;
    } catch (err) {
      setError('Failed to remove from wishlist');
      console.error('Error removing from wishlist:', err);
      return { success: false, error: err.message };
    }
  }, [isAuthenticated]);

  // Toggle a tool in the wishlist (add if not present, remove if present)
  const toggleWishlistHandler = useCallback(async (toolId) => {
    if (!isAuthenticated()) {
      navigate('/login', { state: { from: `/tools/${toolId}` } });
      return { success: false, error: 'Please login to save tools' };
    }
    
    try {
      setError(null);
      const result = await toggleWishlistItem(toolId);
      return result;
    } catch (err) {
      setError('Failed to update wishlist');
      console.error('Error toggling wishlist item:', err);
      return { success: false, error: err.message };
    }
  }, [isAuthenticated, navigate]);

  // Refresh the wishlist manually (useful for after actions)
  const refreshWishlist = useCallback(async () => {
    if (!isAuthenticated()) {
      setWishlistItems([]);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const items = await getWishlistWithDetails();
      setWishlistItems(items);
    } catch (err) {
      setError('Failed to refresh wishlist');
      console.error('Error refreshing wishlist:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  return {
    wishlistItems,
    loading,
    error,
    checkInWishlist,
    addToWishlist: addToWishlistHandler,
    removeFromWishlist: removeFromWishlistHandler,
    toggleWishlist: toggleWishlistHandler,
    refreshWishlist,
    count: wishlistItems.length
  };
};

export default useWishlist;