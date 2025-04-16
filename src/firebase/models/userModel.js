/**
 * User Model
 * 
 * Handles all Firestore operations for users
 */
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config';

// Collection references
const usersCollection = collection(db, 'users');

/**
 * Get user by ID
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} User data
 */
export const getUserById = async (userId) => {
  try {
    const userRef = doc(usersCollection, userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('User not found');
    }
    
    return {
      id: userSnap.id,
      ...userSnap.data()
    };
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

/**
 * Create or update user profile
 * @param {string} userId - The user ID
 * @param {Object} userData - User data to update
 * @returns {Promise<Object>} Updated user data
 */
export const updateUserProfile = async (userId, userData) => {
  try {
    const userRef = doc(usersCollection, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      // Update existing user
      await updateDoc(userRef, {
        ...userData,
        updated_at: serverTimestamp()
      });
    } else {
      // Create new user
      await setDoc(userRef, {
        ...userData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
    }
    
    return {
      id: userId,
      ...userData
    };
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User data or null if not found
 */
export const getUserByEmail = async (email) => {
  try {
    const q = query(usersCollection, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const userDoc = querySnapshot.docs[0];
    return {
      id: userDoc.id,
      ...userDoc.data()
    };
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
};

/**
 * Update user settings
 * @param {string} userId - The user ID
 * @param {Object} settings - Settings to update
 * @returns {Promise<Object>} Updated settings
 */
export const updateUserSettings = async (userId, settings) => {
  try {
    const userRef = doc(usersCollection, userId);
    
    await updateDoc(userRef, {
      settings: settings,
      updated_at: serverTimestamp()
    });
    
    return settings;
  } catch (error) {
    console.error('Error updating user settings:', error);
    throw error;
  }
};