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
      status: 'pending_images', // New detailed status system
      statusDetails: {
        missingImages: true,
        lastUpdated: new Date().toISOString(),
        note: 'Listing created without images'
      },
      verified: false,
      featured: false,
      images: [],
      // Make sure all required fields exist to pass isValidTool() security rule
      name: toolData.name || '',
      description: toolData.description || '',
      price: parseFloat(toolData.current_price) || 0
    };

    const docRef = await addDoc(toolsCollection, toolWithMeta);

    const newTool = {
      id: docRef.id,
      ...toolWithMeta
    };

    // Note: the listing-published email is now sent by the onToolActivated
    // Cloud Function trigger when status flips from pending_images → active.
    // No direct email call here.

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
 * @param {Object} options - Query options
 * @param {string} options.status - Filter by status (active, pending_images, draft, paused, sold, deleted)
 * @returns {Promise<Array>} - Array of tool objects
 */
export const getToolsByUserId = async (userId, options = {}) => {
  try {
    // Start with base constraints
    let constraints = [
      where('user_id', '==', userId)
    ];
    
    // Add status filter if provided
    if (options.status) {
      constraints.push(where('status', '==', options.status));
    }
    
    // Always sort by creation date, newest first
    constraints.push(orderBy('created_at', 'desc'));
    
    const q = query(toolsCollection, ...constraints);
    
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
    
    // Build query constraints - Only show tools with 'active' status
    // This excludes pending_images, draft, deleted, sold, or paused
    let queryConstraints = [where('status', '==', 'active')];
    
    // Add category filter if provided
    if (options.category) {
      queryConstraints.push(where('category', '==', options.category));
    }
    
    // Add sorting by created_at timestamp
    queryConstraints.push(orderBy('created_at', 'desc'));
    
    // Create the base query
    let q = query(toolsCollection, ...queryConstraints);
    
    // Add pagination if a last document is provided
    if (options.lastVisible) {
      q = query(q, startAfter(options.lastVisible), limit(itemLimit));
    } else {
      q = query(q, limit(itemLimit));
    }
    
    console.log('Fetching active tools for marketplace');
    const querySnapshot = await getDocs(q);
    
    console.log(`Found ${querySnapshot.size} active tools`);
    const tools = [];
    
    // Get the last visible document for pagination
    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      tools.push({
        id: doc.id,
        ...data
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
    
    // Prepare update data
    const updateData = {
      images: [...images, imageData],
      updated_at: serverTimestamp()
    };
    
    // If this is the first image, update the status to active
    if (images.length === 0) {
      updateData.status = 'active';
      updateData.statusDetails = {
        missingImages: false,
        lastUpdated: new Date().toISOString(),
        note: 'Listing activated with images'
      };
    }
    
    // Update the tool with the new image and status
    await updateDoc(toolRef, updateData);
    
    // The status flip from pending_images → active above will fire the
    // onToolActivated Cloud Function trigger, which sends Template 4
    // (Listing Published) with the correct Stripe-incomplete conditional.

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
 * Tool categories - focused on hand tool woodworking
 */
export const toolCategories = [
  // Hand Tools
  'Hand Planes',
  'Chisels',
  'Hand Saws',
  'Marking & Measuring',
  'Sharpening',
  'Workholding',
  'Carving & Turning',
  // Power Tools & Shop Machines
  'Power Tools',
  'Workshop Equipment',
  'Other'
];

/**
 * Category groupings for UI display (CategoriesPage, etc.)
 * This is a UI concern only — not stored in the data model.
 */
export const categoryGroups = {
  'Hand Tools': ['Hand Planes', 'Chisels', 'Hand Saws', 'Marking & Measuring', 'Carving & Turning'],
  'Shop Machines & Power Tools': ['Power Tools'],
  'Shop Essentials': ['Sharpening', 'Workholding', 'Workshop Equipment'],
};

/**
 * Subcategories by category
 */
export const toolSubcategories = {
  'Hand Planes': [
    'Bench Planes', 'Block Planes', 'Shoulder Planes', 'Router Planes',
    'Plow & Combination Planes', 'Scrub Planes', 'Joinery Planes', 'Specialty Planes'
  ],
  'Chisels': [
    'Bench Chisels', 'Mortise Chisels', 'Paring Chisels', 'Japanese Chisels',
    'Carving Chisels', 'Chisel Sets'
  ],
  'Hand Saws': [
    'Dovetail Saws', 'Tenon Saws', 'Panel Saws', 'Frame & Bow Saws',
    'Japanese Saws', 'Coping & Fret Saws'
  ],
  'Marking & Measuring': [
    'Marking Gauges', 'Squares', 'Bevels', 'Marking Knives',
    'Dividers & Calipers', 'Rulers & Straightedges'
  ],
  'Sharpening': [
    'Sharpening Stones', 'Honing Guides', 'Strops', 'Lapping Plates',
    'Diamond Plates', 'Sharpening Systems'
  ],
  'Workholding': [
    'Vises', 'Holdfasts', 'Bench Dogs', 'Clamps',
    'Workbenches', 'Bench Hooks & Shooting Boards'
  ],
  'Carving & Turning': [
    'Carving Gouges', 'Drawknives', 'Spokeshaves', 'Turning Tools',
    'Scorps & Inshaves', 'Adzes'
  ],
  'Power Tools': [
    'Table Saws', 'Bandsaws', 'Track Saws', 'Miter Saws', 'Scroll Saws',
    'Routers & Router Tables', 'Jointers', 'Planers & Thicknessers',
    'Drill Presses & Mortisers', 'Lathes & Lathe Accessories',
    'Sanders (Power)', 'Jigsaws', 'Shapers & Spindle Sanders'
  ],
  'Workshop Equipment': [
    'Dust Collection', 'Sharpening Systems', 'Workbenches',
    'Tool Storage', 'Safety Equipment', 'Shop Accessories', 'Finishing Supplies'
  ],
  'Other': []
};

/**
 * Popular brands in hand tool woodworking
 */
export const toolBrands = [
  // Hand tool makers
  'Lie-Nielsen',
  'Veritas',
  'Lee Valley',
  'Narex',
  'Stanley',
  'Record',
  'Blue Spruce Toolworks',
  'Knew Concepts',
  'Woodpeckers',
  'Bridge City Tool Works',
  'Hock Tools',
  'Bad Axe Tool Works',
  'Gramercy Tools',
  'Rob Cosman',
  'Shapton',
  'DMT',
  'Norton',
  'King',
  'Matsumura',
  'Tsunesaburo',
  // Power tool & shop machine makers
  'Festool',
  'SawStop',
  'Laguna',
  'Powermatic',
  'Grizzly',
  'Jet',
  'Rikon',
  'Harvey',
  'Tormek',
  'Nova/Teknatool',
  'Bosch',
  'DeWalt',
  'Makita',
  'Ridgid',
  'Delta',
  'General International',
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
  'Poor',
  'Not Functioning'
];

/**
 * Tool condition definitions
 */
export const conditionDefinitions = {
  'New': 'Brand new, unused item with original packaging and tags.',
  'Like New': 'Used once or twice, flawless condition with all original packaging.',
  'Good': 'Light signs of use, fully functional, may have minor cosmetic marks.',
  'Fair': 'Shows signs of regular use, still works properly with some visible wear.',
  'Poor': 'Heavily used with significant wear, requires maintenance but still functional.',
  'Not Functioning': 'Item does not work properly or requires major repair, sold as-is.'
};

/**
 * Tool status options
 */
export const toolStatus = {
  // Draft: Initial state, listing creation started but not complete
  DRAFT: 'draft',
  
  // Pending Images: Basic info complete but no images yet
  PENDING_IMAGES: 'pending_images',
  
  // Pending Review: Complete with images but awaiting admin review (if needed)
  PENDING_REVIEW: 'pending_review',
  
  // Active: Fully published and visible to buyers
  ACTIVE: 'active',
  
  // Paused: Temporarily hidden by seller
  PAUSED: 'paused',
  
  // Sold: Item has been sold
  SOLD: 'sold',
  
  // Deleted: Soft-deleted but retained in database
  DELETED: 'deleted',

  // Chest: In user's Tool Chest, not listed for sale
  CHEST: 'chest'
};

/**
 * Add a tool to the user's Tool Chest (from ToolScan).
 * Does NOT require seller status — any authenticated user can save to chest.
 * Does NOT send listing published email.
 * @param {Object} toolData - The tool data from ToolScan
 * @param {string} userId - The ID of the authenticated user
 * @returns {Promise<Object>} - The created tool document with its ID
 */
export const addToToolChest = async (toolData, userId) => {
  try {
    const chestTool = {
      user_id: userId,
      status: 'chest',
      source: toolData.source || 'toolscan',
      // Tool identification fields
      name: toolData.name || '',
      description: toolData.description || '',
      category: toolData.category || '',
      subcategory: toolData.subcategory || '',
      brand: toolData.brand || '',
      model: toolData.model || '',
      condition: toolData.condition || '',
      current_price: parseFloat(toolData.current_price) || 0,
      price: parseFloat(toolData.current_price) || 0,
      price_high: toolData.price_high || null,
      era: toolData.era || '',
      confidence: toolData.confidence || '',
      collectibility: toolData.collectibility || '',
      scanId: toolData.scanId || null,
      // Preserve the raw AI output for future reference
      toolscanData: toolData.toolscanData || {},
      // Timestamps
      chestAddedAt: serverTimestamp(),
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      // Images start empty — uploaded separately
      images: [],
    };

    const docRef = await addDoc(toolsCollection, chestTool);

    return {
      id: docRef.id,
      ...chestTool,
    };
  } catch (error) {
    console.error('Error adding tool to chest:', error);
    throw error;
  }
};

/**
 * Transition a chest tool to draft listing status.
 * Requires the user to be the owner.
 * @param {string} toolId - The ID of the tool to transition
 * @param {string} userId - The ID of the user requesting the transition
 * @returns {Promise<Object>} - The updated tool
 */
export const listFromToolChest = async (toolId, userId) => {
  try {
    const toolRef = doc(db, 'tools', toolId);
    const toolSnap = await getDoc(toolRef);

    if (!toolSnap.exists()) {
      throw new Error('Tool not found');
    }

    const toolData = toolSnap.data();

    if (toolData.user_id !== userId) {
      throw new Error('You do not own this tool');
    }

    if (toolData.status !== 'chest') {
      throw new Error('Tool is not in the Tool Chest');
    }

    await updateDoc(toolRef, {
      status: 'draft',
      updated_at: serverTimestamp(),
    });

    return {
      id: toolId,
      ...toolData,
      status: 'draft',
    };
  } catch (error) {
    console.error('Error listing tool from chest:', error);
    throw error;
  }
};

/**
 * Upload an image to a tool without changing its status.
 * Used for Tool Chest items where we don't want the status to flip to 'active'.
 * @param {File} file - The image file to upload
 * @param {string} toolId - The ID of the tool
 * @returns {Promise<Object>} - The uploaded image data
 */
export const uploadToolChestImage = async (file, toolId) => {
  try {
    const timestamp = Date.now();
    const fileName = `${toolId}_${timestamp}_${file.name}`;
    const storagePath = `tools/${toolId}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    const toolRef = doc(db, 'tools', toolId);
    const toolSnap = await getDoc(toolRef);

    if (!toolSnap.exists()) {
      throw new Error('Tool not found');
    }

    const toolData = toolSnap.data();
    const images = toolData.images || [];

    const imageData = {
      url: downloadURL,
      path: storagePath,
      filename: fileName,
      added_at: new Date().toISOString(),
    };

    // Update images array only — do NOT change status or send emails
    await updateDoc(toolRef, {
      images: [...images, imageData],
      updated_at: serverTimestamp(),
    });

    return imageData;
  } catch (error) {
    console.error('Error uploading tool chest image:', error);
    throw error;
  }
};

const toolModel = {
  createTool,
  updateTool,
  deleteTool,
  getToolById,
  getToolsByUserId,
  getActiveTools,
  getFeaturedTools,
  uploadToolImage,
  uploadToolChestImage,
  deleteToolImage,
  searchTools,
  addToToolChest,
  listFromToolChest,
  toolCategories,
  toolSubcategories,
  categoryGroups,
  toolBrands,
  toolConditions,
  toolStatus
};

export default toolModel;