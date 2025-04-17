/**
 * Wishlist Model for Firebase
 * Manages the user's wishlist functionality with Firestore
 */
import { 
  doc, 
  collection,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../';
import { getToolById } from './toolModel';

// Collection reference
const wishlistCollection = collection(db, 'wishlists');

/**
 * Add a tool to the current user's wishlist
 * @param {string} toolId - The ID of the tool to add
 * @returns {Promise<Object>} Result object with success status
 */
export const addToWishlist = async (toolId) => {
  try {
    if (!auth.currentUser) {
      throw new Error('You must be logged in to save tools');
    }
    
    const userId = auth.currentUser.uid;
    
    // Check if the tool exists
    const toolDoc = await getToolById(toolId);
    if (!toolDoc) {
      throw new Error('Tool not found');
    }
    
    // Reference to the user's wishlist document
    const wishlistDocRef = doc(db, 'wishlists', userId);
    
    // Get the wishlist document
    const wishlistDocSnap = await getDoc(wishlistDocRef);
    
    if (!wishlistDocSnap.exists()) {
      // Create a new wishlist with this tool as the first item
      await setDoc(wishlistDocRef, {
        userId,
        tools: [{
          toolId,
          addedAt: new Date().toISOString()
        }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      // Check if tool is already in wishlist
      const wishlistData = wishlistDocSnap.data();
      const toolExists = wishlistData.tools.some(tool => tool.toolId === toolId);
      
      if (toolExists) {
        return { success: true, message: 'Tool already in wishlist' };
      }
      
      // Add tool to existing wishlist
      await updateDoc(wishlistDocRef, {
        tools: arrayUnion({
          toolId,
          addedAt: new Date().toISOString()
        }),
        updatedAt: serverTimestamp()
      });
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to add item to wishlist' 
    };
  }
};

/**
 * Remove a tool from the current user's wishlist
 * @param {string} toolId - The ID of the tool to remove
 * @returns {Promise<Object>} Result object with success status
 */
export const removeFromWishlist = async (toolId) => {
  try {
    if (!auth.currentUser) {
      throw new Error('You must be logged in to manage your wishlist');
    }
    
    const userId = auth.currentUser.uid;
    
    // Reference to the user's wishlist document
    const wishlistDocRef = doc(db, 'wishlists', userId);
    
    // Get the wishlist document
    const wishlistDocSnap = await getDoc(wishlistDocRef);
    
    if (!wishlistDocSnap.exists()) {
      return { success: true, message: 'Nothing to remove' };
    }
    
    // Get the wishlist data
    const wishlistData = wishlistDocSnap.data();
    
    // Filter out the tool to remove
    const updatedTools = wishlistData.tools.filter(tool => tool.toolId !== toolId);
    
    // Update the wishlist document
    await updateDoc(wishlistDocRef, {
      tools: updatedTools,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
    
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to remove item from wishlist' 
    };
  }
};

/**
 * Check if a tool is in the current user's wishlist
 * @param {string} toolId - The ID of the tool to check
 * @returns {Promise<boolean>} Whether the tool is in the wishlist
 */
export const isToolInWishlist = async (toolId) => {
  try {
    if (!auth.currentUser) {
      return false;
    }
    
    const userId = auth.currentUser.uid;
    
    // Reference to the user's wishlist document
    const wishlistDocRef = doc(db, 'wishlists', userId);
    
    // Get the wishlist document
    const wishlistDocSnap = await getDoc(wishlistDocRef);
    
    if (!wishlistDocSnap.exists()) {
      return false;
    }
    
    // Get the wishlist data
    const wishlistData = wishlistDocSnap.data();
    
    return wishlistData.tools.some(tool => tool.toolId === toolId);
    
  } catch (error) {
    console.error('Error checking wishlist:', error);
    return false;
  }
};

/**
 * Toggle a tool's presence in the wishlist (add if not present, remove if present)
 * @param {string} toolId - The ID of the tool to toggle
 * @returns {Promise<Object>} Result object with success status and current state
 */
export const toggleWishlistItem = async (toolId) => {
  try {
    if (!auth.currentUser) {
      throw new Error('You must be logged in to manage your wishlist');
    }
    
    const inWishlist = await isToolInWishlist(toolId);
    
    if (inWishlist) {
      await removeFromWishlist(toolId);
      return { success: true, inWishlist: false };
    } else {
      await addToWishlist(toolId);
      return { success: true, inWishlist: true };
    }
  } catch (error) {
    console.error('Error toggling wishlist item:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to update wishlist' 
    };
  }
};

/**
 * Get the current user's wishlist with full tool details
 * @returns {Promise<Array>} Array of wishlist items with tool details
 */
export const getWishlistWithDetails = async () => {
  try {
    if (!auth.currentUser) {
      throw new Error('You must be logged in to view your wishlist');
    }
    
    const userId = auth.currentUser.uid;
    
    // Reference to the user's wishlist document
    const wishlistDocRef = doc(db, 'wishlists', userId);
    
    // Get the wishlist document
    const wishlistDocSnap = await getDoc(wishlistDocRef);
    
    if (!wishlistDocSnap.exists()) {
      return [];
    }
    
    // Get the wishlist data
    const wishlistData = wishlistDocSnap.data();
    
    // Fetch the full tool details for each toolId in the wishlist
    const toolPromises = wishlistData.tools.map(async (toolItem) => {
      try {
        const toolData = await getToolById(toolItem.toolId);
        if (toolData) {
          return {
            ...toolData,
            addedAt: toolItem.addedAt
          };
        }
        return null;
      } catch (e) {
        console.error(`Error fetching tool ${toolItem.toolId}:`, e);
        return null;
      }
    });
    
    const tools = await Promise.all(toolPromises);
    
    // Filter out null values (tools that couldn't be fetched) and sort by addedAt
    return tools
      .filter(tool => tool !== null)
      .sort((a, b) => {
        // Sort by addedAt in descending order (newest first)
        const dateA = a.addedAt ? new Date(a.addedAt) : new Date(0);
        const dateB = b.addedAt ? new Date(b.addedAt) : new Date(0);
        return dateB - dateA;
      });
      
  } catch (error) {
    console.error('Error getting wishlist:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time updates of the user's wishlist
 * @param {Function} callback - Function to call with updated wishlist
 * @returns {Function} Unsubscribe function
 */
export const subscribeToWishlist = (callback) => {
  if (!auth.currentUser) {
    callback([]);
    return () => {};
  }
  
  const userId = auth.currentUser.uid;
  
  // Reference to the user's wishlist document
  const wishlistDocRef = doc(db, 'wishlists', userId);
  
  // Subscribe to changes
  const unsubscribe = onSnapshot(wishlistDocRef, async (docSnapshot) => {
    if (!docSnapshot.exists()) {
      callback([]);
      return;
    }
    
    try {
      const wishlistData = docSnapshot.data();
      
      // Fetch the full tool details for each toolId in the wishlist
      const toolPromises = wishlistData.tools.map(async (toolItem) => {
        try {
          const toolData = await getToolById(toolItem.toolId);
          if (toolData) {
            return {
              ...toolData,
              addedAt: toolItem.addedAt
            };
          }
          return null;
        } catch (e) {
          console.error(`Error fetching tool ${toolItem.toolId}:`, e);
          return null;
        }
      });
      
      const tools = await Promise.all(toolPromises);
      
      // Filter out null values and sort by addedAt
      const sortedTools = tools
        .filter(tool => tool !== null)
        .sort((a, b) => {
          const dateA = a.addedAt ? new Date(a.addedAt) : new Date(0);
          const dateB = b.addedAt ? new Date(b.addedAt) : new Date(0);
          return dateB - dateA;
        });
      
      callback(sortedTools);
    } catch (error) {
      console.error('Error processing wishlist update:', error);
      callback([]);
    }
  }, (error) => {
    console.error('Wishlist subscription error:', error);
    callback([]);
  });
  
  return unsubscribe;
};

export default {
  addToWishlist,
  removeFromWishlist,
  isToolInWishlist,
  toggleWishlistItem,
  getWishlistWithDetails,
  subscribeToWishlist
};