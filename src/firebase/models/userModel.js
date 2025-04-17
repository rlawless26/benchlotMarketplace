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
  serverTimestamp,
  deleteField
} from 'firebase/firestore';
import { 
  updateProfile,
  updateEmail as firebaseUpdateEmail,
  updatePassword as firebaseUpdatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential 
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, auth, storage } from '../config';

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
    
    // Update Firebase Auth profile if we have display name or photo URL
    if (userData.displayName || userData.photoURL) {
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.uid === userId) {
        const profileUpdates = {};
        if (userData.displayName) profileUpdates.displayName = userData.displayName;
        if (userData.photoURL) profileUpdates.photoURL = userData.photoURL;
        
        await updateProfile(currentUser, profileUpdates);
      }
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

/**
 * Update user address
 * @param {string} userId - The user ID
 * @param {Object} addressData - Address data to update
 * @returns {Promise<Object>} Updated address data
 */
export const updateUserAddress = async (userId, addressData) => {
  try {
    const userRef = doc(usersCollection, userId);
    
    await updateDoc(userRef, {
      address: addressData,
      updated_at: serverTimestamp()
    });
    
    return addressData;
  } catch (error) {
    console.error('Error updating user address:', error);
    throw error;
  }
};

/**
 * Update user notification preferences
 * @param {string} userId - The user ID
 * @param {Object} preferences - Notification preferences to update
 * @returns {Promise<Object>} Updated notification preferences
 */
export const updateNotificationPreferences = async (userId, preferences) => {
  try {
    const userRef = doc(usersCollection, userId);
    
    await updateDoc(userRef, {
      'preferences.notifications': preferences,
      updated_at: serverTimestamp()
    });
    
    return preferences;
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
};

/**
 * Update user privacy settings
 * @param {string} userId - The user ID
 * @param {Object} privacySettings - Privacy settings to update
 * @returns {Promise<Object>} Updated privacy settings
 */
export const updatePrivacySettings = async (userId, privacySettings) => {
  try {
    const userRef = doc(usersCollection, userId);
    
    await updateDoc(userRef, {
      'preferences.privacy': privacySettings,
      updated_at: serverTimestamp()
    });
    
    return privacySettings;
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    throw error;
  }
};

/**
 * Update user shipping preferences
 * @param {string} userId - The user ID
 * @param {Object} shippingPrefs - Shipping preferences to update
 * @returns {Promise<Object>} Updated shipping preferences
 */
export const updateShippingPreferences = async (userId, shippingPrefs) => {
  try {
    const userRef = doc(usersCollection, userId);
    
    await updateDoc(userRef, {
      'preferences.shipping': shippingPrefs,
      updated_at: serverTimestamp()
    });
    
    return shippingPrefs;
  } catch (error) {
    console.error('Error updating shipping preferences:', error);
    throw error;
  }
};

/**
 * Upload profile image
 * @param {string} userId - The user ID
 * @param {File} imageFile - The image file to upload
 * @returns {Promise<string>} The download URL of the uploaded image
 */
export const uploadProfileImage = async (userId, imageFile) => {
  try {
    // Create a reference to 'profileImages/userId'
    const storageRef = ref(storage, `profileImages/${userId}`);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, imageFile);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    // Update user profile with the new photo URL
    const userRef = doc(usersCollection, userId);
    await updateDoc(userRef, {
      photoURL: downloadURL,
      updated_at: serverTimestamp()
    });
    
    // Update auth profile if this is the current user
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === userId) {
      await updateProfile(currentUser, {
        photoURL: downloadURL
      });
    }
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading profile image:', error);
    throw error;
  }
};

/**
 * Delete profile image
 * @param {string} userId - The user ID
 * @returns {Promise<void>}
 */
export const deleteProfileImage = async (userId) => {
  try {
    // Create a reference to 'profileImages/userId'
    const storageRef = ref(storage, `profileImages/${userId}`);
    
    // Delete the file
    await deleteObject(storageRef);
    
    // Update user profile to remove the photo URL
    const userRef = doc(usersCollection, userId);
    await updateDoc(userRef, {
      photoURL: deleteField(),
      updated_at: serverTimestamp()
    });
    
    // Update auth profile if this is the current user
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === userId) {
      await updateProfile(currentUser, {
        photoURL: null
      });
    }
  } catch (error) {
    console.error('Error deleting profile image:', error);
    throw error;
  }
};

/**
 * Update user password
 * @param {string} currentPassword - The current password
 * @param {string} newPassword - The new password
 * @returns {Promise<void>}
 */
export const updatePassword = async (currentPassword, newPassword) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Reauthenticate the user first
    const credential = EmailAuthProvider.credential(
      currentUser.email,
      currentPassword
    );
    
    await reauthenticateWithCredential(currentUser, credential);
    
    // Update the password
    await firebaseUpdatePassword(currentUser, newPassword);
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
};

/**
 * Update seller settings
 * @param {string} userId - The user ID
 * @param {Object} sellerSettings - Seller settings to update
 * @returns {Promise<Object>} Updated seller settings
 */
export const updateSellerSettings = async (userId, sellerSettings) => {
  try {
    const userRef = doc(usersCollection, userId);
    
    await updateDoc(userRef, {
      'seller': sellerSettings,
      'isSeller': true,
      updated_at: serverTimestamp()
    });
    
    return sellerSettings;
  } catch (error) {
    console.error('Error updating seller settings:', error);
    throw error;
  }
};