/**
 * Firebase Tool Model
 * Handles all Firestore operations for tool listings
 */
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '../config';
import * as emailService from '../../utils/emailService';

// Collection references
const toolsCollection = collection(db, 'tools');

/**
 * Create a new tool listing
 * @param {Object} toolData - The tool data to create
 * @param {string} userId - The ID of the user creating the tool
 * @returns {Promise<Object>} - The created tool document
 */
export const createTool = async (toolData, userId) => {
  try {
    const toolWithMeta = {
      ...toolData,
      user_id: userId,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      status: 'active',
      verified: false,
      featured: false,
      images: [],
    };

    const docRef = await addDoc(toolsCollection, toolWithMeta);
    
    const newTool = {
      id: docRef.id,
      ...toolWithMeta
    };
    
    // Send email notification to the seller
    try {
      // Get user details to get the email
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        
        if (userData.email) {
          console.log('Sending listing published email to', userData.email);
          
          // Send the email notification
          await emailService.sendListingPublishedEmail(userData.email, {
            id: docRef.id,
            title: toolData.name,
            price: toolData.current_price,
            image: null // Images will be added separately
          });
        }
      }
    } catch (emailError) {
      // Don't fail the tool creation if email sending fails
      console.error('Error sending listing published email:', emailError);
    }
    
    return newTool;
  } catch (error) {
    console.error('Error creating tool:', error);
    throw error;
  }
};

/**
 * Update an existing tool listing
 * @param {string} toolId - The ID of the tool to update
 * @param {Object} toolData - The updated tool data
 * @returns {Promise<void>}
 */
export const updateTool = async (toolId, toolData) => {
  try {
    const toolRef = doc(db, 'tools', toolId);
    
    await updateDoc(toolRef, {
      ...toolData,
      updated_at: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating tool:', error);
    throw error;
  }
};

/**
 * Delete a tool listing
 * @param {string} toolId - The ID of the tool to delete
 * @returns {Promise<void>}
 */
export const deleteTool = async (toolId) => {
  try {
    // Get the tool to check for images
    const toolRef = doc(db, 'tools', toolId);
    const toolSnap = await getDoc(toolRef);
    
    if (!toolSnap.exists()) {
      throw new Error('Tool not found');
    }
    
    const toolData = toolSnap.data();
    
    // Delete associated images from storage
    if (toolData.images && toolData.images.length > 0) {
      for (const image of toolData.images) {
        try {
          const imageRef = ref(storage, image.path);
          await deleteObject(imageRef);
        } catch (imageError) {
          console.error('Error deleting image:', imageError);
          // Continue deletion even if image deletion fails
        }
      }
    }
    
    // Delete the tool document
    await deleteDoc(toolRef);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting tool:', error);
    throw error;
  }
};

/**
 * Get a tool by ID
 * @param {string} toolId - The ID of the tool to retrieve
 * @returns {Promise<Object>} - The tool data
 */
export const getToolById = async (toolId) => {
  try {
    const toolRef = doc(db, 'tools', toolId);
    const toolSnap = await getDoc(toolRef);
    
    if (!toolSnap.exists()) {
      throw new Error('Tool not found');
    }
    
    return {
      id: toolSnap.id,
      ...toolSnap.data()
    };
  } catch (error) {
    console.error('Error getting tool:', error);
    throw error;
  }
};

/**
 * Get tools by user ID
 * @param {string} userId - The ID of the user
 * @returns {Promise<Array>} - Array of tool objects
 */
export const getToolsByUserId = async (userId) => {
  try {
    const q = query(
      toolsCollection, 
      where('user_id', '==', userId),
      orderBy('created_at', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const tools = [];
    
    querySnapshot.forEach((doc) => {
      tools.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return tools;
  } catch (error) {
    console.error('Error getting user tools:', error);
    throw error;
  }
};

/**
 * Get all active tools (for marketplace)
 * @param {Object} options - Query options
 * @param {number} options.limitCount - Number of tools to retrieve (defaults to 20 for pagination)
 * @param {string} options.category - Filter by category
 * @param {string} options.lastVisible - Last document for pagination
 * @returns {Promise<Object>} - Object with tools array and pagination info
 */
export const getActiveTools = async (options = {}) => {
  try {
    // Default limit to 20 items for better performance
    const itemLimit = options.limitCount || 20;
    let queryConstraints = [where('status', '==', 'active')];
    
    // Add category filter if provided
    if (options.category) {
      queryConstraints.push(where('category', '==', options.category));
    }
    
    // Add sorting
    queryConstraints.push(orderBy('created_at', 'desc'));
    
    // Create the base query
    let q = query(toolsCollection, ...queryConstraints);
    
    // Add pagination if a last document is provided
    if (options.lastVisible) {
      q = query(q, startAfter(options.lastVisible), limit(itemLimit));
    } else {
      q = query(q, limit(itemLimit));
    }
    
    const querySnapshot = await getDocs(q);
    const tools = [];
    
    // Get the last visible document for pagination
    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
    
    querySnapshot.forEach((doc) => {
      tools.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Return both the tools and pagination info
    return {
      tools,
      lastVisible,
      hasMore: querySnapshot.docs.length === itemLimit
    };
  } catch (error) {
    console.error('Error getting active tools:', error);
    throw error;
  }
};

/**
 * Get featured tools for homepage
 * @param {number} count - Number of featured tools to retrieve
 * @returns {Promise<Array>} - Array of tool objects
 */
export const getFeaturedTools = async (count = 4) => {
  try {
    const q = query(
      toolsCollection,
      where('featured', '==', true),
      where('status', '==', 'active'),
      limit(count)
    );
    
    const querySnapshot = await getDocs(q);
    const tools = [];
    
    querySnapshot.forEach((doc) => {
      tools.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return tools;
  } catch (error) {
    console.error('Error getting featured tools:', error);
    throw error;
  }
};

/**
 * Upload a tool image
 * @param {File} file - The image file to upload
 * @param {string} toolId - The ID of the tool
 * @returns {Promise<Object>} - The uploaded image data
 */
export const uploadToolImage = async (file, toolId) => {
  try {
    const timestamp = Date.now();
    const fileName = `${toolId}_${timestamp}_${file.name}`;
    const storagePath = `tools/${toolId}/${fileName}`;
    const storageRef = ref(storage, storagePath);
    
    // Upload the file
    await uploadBytes(storageRef, file);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    // Get the current tool data
    const toolRef = doc(db, 'tools', toolId);
    const toolSnap = await getDoc(toolRef);
    
    if (!toolSnap.exists()) {
      throw new Error('Tool not found');
    }
    
    const toolData = toolSnap.data();
    const images = toolData.images || [];
    
    // Add the new image
    const imageData = {
      url: downloadURL,
      path: storagePath,
      filename: fileName,
      added_at: new Date().toISOString()
    };
    
    // Update the tool with the new image
    await updateDoc(toolRef, {
      images: [...images, imageData],
      updated_at: serverTimestamp()
    });
    
    // If this is the first image and we now have it, send an email with the image
    if (images.length === 0) {
      try {
        // Get the user who owns this tool
        const userId = toolData.user_id;
        if (userId) {
          const userRef = doc(db, 'users', userId);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            
            if (userData.email) {
              console.log('Sending updated listing published email with image to', userData.email);
              
              // Send the email notification with the image
              await emailService.sendListingPublishedEmail(userData.email, {
                id: toolId,
                title: toolData.name,
                price: toolData.current_price,
                image: downloadURL
              });
            }
          }
        }
      } catch (emailError) {
        // Don't fail if email sending fails
        console.error('Error sending updated listing published email:', emailError);
      }
    }
    
    return imageData;
  } catch (error) {
    console.error('Error uploading tool image:', error);
    throw error;
  }
};

/**
 * Delete a tool image
 * @param {string} toolId - The ID of the tool
 * @param {string} imagePath - The storage path of the image to delete
 * @returns {Promise<void>}
 */
export const deleteToolImage = async (toolId, imagePath) => {
  try {
    // Delete from storage
    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);
    
    // Get the current tool data
    const toolRef = doc(db, 'tools', toolId);
    const toolSnap = await getDoc(toolRef);
    
    if (!toolSnap.exists()) {
      throw new Error('Tool not found');
    }
    
    const toolData = toolSnap.data();
    const images = toolData.images || [];
    
    // Filter out the deleted image
    const updatedImages = images.filter(img => img.path !== imagePath);
    
    // Update the tool with the filtered images
    await updateDoc(toolRef, {
      images: updatedImages,
      updated_at: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting tool image:', error);
    throw error;
  }
};

/**
 * Search tools by query
 * @param {string} searchQuery - The search query
 * @returns {Promise<Array>} - Array of matching tool objects
 */
export const searchTools = async (searchQuery) => {
  try {
    // Note: Firestore doesn't support full-text search natively
    // This is a simple implementation that searches the 'name' field
    // For a production app, consider using Algolia or Firebase Functions
    const q = query(
      toolsCollection,
      where('status', '==', 'active'),
      orderBy('name'),
      // This needs proper indexing to work correctly
      where('name', '>=', searchQuery),
      where('name', '<=', searchQuery + '\uf8ff')
    );
    
    const querySnapshot = await getDocs(q);
    const tools = [];
    
    querySnapshot.forEach((doc) => {
      tools.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return tools;
  } catch (error) {
    console.error('Error searching tools:', error);
    throw error;
  }
};

/**
 * Tool categories
 */
export const toolCategories = [
  'Power Tools',
  'Hand Tools',
  'Woodworking',
  'Electrical',
  'Plumbing',
  'Gardening',
  'Automotive',
  'Construction',
  'Painting',
  'Measuring',
  'Other'
];

/**
 * Tool condition options
 */
export const toolConditions = [
  'New',
  'Like New',
  'Good',
  'Fair',
  'Poor'
];

export default {
  createTool,
  updateTool,
  deleteTool,
  getToolById,
  getToolsByUserId,
  getActiveTools,
  getFeaturedTools,
  uploadToolImage,
  deleteToolImage,
  searchTools,
  toolCategories,
  toolConditions
};